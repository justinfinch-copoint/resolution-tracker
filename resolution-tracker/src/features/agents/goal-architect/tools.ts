/**
 * Goal Architect Tools
 *
 * Tool definitions for the Goal Architect agent.
 * Includes goal creation tools + handoff back to Coach.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createHandoffTool } from '../shared-tools';
import { GOAL_TYPES, MAX_ACTIVE_GOALS } from '@/src/features/goals/types';
import {
  createGoalService,
  updateGoalService,
} from '@/src/features/goals/services';
import { createMilestoneService } from '@/src/features/milestones/services';
import { createIntentionService } from '@/src/features/implementation-intentions/services';
import type {
  CreateGoalResult,
  UpdateGoalResult,
  AddMilestoneResult,
  AddImplementationIntentionResult,
} from '../shared';

// Re-export for backward compatibility
export type {
  CreateGoalResult,
  UpdateGoalResult,
  AddMilestoneResult,
  AddImplementationIntentionResult,
} from '../shared';

/**
 * Create Goal Architect tools with userId bound.
 *
 * @param userId - The authenticated user's ID
 * @returns Goal Architect tools
 */
export function createGoalArchitectTools(userId: string) {
  const goalCreationTools = {
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

  // Handoff tool to return to Coach
  const handoffTools = {
    returnToCoach: createHandoffTool('coach', {
      description:
        'Return to Coach when goal setup is complete, user wants to discuss something else, or explicitly asks to go back. Include a summary of what was created.',
      reasonDescription: 'Summary of goal created (e.g., "Created habit goal: Exercise 3x/week")',
    }),
  };

  return {
    ...goalCreationTools,
    ...handoffTools,
  };
}

export type GoalArchitectTools = ReturnType<typeof createGoalArchitectTools>;
