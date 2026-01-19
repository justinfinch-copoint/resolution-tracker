---
title: 'Session State Infrastructure'
slug: 'session-state-infrastructure'
created: '2026-01-19'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Drizzle ORM (postgres-js driver)
  - PostgreSQL (pgEnum for type-safe enums)
  - TypeScript (strict mode)
  - Zod (input validation)
files_to_modify:
  - src/db/schema.ts
files_to_create:
  - src/features/memory/types.ts
  - src/features/memory/session-state.ts
  - src/features/memory/index.ts
code_patterns:
  - ServiceResult<T> discriminated union for error handling
  - Repository pattern for raw DB access
  - Zod schemas for input validation
  - pgEnum for type-safe database enums
test_patterns: []
---

# Tech-Spec: Session State Infrastructure

**Created:** 2026-01-19

## Overview

### Problem Statement

The multi-agent roundtable architecture requires persistent session state (Tier 2 of three-tier memory) to track which agent is active, store conversation messages with agent attribution, and log agent transitions. Currently no session infrastructure exists.

### Solution

Create a `conversation_sessions` Postgres table with Drizzle schema, plus a service layer (`features/memory/session-state.ts`) providing CRUD operations for session management.

### Scope

**In Scope:**
- `conversation_sessions` table with Drizzle schema
- `activeAgentEnum` Postgres enum for type-safe agent tracking
- Session state service with: `getOrCreateSession`, `updateSession`, `addMessage`, `recordTransition`, `clearSession`
- Type definitions in `features/memory/types.ts`
- Drizzle migration generation

**Out of Scope:**
- Unit tests (test project)
- Working context builder (MA-1.2)
- Agent type definitions beyond what's needed for session (MA-1.3)
- Redis optimization
- Session expiration/cleanup logic (MA-5.2)

## Context for Development

### Codebase Patterns

**Services Layer Pattern** (from `features/goals/services.ts`):
```typescript
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```
- Validate input with Zod at service boundary
- Delegate to repository for DB access
- Return ServiceResult for consistent error handling

**Repository Pattern** (from `features/goals/repository.ts`):
- Direct Drizzle queries using `db` from `@/src/db`
- Return raw DB types or null
- Use transactions for atomic operations

**Types Pattern** (from `features/goals/types.ts`):
- Re-export DB types from schema
- Define Zod schemas for validation
- Define Response types (camelCase) for API layer
- Export validation helpers

