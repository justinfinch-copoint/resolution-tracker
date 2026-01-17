import { tool } from 'ai';
import { z } from 'zod';
import { createCheckIn } from '@/src/features/check-ins';
import { updateGoal, updateProgressSentiment } from '@/src/features/goals/repository';
import { completeMilestone } from '@/src/features/milestones/repository';
import { mergeUserSummary } from './summary-repository';
import type { RecordCheckInResult, UpdateSummaryResult, MarkGoalCompleteResult } from './types';
import { HABIT_COMPLETION_STATUSES } from '@/src/features/check-ins/types';
import { PROGRESS_SENTIMENTS } from '@/src/features/goals/types';

// New result types for enhanced tools
export type UpdateGoalSentimentResult = {
  success: boolean;
  goalId: string;
  sentiment: string;
  message: string;
};

export type CompleteMilestoneResult = {
  success: boolean;
  milestoneId: string;
  message: string;
};

/**
 * Factory function to create coach tools with userId bound
 * This allows tools to operate on behalf of the authenticated user
 */
export function createCoachTools(userId: string) {
  return {
    recordCheckIn: tool({
      description: 'Record a check-in when user reports progress on a goal. Use habitCompletionStatus for habit goals (completed/skipped/missed), valueRecorded for target goals (numeric progress), or milestoneId for project goals (completing a milestone).',
      inputSchema: z.object({
        goalId: z.string().uuid('Invalid goal ID format').describe('The goal ID - required for all check-ins'),
        content: z.string().describe('Summary of what the user shared'),
        milestoneId: z.string().uuid('Invalid milestone ID format').optional().describe('The milestone ID if completing a project milestone'),
        valueRecorded: z.number().optional().describe('Numeric value for target-type goals (e.g., dollars saved, miles run)'),
        habitCompletionStatus: z.enum(HABIT_COMPLETION_STATUSES).optional().describe('For habit goals: completed (did it), skipped (intentionally skip), or missed (forgot/failed)'),
      }),
      execute: async ({ goalId, content, milestoneId, valueRecorded, habitCompletionStatus }): Promise<RecordCheckInResult> => {
        try {
          const checkIn = await createCheckIn(userId, {
            goalId,
            content,
            milestoneId: milestoneId ?? null,
            valueRecorded: valueRecorded ?? null,
            habitCompletionStatus: habitCompletionStatus ?? null,
          });

          return {
            success: true,
            checkInId: checkIn.id,
            message: `Check-in recorded for goal`,
          };
        } catch (error) {
          console.error('Failed to record check-in:', error);
          return {
            success: false,
            checkInId: '',
            message: 'Failed to record check-in',
          };
        }
      },
    }),

    updateGoalSentiment: tool({
      description: 'Update the progress sentiment for a goal based on conversation analysis. Use this when you assess how the user is doing relative to their goal.',
      inputSchema: z.object({
        goalId: z.string().uuid('Invalid goal ID format').describe('The goal ID to update sentiment for'),
        sentiment: z.enum(PROGRESS_SENTIMENTS).describe('The assessed progress: behind (struggling), on_track (doing well), or ahead (exceeding expectations)'),
      }),
      execute: async ({ goalId, sentiment }): Promise<UpdateGoalSentimentResult> => {
        try {
          const updatedGoal = await updateProgressSentiment(goalId, userId, sentiment);

          if (!updatedGoal) {
            return {
              success: false,
              goalId,
              sentiment,
              message: 'Goal not found or access denied',
            };
          }

          return {
            success: true,
            goalId,
            sentiment,
            message: `Progress sentiment updated to "${sentiment}"`,
          };
        } catch (error) {
          console.error('Failed to update goal sentiment:', error);
          return {
            success: false,
            goalId,
            sentiment,
            message: 'Failed to update goal sentiment',
          };
        }
      },
    }),

    completeMilestone: tool({
      description: 'Mark a milestone as complete when the user confirms they finished a project milestone.',
      inputSchema: z.object({
        milestoneId: z.string().uuid('Invalid milestone ID format').describe('The milestone ID to mark as complete'),
      }),
      execute: async ({ milestoneId }): Promise<CompleteMilestoneResult> => {
        try {
          const milestone = await completeMilestone(milestoneId, userId);

          if (!milestone) {
            return {
              success: false,
              milestoneId,
              message: 'Milestone not found or access denied',
            };
          }

          return {
            success: true,
            milestoneId,
            message: `Milestone "${milestone.title}" marked as complete!`,
          };
        } catch (error) {
          console.error('Failed to complete milestone:', error);
          return {
            success: false,
            milestoneId,
            message: 'Failed to complete milestone',
          };
        }
      },
    }),

    updateUserSummary: tool({
      description: 'Update user summary with new patterns, wins, or struggles observed from the conversation',
      inputSchema: z.object({
        patterns: z.array(z.string()).optional().describe('Recurring behaviors or habits noticed'),
        wins: z.array(z.string()).optional().describe('Accomplishments or successes to remember'),
        struggles: z.array(z.string()).optional().describe('Challenges or obstacles faced'),
      }),
      execute: async ({ patterns, wins, struggles }): Promise<UpdateSummaryResult> => {
        try {
          // Only merge if there's something to update
          if (!patterns?.length && !wins?.length && !struggles?.length) {
            return {
              success: true,
              message: 'No updates to save',
            };
          }

          await mergeUserSummary(userId, {
            patterns,
            wins,
            struggles,
          });

          return {
            success: true,
            message: 'User summary updated',
          };
        } catch (error) {
          console.error('Failed to update user summary:', error);
          return {
            success: false,
            message: 'Failed to update user summary',
          };
        }
      },
    }),

    markGoalComplete: tool({
      description: 'Mark a goal as completed when user explicitly confirms they achieved it',
      inputSchema: z.object({
        goalId: z.string().uuid('Invalid goal ID format').describe('The ID of the goal to mark as completed'),
        celebrationNote: z.string().optional().describe('A note celebrating the achievement'),
      }),
      execute: async ({ goalId, celebrationNote }): Promise<MarkGoalCompleteResult> => {
        try {
          const updatedGoal = await updateGoal(goalId, userId, { status: 'completed' });

          if (!updatedGoal) {
            return {
              success: false,
              goalId,
              message: 'Goal not found or access denied',
            };
          }

          // Also record a check-in for this completion
          await createCheckIn(userId, {
            goalId,
            content: celebrationNote ?? 'Goal completed!',
          });

          return {
            success: true,
            goalId,
            message: `Goal "${updatedGoal.title}" marked as completed!`,
          };
        } catch (error) {
          console.error('Failed to mark goal complete:', error);
          return {
            success: false,
            goalId,
            message: 'Failed to mark goal as completed',
          };
        }
      },
    }),
  };
}

export type CoachTools = ReturnType<typeof createCoachTools>;
