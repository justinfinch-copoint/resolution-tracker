import { tool } from 'ai';
import { z } from 'zod';
import { createCheckIn } from '@/src/features/check-ins';
import { updateGoal } from '@/src/features/goals/repository';
import { mergeUserSummary } from './summary-repository';
import type { RecordCheckInResult, UpdateSummaryResult, MarkGoalCompleteResult } from './types';

/**
 * Factory function to create coach tools with userId bound
 * This allows tools to operate on behalf of the authenticated user
 */
export function createCoachTools(userId: string) {
  return {
    recordCheckIn: tool({
      description: 'Record a check-in when user reports progress on a goal or shares an update about their life/goals',
      inputSchema: z.object({
        goalId: z.string().nullable().describe('The goal ID if specific goal mentioned, null if general update'),
        content: z.string().describe('Summary of what the user shared'),
      }),
      execute: async ({ goalId, content }): Promise<RecordCheckInResult> => {
        try {
          const checkIn = await createCheckIn(userId, {
            goalId,
            content,
          });

          return {
            success: true,
            checkInId: checkIn.id,
            message: `Check-in recorded${goalId ? ' for goal' : ''}`,
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
        goalId: z.string().describe('The ID of the goal to mark as completed'),
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
