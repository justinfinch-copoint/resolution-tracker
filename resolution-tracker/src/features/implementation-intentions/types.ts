import { z } from 'zod';

// Re-export DB types
export type { ImplementationIntention, NewImplementationIntention } from '@/src/db/schema';

// Re-export shared validation
export { isValidUUID } from '@/src/features/goals/types';

// Zod schemas for API validation
export const createIntentionSchema = z.object({
  triggerCondition: z.string().min(1, 'Trigger condition is required').max(500, 'Trigger condition must be 500 characters or less'),
  action: z.string().min(1, 'Action is required').max(500, 'Action must be 500 characters or less'),
});

export const updateIntentionSchema = z.object({
  triggerCondition: z.string().min(1, 'Trigger condition cannot be empty').max(500, 'Trigger condition must be 500 characters or less').optional(),
  action: z.string().min(1, 'Action cannot be empty').max(500, 'Action must be 500 characters or less').optional(),
  isActive: z.boolean().optional(),
});

// Infer types from schemas
export type CreateIntentionInput = z.infer<typeof createIntentionSchema>;
export type UpdateIntentionInput = z.infer<typeof updateIntentionSchema>;

// API response type (camelCase for API layer)
export type ImplementationIntentionResponse = {
  id: string;
  goalId: string;
  triggerCondition: string;
  action: string;
  isActive: boolean;
  createdAt: string;
};
