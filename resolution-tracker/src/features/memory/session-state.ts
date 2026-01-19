import { db, conversationSessions } from '@/src/db';
import { eq, and } from 'drizzle-orm';
import { type ServiceResult } from '@/src/features/goals/services';
import {
  addMessageInputSchema,
  recordTransitionInputSchema,
  type SessionResponse,
  type AgentId,
} from './types';

// Re-export ServiceResult for consumers
export type { ServiceResult };

// Transform DB record to API response
function transformToResponse(session: typeof conversationSessions.$inferSelect): SessionResponse {
  return {
    id: session.id,
    userId: session.userId,
    activeAgent: session.activeAgent as AgentId,
    messages: session.messages as SessionResponse['messages'],
    agentTransitions: session.agentTransitions as SessionResponse['agentTransitions'],
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    expiresAt: session.expiresAt?.toISOString() ?? null,
  };
}

/**
 * Get existing session or create new one for user
 * Uses INSERT ON CONFLICT DO NOTHING + SELECT to handle race conditions
 * Each user has exactly one active session (enforced by unique constraint)
 */
export async function getOrCreateSession(
  userId: string
): Promise<ServiceResult<SessionResponse>> {
  try {
    // Attempt to insert (will no-op if exists due to unique constraint)
    await db
      .insert(conversationSessions)
      .values({ userId })
      .onConflictDoNothing({ target: conversationSessions.userId });

    // Always fetch the row (either existing or just-created)
    const [session] = await db
      .select()
      .from(conversationSessions)
      .where(eq(conversationSessions.userId, userId));

    if (!session) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create or retrieve session' },
      };
    }

    return { success: true, data: transformToResponse(session) };
  } catch (err) {
    return {
      success: false,
      error: { code: 'DATABASE_ERROR', message: err instanceof Error ? err.message : 'Unknown database error' },
    };
  }
}

/**
 * Get session by ID with ownership verification
 */
export async function getSession(
  sessionId: string,
  userId: string
): Promise<ServiceResult<SessionResponse>> {
  try {
    const [session] = await db
      .select()
      .from(conversationSessions)
      .where(and(eq(conversationSessions.id, sessionId), eq(conversationSessions.userId, userId)));

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      };
    }

    return { success: true, data: transformToResponse(session) };
  } catch (err) {
    return {
      success: false,
      error: { code: 'DATABASE_ERROR', message: err instanceof Error ? err.message : 'Unknown database error' },
    };
  }
}

/**
 * Update session's active agent with ownership verification
 */
export async function updateActiveAgent(
  sessionId: string,
  userId: string,
  activeAgent: AgentId
): Promise<ServiceResult<SessionResponse>> {
  try {
    const [updated] = await db
      .update(conversationSessions)
      .set({ activeAgent })
      .where(and(eq(conversationSessions.id, sessionId), eq(conversationSessions.userId, userId)))
      .returning();

    if (!updated) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      };
    }

    return { success: true, data: transformToResponse(updated) };
  } catch (err) {
    return {
      success: false,
      error: { code: 'DATABASE_ERROR', message: err instanceof Error ? err.message : 'Unknown database error' },
    };
  }
}

/**
 * Add a message to the session with transaction for atomicity
 */
export async function addMessage(
  sessionId: string,
  userId: string,
  input: unknown
): Promise<ServiceResult<SessionResponse>> {
  const parseResult = addMessageInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
    };
  }

  const { role, content, agentId } = parseResult.data;

  try {
    const result = await db.transaction(async (tx) => {
      // Get current session within transaction
      const [session] = await tx
        .select()
        .from(conversationSessions)
        .where(and(eq(conversationSessions.id, sessionId), eq(conversationSessions.userId, userId)));

      if (!session) {
        return null;
      }

      // Append message
      const newMessage = {
        role,
        content,
        agentId,
        timestamp: new Date().toISOString(),
      };

      const [updated] = await tx
        .update(conversationSessions)
        .set({ messages: [...session.messages, newMessage] })
        .where(eq(conversationSessions.id, sessionId))
        .returning();

      return updated;
    });

    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      };
    }

    return { success: true, data: transformToResponse(result) };
  } catch (err) {
    return {
      success: false,
      error: { code: 'DATABASE_ERROR', message: err instanceof Error ? err.message : 'Unknown database error' },
    };
  }
}

/**
 * Record an agent transition with transaction for atomicity
 */
export async function recordTransition(
  sessionId: string,
  userId: string,
  input: unknown
): Promise<ServiceResult<SessionResponse>> {
  const parseResult = recordTransitionInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
    };
  }

  const { to, reason } = parseResult.data;

  try {
    const result = await db.transaction(async (tx) => {
      // Get current session within transaction
      const [session] = await tx
        .select()
        .from(conversationSessions)
        .where(and(eq(conversationSessions.id, sessionId), eq(conversationSessions.userId, userId)));

      if (!session) {
        return null;
      }

      // Create transition record
      const transition = {
        from: session.activeAgent,
        to,
        reason,
        timestamp: new Date().toISOString(),
      };

      // Update session with new transition and active agent
      const [updated] = await tx
        .update(conversationSessions)
        .set({
          activeAgent: to,
          agentTransitions: [...session.agentTransitions, transition],
        })
        .where(eq(conversationSessions.id, sessionId))
        .returning();

      return updated;
    });

    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      };
    }

    return { success: true, data: transformToResponse(result) };
  } catch (err) {
    return {
      success: false,
      error: { code: 'DATABASE_ERROR', message: err instanceof Error ? err.message : 'Unknown database error' },
    };
  }
}

/**
 * Clear/delete a session with ownership verification
 */
export async function clearSession(
  sessionId: string,
  userId: string
): Promise<ServiceResult<{ deleted: true }>> {
  try {
    const result = await db
      .delete(conversationSessions)
      .where(and(eq(conversationSessions.id, sessionId), eq(conversationSessions.userId, userId)))
      .returning({ id: conversationSessions.id });

    if (result.length === 0) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      };
    }

    return { success: true, data: { deleted: true } };
  } catch (err) {
    return {
      success: false,
      error: { code: 'DATABASE_ERROR', message: err instanceof Error ? err.message : 'Unknown database error' },
    };
  }
}

/**
 * Get session by user ID (convenience method)
 */
export async function getSessionByUserId(
  userId: string
): Promise<ServiceResult<SessionResponse>> {
  try {
    const [session] = await db
      .select()
      .from(conversationSessions)
      .where(eq(conversationSessions.userId, userId));

    if (!session) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      };
    }

    return { success: true, data: transformToResponse(session) };
  } catch (err) {
    return {
      success: false,
      error: { code: 'DATABASE_ERROR', message: err instanceof Error ? err.message : 'Unknown database error' },
    };
  }
}
