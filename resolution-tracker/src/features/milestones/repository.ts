import { db, milestones, goals, Milestone } from '@/src/db';
import { eq, and, asc } from 'drizzle-orm';
import type { CreateMilestoneInput, UpdateMilestoneInput } from './types';

/**
 * Get all milestones for a goal (ordered by sortOrder)
 */
export async function getMilestonesByGoalId(goalId: string): Promise<Milestone[]> {
  return db
    .select()
    .from(milestones)
    .where(eq(milestones.goalId, goalId))
    .orderBy(asc(milestones.sortOrder));
}

/**
 * Get a single milestone by ID with ownership check via goal
 */
export async function getMilestoneById(id: string, userId: string): Promise<Milestone | null> {
  const result = await db
    .select({
      milestone: milestones,
    })
    .from(milestones)
    .innerJoin(goals, eq(milestones.goalId, goals.id))
    .where(and(eq(milestones.id, id), eq(goals.userId, userId)));

  return result[0]?.milestone ?? null;
}

/**
 * Verify user owns the goal
 */
async function verifyGoalOwnership(goalId: string, userId: string): Promise<boolean> {
  const result = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  return result.length > 0;
}

/**
 * Create a new milestone
 */
export async function createMilestone(
  goalId: string,
  userId: string,
  input: CreateMilestoneInput
): Promise<Milestone | null> {
  // Verify ownership
  const isOwner = await verifyGoalOwnership(goalId, userId);
  if (!isOwner) return null;

  const result = await db
    .insert(milestones)
    .values({
      goalId,
      title: input.title,
      description: input.description ?? null,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  return result[0];
}

/**
 * Update a milestone
 */
export async function updateMilestone(
  id: string,
  userId: string,
  input: UpdateMilestoneInput
): Promise<Milestone | null> {
  // First verify ownership
  const existing = await getMilestoneById(id, userId);
  if (!existing) return null;

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.targetDate !== undefined) updateData.targetDate = input.targetDate ? new Date(input.targetDate) : null;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

  const result = await db
    .update(milestones)
    .set(updateData)
    .where(eq(milestones.id, id))
    .returning();

  return result[0] ?? null;
}

/**
 * Mark a milestone as complete (idempotent - won't overwrite if already completed)
 */
export async function completeMilestone(id: string, userId: string): Promise<Milestone | null> {
  // First verify ownership
  const existing = await getMilestoneById(id, userId);
  if (!existing) return null;

  // If already completed, return existing without modification (idempotent)
  if (existing.completedAt !== null) {
    return existing;
  }

  const result = await db
    .update(milestones)
    .set({ completedAt: new Date() })
    .where(eq(milestones.id, id))
    .returning();

  return result[0] ?? null;
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(id: string, userId: string): Promise<boolean> {
  // First verify ownership
  const existing = await getMilestoneById(id, userId);
  if (!existing) return false;

  const result = await db
    .delete(milestones)
    .where(eq(milestones.id, id))
    .returning({ id: milestones.id });

  return result.length > 0;
}

/**
 * Reorder milestones for a goal
 * Validates all milestoneIds belong to the specified goal
 */
export async function reorderMilestones(
  goalId: string,
  userId: string,
  milestoneIds: string[]
): Promise<boolean> {
  // Verify ownership
  const isOwner = await verifyGoalOwnership(goalId, userId);
  if (!isOwner) return false;

  // Get all milestones for this goal to validate the provided IDs
  const existingMilestones = await getMilestonesByGoalId(goalId);
  const existingIds = new Set(existingMilestones.map((m) => m.id));

  // Verify all provided milestoneIds belong to this goal
  for (const id of milestoneIds) {
    if (!existingIds.has(id)) {
      return false; // Invalid milestone ID provided
    }
  }

  // Update sort order for each milestone
  await db.transaction(async (tx) => {
    for (let i = 0; i < milestoneIds.length; i++) {
      await tx
        .update(milestones)
        .set({ sortOrder: i })
        .where(and(eq(milestones.id, milestoneIds[i]), eq(milestones.goalId, goalId)));
    }
  });

  return true;
}
