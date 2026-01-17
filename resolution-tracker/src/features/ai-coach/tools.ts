import { tool } from 'ai';
import { z } from 'zod';
import { createCheckIn } from '@/src/features/check-ins';
import { updateProgressSentiment } from '@/src/features/goals/repository';
import { mergeUserSummary } from './summary-repository';
import type { RecordCheckInResult, UpdateSummaryResult, MarkGoalCompleteResult } from './types';
import { HABIT_COMPLETION_STATUSES } from '@/src/features/check-ins/types';
import { GOAL_TYPES, PROGRESS_SENTIMENTS, MAX_ACTIVE_GOALS } from '@/src/features/goals/types';
import {
  createGoalService,
  updateGoalService,
  pauseGoalService,
  resumeGoalService,
} from '@/src/features/goals/services';
import { createMilestoneService, completeMilestoneService } from '@/src/features/milestones/services';
import { createIntentionService } from '@/src/features/implementation-intentions/services';

// Result types for enhanced tools
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

// Goal Guru result types
export type CreateGoalResult = {
  success: boolean;
  goalId?: string;
  message: string;
};

export type UpdateGoalResult = {
  success: boolean;
  message: string;
};

export type PauseResumeGoalResult = {
  success: boolean;
  goalId: string;
  message: string;
};

export type AddMilestoneResult = {
  success: boolean;
  milestoneId?: string;
  message: string;
};

