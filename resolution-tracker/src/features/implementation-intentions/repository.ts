import { db, implementationIntentions, goals, ImplementationIntention } from '@/src/db';
import { eq, and } from 'drizzle-orm';
import type { CreateIntentionInput, UpdateIntentionInput } from './types';

/**
 * Get all implementation intentions for a goal
 */
export async function getIntentionsByGoalId(goalId: string): Promise<ImplementationIntention[]> {
  return db
    .select()
    .from(implementationIntentions)
    .where(eq(implementationIntentions.goalId, goalId));
}

/**
 * Get a single intention by ID with ownership check via goal
 */
export async function getIntentionById(id: string, userId: string): Promise<ImplementationIntention | null> {
  const result = await db
    .select({
      intention: implementationIntentions,
    })
    .from(implementationIntentions)
    .innerJoin(goals, eq(implementationIntentions.goalId, goals.id))
    .where(and(eq(implementationIntentions.id, id), eq(goals.userId, userId)));

  return result[0]?.intention ?? null;
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
 * Create a new implementation intention
 */
export async function createIntention(
  goalId: string,
  userId: string,
  input: CreateIntentionInput
): Promise<ImplementationIntention | null> {
  // Verify ownership
  const isOwner = await verifyGoalOwnership(goalId, userId);
  if (!isOwner) return null;

  const result = await db
    .insert(implementationIntentions)
    .values({
      goalId,
      triggerCondition: input.triggerCondition,
      action: input.action,
      isActive: true,
    })
    .returning();

  return result[0];
}

/**
 * Update an implementation intention
 */
export async function updateIntention(
  id: string,
  userId: string,
  input: UpdateIntentionInput
): Promise<ImplementationIntention | null> {
  // First verify ownership
  const existing = await getIntentionById(id, userId);
  if (!existing) return null;

  const updateData: Record<string, unknown> = {};
  if (input.triggerCondition !== undefined) updateData.triggerCondition = input.triggerCondition;
  if (input.action !== undefined) updateData.action = input.action;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const result = await db
    .update(implementationIntentions)
    .set(updateData)
    .where(eq(implementationIntentions.id, id))
    .returning();

  return result[0] ?? null;
}

/**
 * Toggle intention active status
 */
export async function toggleIntentionActive(id: string, userId: string): Promise<ImplementationIntention | null> {
  // First verify ownership and get current state
  const existing = await getIntentionById(id, userId);
  if (!existing) return null;

  const result = await db
    .update(implementationIntentions)
    .set({ isActive: !existing.isActive })
    .where(eq(implementationIntentions.id, id))
    .returning();

  return result[0] ?? null;
}

/**
 * Delete an implementation intention
 */
export async function deleteIntention(id: string, userId: string): Promise<boolean> {
  // First verify ownership
  const existing = await getIntentionById(id, userId);
  if (!existing) return false;

  const result = await db
    .delete(implementationIntentions)
    .where(eq(implementationIntentions.id, id))
    .returning({ id: implementationIntentions.id });

  return result.length > 0;
}