**DB Schema Pattern** (from `src/db/schema.ts`):
- Use `pgEnum` for type-safe enums
- Tables use `snake_case` naming
- Export both `$inferSelect` and `$inferInsert` types
- Define JSONB type interfaces above table definitions

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts` | Pattern for enums, tables, JSONB types |
| `src/db/index.ts` | DB client export pattern |
| `src/features/goals/services.ts` | ServiceResult pattern |
| `src/features/goals/types.ts` | Zod schema and type pattern |
| `src/features/goals/repository.ts` | Drizzle query pattern |

### Technical Decisions

- Store full session in Postgres (not Redis) for MVP simplicity
- Use Postgres enum for `active_agent` field for type safety
- Store messages in JSONB array (self-contained session, not normalized)
- Follow existing ServiceResult<T> pattern from goals feature
- Session service will NOT have a separate repository file (simpler, all in session-state.ts)

## Implementation Plan

### Tasks

- [x] **Task 1: Add activeAgentEnum to schema**
  - File: `src/db/schema.ts`
  - Action: Add `pgEnum` for agent types after existing enums
  - Details:
    ```typescript
    export const activeAgentEnum = pgEnum('active_agent', [
      'coach',
      'goalArchitect',
      'patternAnalyst',
      'motivator',
      'accountabilityPartner'
    ]);
    ```

- [x] **Task 2: Add JSONB type definitions to schema**
  - File: `src/db/schema.ts`
  - Action: Add TypeScript interfaces for JSONB columns (before table definition)
  - Details:
    ```typescript
    // Session message with agent attribution
    export type SessionMessage = {
      role: 'user' | 'assistant';
      content: string;
      agentId?: string;  // Which agent sent this (for assistant messages)
      timestamp: string; // ISO 8601
    };

    // Agent transition record
    export type AgentTransition = {
      from: string;
      to: string;
      reason: string;
      timestamp: string; // ISO 8601
    };
    ```

- [x] **Task 3: Add conversation_sessions table to schema**
  - File: `src/db/schema.ts`
  - Action: Add table definition after JSONB types
  - Details:
    ```typescript
    export const conversationSessions = pgTable('conversation_sessions', {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
      activeAgent: activeAgentEnum('active_agent').notNull().default('coach'),
      messages: jsonb('messages').$type<SessionMessage[]>().notNull().default([]),
      agentTransitions: jsonb('agent_transitions').$type<AgentTransition[]>().notNull().default([]),
      createdAt: timestamp('created_at').notNull().defaultNow(),
      updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
      expiresAt: timestamp('expires_at'),
    }, (table) => [
      index('conversation_sessions_user_id_idx').on(table.userId),
    ]);
    ```

- [x] **Task 4: Add type exports to schema**
  - File: `src/db/schema.ts`
  - Action: Add type exports at end of file
  - Details:
    ```typescript
    export type ConversationSession = typeof conversationSessions.$inferSelect;
    export type NewConversationSession = typeof conversationSessions.$inferInsert;
    export type ActiveAgent = typeof activeAgentEnum.enumValues[number];
    ```

- [x] **Task 5: Generate Drizzle migration**
  - Command: `npm run db:generate`
  - Action: Generate SQL migration for new enum and table
  - Notes: Verify migration file created in `drizzle/migrations/`

- [x] **Task 6: Apply migration**
  - Command: `npm run db:migrate`
  - Action: Apply migration to database
  - Notes: Verify table exists with `\d conversation_sessions` in psql

- [x] **Task 7: Create features/memory directory**
  - Action: Create directory `src/features/memory/`

- [x] **Task 8: Create types.ts**
  - File: `src/features/memory/types.ts`
  - Action: Create types file with Zod schemas and response types
  - Details:
    ```typescript
    import { z } from 'zod';

    // Re-export DB types
    export type {
      ConversationSession,
      NewConversationSession,
      ActiveAgent,
      SessionMessage,
      AgentTransition,
    } from '@/src/db/schema';

    // Agent ID values
    export const AGENT_IDS = [
      'coach',
      'goalArchitect',
      'patternAnalyst',
      'motivator',
      'accountabilityPartner',
    ] as const;
    export type AgentId = (typeof AGENT_IDS)[number];

    // Zod schemas for validation
    export const sessionMessageSchema = z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
      agentId: z.string().optional(),
      timestamp: z.string().datetime(),
    });

    export const agentTransitionSchema = z.object({
      from: z.enum(AGENT_IDS),
      to: z.enum(AGENT_IDS),
      reason: z.string().min(1),
      timestamp: z.string().datetime(),
    });

    export const addMessageInputSchema = z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
      agentId: z.string().optional(),
    });

    export const recordTransitionInputSchema = z.object({
      to: z.enum(AGENT_IDS),
      reason: z.string().min(1),
    });

    // Input types
    export type AddMessageInput = z.infer<typeof addMessageInputSchema>;
    export type RecordTransitionInput = z.infer<typeof recordTransitionInputSchema>;

    // Response type (camelCase for API)
    export type SessionResponse = {
      id: string;
      userId: string;
      activeAgent: AgentId;
      messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        agentId?: string;
        timestamp: string;
      }>;
      agentTransitions: Array<{
        from: string;
        to: string;
        reason: string;
        timestamp: string;
      }>;
      createdAt: string;
      updatedAt: string;
      expiresAt: string | null;
    };
    ```

- [x] **Task 9: Create session-state.ts service**
  - File: `src/features/memory/session-state.ts`
  - Action: Create service with all CRUD operations
  - Details:
    ```typescript
    import { db, conversationSessions } from '@/src/db';
    import { eq } from 'drizzle-orm';
    import {
      addMessageInputSchema,
      recordTransitionInputSchema,
      type SessionResponse,
      type AddMessageInput,
      type RecordTransitionInput,
      type AgentId,
    } from './types';

    // ServiceResult pattern (matches goals/services.ts)
    export type ServiceResult<T> =
      | { success: true; data: T }
      | { success: false; error: { code: string; message: string } };

    // Transform DB record to API response
    function transformToResponse(session: typeof conversationSessions.$inferSelect): SessionResponse {
      return {
        id: session.id,
        userId: session.userId,
        activeAgent: session.activeAgent as AgentId,
        messages: session.messages,
        agentTransitions: session.agentTransitions,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        expiresAt: session.expiresAt?.toISOString() ?? null,
      };
    }

    /**
     * Get existing session or create new one for user
     * Each user has one active session (MVP simplification)
     */
    export async function getOrCreateSession(
      userId: string
    ): Promise<ServiceResult<SessionResponse>> {
      // Try to find existing session
      const existing = await db
        .select()
        .from(conversationSessions)
        .where(eq(conversationSessions.userId, userId))
        .limit(1);

      if (existing[0]) {
        return { success: true, data: transformToResponse(existing[0]) };
      }

      // Create new session
      const [created] = await db
        .insert(conversationSessions)
        .values({ userId })
        .returning();

      return { success: true, data: transformToResponse(created) };
    }

    /**
     * Update session's active agent
     */
    export async function updateActiveAgent(
      sessionId: string,
      activeAgent: AgentId
    ): Promise<ServiceResult<SessionResponse>> {
      const [updated] = await db
        .update(conversationSessions)
        .set({ activeAgent })
        .where(eq(conversationSessions.id, sessionId))
        .returning();

      if (!updated) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        };
      }

      return { success: true, data: transformToResponse(updated) };
    }

    /**
     * Add a message to the session
     */
    export async function addMessage(
      sessionId: string,
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

      // Get current session
      const [session] = await db
        .select()
        .from(conversationSessions)
        .where(eq(conversationSessions.id, sessionId));

      if (!session) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        };
      }

      // Append message
      const newMessage = {
        role,
        content,
        agentId,
        timestamp: new Date().toISOString(),
      };

      const [updated] = await db
        .update(conversationSessions)
        .set({ messages: [...session.messages, newMessage] })
        .where(eq(conversationSessions.id, sessionId))
        .returning();

      return { success: true, data: transformToResponse(updated) };
    }

    /**
     * Record an agent transition
     */
    export async function recordTransition(
      sessionId: string,
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

      // Get current session
      const [session] = await db
        .select()
        .from(conversationSessions)
        .where(eq(conversationSessions.id, sessionId));

      if (!session) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        };
      }

      // Create transition record
      const transition = {
        from: session.activeAgent,
        to,
        reason,
        timestamp: new Date().toISOString(),
      };

      // Update session with new transition and active agent
      const [updated] = await db
        .update(conversationSessions)
        .set({
          activeAgent: to,
          agentTransitions: [...session.agentTransitions, transition],
        })
        .where(eq(conversationSessions.id, sessionId))
        .returning();

      return { success: true, data: transformToResponse(updated) };
    }

    /**
     * Clear/delete a session
     */
    export async function clearSession(
      sessionId: string
    ): Promise<ServiceResult<{ deleted: true }>> {
      const result = await db
        .delete(conversationSessions)
        .where(eq(conversationSessions.id, sessionId))
        .returning({ id: conversationSessions.id });

      if (result.length === 0) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        };
      }

      return { success: true, data: { deleted: true } };
    }

    /**
     * Get session by ID
     */
    export async function getSession(
      sessionId: string
    ): Promise<ServiceResult<SessionResponse>> {
      const [session] = await db
        .select()
        .from(conversationSessions)
        .where(eq(conversationSessions.id, sessionId));

      if (!session) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        };
      }

      return { success: true, data: transformToResponse(session) };
    }
    ```

- [x] **Task 10: Create index.ts**
  - File: `src/features/memory/index.ts`
  - Action: Create barrel export file
  - Details:
    ```typescript
    // Session state services
    export {
      getOrCreateSession,
      updateActiveAgent,
      addMessage,
      recordTransition,
      clearSession,
      getSession,
      type ServiceResult,
    } from './session-state';

    // Types
    export * from './types';
    ```

### Acceptance Criteria

- [x] **AC 1:** Given the database is running, when `npm run db:migrate` is executed, then the `conversation_sessions` table is created with all specified columns and the `active_agent` enum exists.

- [x] **AC 2:** Given a user ID that has no existing session, when `getOrCreateSession(userId)` is called, then a new session is created with `activeAgent: 'coach'`, empty `messages` array, and empty `agentTransitions` array.

- [x] **AC 3:** Given a user ID that has an existing session, when `getOrCreateSession(userId)` is called, then the existing session is returned (not a new one).

- [x] **AC 4:** Given a valid session ID and message input, when `addMessage(sessionId, { role: 'user', content: 'Hello' })` is called, then the message is appended to the session's messages array with a timestamp.

- [x] **AC 5:** Given a valid session ID and transition input, when `recordTransition(sessionId, { to: 'goalArchitect', reason: 'User wants to create a goal' })` is called, then the transition is recorded in `agentTransitions` and `activeAgent` is updated to 'goalArchitect'.

- [x] **AC 6:** Given an invalid session ID, when any service function is called, then it returns `{ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } }`.

- [x] **AC 7:** Given invalid input (e.g., empty content), when `addMessage` is called, then it returns `{ success: false, error: { code: 'VALIDATION_ERROR', message: '...' } }`.

- [x] **AC 8:** Given a valid session ID, when `clearSession(sessionId)` is called, then the session is deleted from the database and `{ success: true, data: { deleted: true } }` is returned.

## Additional Context

### Dependencies

- **Drizzle ORM**: Already installed and configured
- **Zod**: Already installed
- **Database**: PostgreSQL running in devcontainer
- **MA-1.3** (Agent Type Definitions): Will extend the types defined here with full agent configuration

### Testing Strategy

No unit tests - test project. Manual verification via:
1. Run migration and verify table exists
2. Test service functions via API route or REPL

### Notes

- **Risk:** JSONB array updates are not atomic - if concurrent updates happen, messages could be lost. For MVP this is acceptable; production would use `jsonb_insert` or separate messages table.
- **Future:** MA-5.2 will add session expiration logic using the `expires_at` column.
- **Future:** Consider moving to Redis for session storage if latency becomes an issue.
- This is MA-1.1 from the multi-agent implementation specs, Part of Phase 1: Foundation (Memory System).

## Review Findings

Adversarial code review completed 2026-01-19. Findings captured below.

### Real Issues (Fixed)

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| F1 | Medium | Duplicate ServiceResult type - should import from goals/services | Import from shared location |
| F2 | Critical | Race condition in addMessage/recordTransition - no transactions | Add db.transaction() |
| F3 | Critical | No authorization check - missing userId validation on operations | Add userId param and ownership check |
| F4 | High | Missing unique constraint on userId for single-session semantics | Add unique constraint to schema |
| F5 | Medium | Duplicate AGENT_IDS vs ActiveAgent - two sources of truth | Derive from schema enum |
| F6 | Low | AgentTransition schema type uses string instead of enum | Update to use ActiveAgent type |
| F7 | Low | agentId validated as any string, not enum | Update Zod to use AGENT_IDS enum |
| F8 | High | No try-catch error handling around DB operations | Add try-catch blocks |
| F12 | High | No null check after update before transform | Add null checks |
| F13 | Low | Response type uses string not AgentId for agentTransitions | Update types |
| F14 | High | getOrCreateSession race condition - needs upsert | Use onConflictDoNothing |

### Noise (Out of Scope)

| ID | Severity | Issue | Reason |
|----|----------|-------|--------|
| F9 | Low | expiresAt field defined but unused | Intentional - MA-5.2 will add expiration logic |
| F10 | Medium | No session size limits or message pruning | Acceptable for MVP per tech-spec |
| F11 | Low | No test coverage | Tech-spec explicitly states "test project" |

### Review Summary

- **Resolution approach:** Auto-fix
- **Findings:** 14 total, 11 fixed, 3 skipped (out of scope)
- **Additional migration:** 0003_famous_shadowcat.sql (unique constraint on userId)
- **Build status:** Passing