export type AddImplementationIntentionResult = {
  success: boolean;
  intentionId?: string;
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
          const result = await completeMilestoneService(milestoneId, userId);

          if (!result.success) {
            return {
              success: false,
              milestoneId,
              message: result.error.message,
            };
          }

          return {
            success: true,
            milestoneId,
            message: `Milestone "${result.data.title}" marked as complete!`,
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
          const result = await updateGoalService(goalId, userId, { status: 'completed' });

          if (!result.success) {
            return {
              success: false,
              goalId,
              message: result.error.message,
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
            message: `Goal "${result.data.title}" marked as completed!`,
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

    // ==========================================
    // Goal Guru Tools - Goal Lifecycle Management
    // ==========================================

    createGoal: tool({
      description: `Create a new goal for the user. Use this when the user wants to set a new goal. Extract structured data from the conversation. Maximum ${MAX_ACTIVE_GOALS} active goals allowed.`,
      inputSchema: z.object({
        title: z.string().min(1).describe('The goal title - specific and measurable'),
        goalType: z.enum(GOAL_TYPES).optional().describe('Type of goal: habit (recurring), target (measurable endpoint), or project (milestones)'),
        whyItMatters: z.string().optional().describe('Why this goal is important to the user - their personal motivation'),
        successCriteria: z.string().optional().describe('How the user will know they succeeded'),
        targetDate: z.string().datetime().optional().describe('Target completion date (ISO 8601 format)'),
        currentBaseline: z.string().optional().describe('Where the user is starting from'),
        recoveryPlan: z.string().optional().describe('Pre-planned response to setbacks'),
        targetValue: z.number().optional().describe('Numeric target for target-type goals'),
        targetUnit: z.string().optional().describe('Unit of measurement (e.g., miles, dollars, books)'),
        frequencyPerWeek: z.number().int().min(1).max(7).optional().describe('For habit goals: times per week'),
      }),
      execute: async (input): Promise<CreateGoalResult> => {
        try {
          const result = await createGoalService(userId, input);

          if (!result.success) {
            return {
              success: false,
              message: result.error.message,
            };
          }

          return {
            success: true,
            goalId: result.data.id,
            message: `Goal "${result.data.title}" created successfully!`,
          };
        } catch (error) {
          console.error('Failed to create goal:', error);
          return {
            success: false,
            message: 'Failed to create goal',
          };
        }
      },
    }),

    updateGoal: tool({
      description: 'Update an existing goal. Use this to refine goal details during setup conversations or when user wants to modify their goal.',
      inputSchema: z.object({
        goalId: z.string().uuid('Invalid goal ID format').describe('The goal ID to update'),
        title: z.string().min(1).optional().describe('Updated goal title'),
        goalType: z.enum(GOAL_TYPES).optional().describe('Updated goal type'),
        whyItMatters: z.string().optional().describe('Updated motivation'),
        successCriteria: z.string().optional().describe('Updated success criteria'),
        targetDate: z.string().datetime().optional().describe('Updated target date'),
        currentBaseline: z.string().optional().describe('Updated baseline'),
        recoveryPlan: z.string().optional().describe('Updated recovery plan'),
        targetValue: z.number().optional().describe('Updated target value'),
        targetUnit: z.string().optional().describe('Updated unit'),
        frequencyPerWeek: z.number().int().min(1).max(7).optional().describe('Updated frequency'),
      }),
      execute: async ({ goalId, ...updates }): Promise<UpdateGoalResult> => {
        try {
          const result = await updateGoalService(goalId, userId, updates);

          if (!result.success) {
            return {
              success: false,
              message: result.error.message,
            };
          }

          return {
            success: true,
            message: `Goal updated successfully`,
          };
        } catch (error) {
          console.error('Failed to update goal:', error);
          return {
            success: false,
            message: 'Failed to update goal',
          };
        }
      },
    }),

    pauseGoal: tool({
      description: 'Pause a goal without judgment. Use when user needs a break from a goal. Non-punitive - they can resume anytime.',
      inputSchema: z.object({
        goalId: z.string().uuid('Invalid goal ID format').describe('The goal ID to pause'),
      }),
      execute: async ({ goalId }): Promise<PauseResumeGoalResult> => {
        try {
          const result = await pauseGoalService(goalId, userId);

          if (!result.success) {
            return {
              success: false,
              goalId,
              message: result.error.message,
            };
          }

          return {
            success: true,
            goalId,
            message: `Goal "${result.data.title}" paused. You can resume it anytime.`,
          };
        } catch (error) {
          console.error('Failed to pause goal:', error);
          return {
            success: false,
            goalId,
            message: 'Failed to pause goal',
          };
        }
      },
    }),

    resumeGoal: tool({
      description: `Resume a paused goal. Checks active goal limit (max ${MAX_ACTIVE_GOALS}).`,
      inputSchema: z.object({
        goalId: z.string().uuid('Invalid goal ID format').describe('The goal ID to resume'),
      }),
      execute: async ({ goalId }): Promise<PauseResumeGoalResult> => {
        try {
          const result = await resumeGoalService(goalId, userId);

          if (!result.success) {
            return {
              success: false,
              goalId,
              message: result.error.message,
            };
          }

          return {
            success: true,
            goalId,
            message: `Goal "${result.data.title}" resumed!`,
          };
        } catch (error) {
          console.error('Failed to resume goal:', error);
          return {
            success: false,
            goalId,
            message: 'Failed to resume goal',
          };
        }
      },
    }),

    addMilestone: tool({
      description: 'Add a milestone to a project-type goal. Milestones break down larger goals into manageable steps.',
      inputSchema: z.object({
        goalId: z.string().uuid('Invalid goal ID format').describe('The goal ID to add the milestone to'),
        title: z.string().min(1).describe('Milestone title'),
        description: z.string().optional().describe('Optional description of what this milestone involves'),
        targetDate: z.string().datetime().optional().describe('Target completion date for this milestone'),
      }),
      execute: async ({ goalId, title, description, targetDate }): Promise<AddMilestoneResult> => {
        try {
          const result = await createMilestoneService(goalId, userId, {
            title,
            description: description ?? null,
            targetDate: targetDate ?? null,
          });

          if (!result.success) {
            return {
              success: false,
              message: result.error.message,
            };
          }

          return {
            success: true,
            milestoneId: result.data.id,
            message: `Milestone "${title}" added!`,
          };
        } catch (error) {
          console.error('Failed to add milestone:', error);
          return {
            success: false,
            message: 'Failed to add milestone',
          };
        }
      },
    }),

    addImplementationIntention: tool({
      description: 'Add an "If-Then" plan to a goal. Implementation intentions link situational cues to specific actions, dramatically increasing follow-through.',
      inputSchema: z.object({
        goalId: z.string().uuid('Invalid goal ID format').describe('The goal ID to add the intention to'),
        triggerCondition: z.string().min(1).describe('The "If" part - when/where this happens (e.g., "When I finish my morning coffee")'),
        action: z.string().min(1).describe('The "Then" part - what they will do (e.g., "I will do 10 pushups")'),
      }),
      execute: async ({ goalId, triggerCondition, action }): Promise<AddImplementationIntentionResult> => {
        try {
          const result = await createIntentionService(goalId, userId, {
            triggerCondition,
            action,
          });

          if (!result.success) {
            return {
              success: false,
              message: result.error.message,
            };
          }

          return {
            success: true,
            intentionId: result.data.id,
            message: `Implementation intention added: "If ${triggerCondition}, then ${action}"`,
          };
        } catch (error) {
          console.error('Failed to add implementation intention:', error);
          return {
            success: false,
            message: 'Failed to add implementation intention',
          };
        }
      },
    }),
  };
}

export type CoachTools = ReturnType<typeof createCoachTools>;
