import { z } from 'zod';

// Re-export DB types
export type { Milestone, NewMilestone } from '@/src/db/schema';

// Re-export shared validation
export { isValidUUID } from '@/src/features/goals/types';

// Zod schemas for API validation
export const createMilestoneSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be 500 characters or less'),
  description: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(500, 'Title must be 500 characters or less').optional(),
  description: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Infer types from schemas
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// API response type (camelCase for API layer)
export type MilestoneResponse = {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
};
