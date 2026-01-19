---
title: 'Working Context Builder'
slug: 'working-context-builder'
created: '2026-01-19'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Drizzle ORM', 'Zod', 'Vercel AI SDK']
files_to_modify:
  - 'src/features/memory/working-context.ts (new)'
  - 'src/features/memory/long-term/user-profile.ts (new)'
  - 'src/features/memory/long-term/goals-summary.ts (new)'
  - 'src/features/memory/long-term/engagement.ts (new)'
  - 'src/features/memory/long-term/index.ts (new)'
  - 'src/features/memory/types.ts (extend)'
  - 'src/features/memory/index.ts (extend)'
code_patterns:
  - 'ServiceResult<T> discriminated union for error handling'
  - 'Query functions return transformed API-format types'
  - 'Strategy pattern for message scoping (replaceable)'
  - 'Parallel data fetching with Promise.all'
test_patterns: []
---

# Tech-Spec: Working Context Builder

**Created:** 2026-01-19
**Spec Reference:** MA-1.2 from `multi-agent-implementation-specs.md`

## Overview

### Problem Statement

Each agent invocation needs scoped working context (Tier 1) assembled from session state (Tier 2) and long-term memory (Tier 3). Currently there's no function to perform this assembly. Without it, agents would either get no context or receive a full history dump that causes context pollution and wastes tokens.

### Solution

Create `assembleWorkingContext()` function that:
1. Pulls relevant data from long-term memory via dedicated retrieval functions
2. Scopes messages using a replaceable "last N" strategy (designed for future compaction/summary)
3. Injects user profile and goals context into system prompts
4. Provides stubbed expertise module loading (to be implemented with agents)

### Scope

**In Scope:**
- `features/memory/working-context.ts` - main assembly function
- `features/memory/long-term/` directory with dedicated retrieval functions:
  - `user-profile.ts` - fetch user profile data
  - `goals-summary.ts` - fetch goals summary for context
  - `engagement.ts` - fetch engagement data (days since last check-in)
- Message scoping with "last N" strategy (designed for future replacement)
- Stubbed expertise module loader
- Types for WorkingContext, LongTermMemory, MessageScopingStrategy
- Update `features/memory/index.ts` exports

**Out of Scope:**
- Advanced conversation compaction/summary (future enhancement)
- Actual expertise module content (deferred to MA-2.1 Coach Agent Extraction)
- RAG-based check-in retrieval (future enhancement)
- Unit tests (skipped per user request)

## Context for Development

### Codebase Patterns

1. **ServiceResult<T> Pattern** (from `features/goals/services.ts`):
   ```typescript
   export type ServiceResult<T> =
     | { success: true; data: T }
     | { success: false; error: { code: string; message: string } };
   ```

2. **Context Builder Pattern** (from `ai-coach/context-builder.ts`):
   - Parallel fetching with `Promise.all`
   - Transform DB records to API format (snake_case → camelCase)
   - Returns typed `ChatContext` object

3. **Knowledge Modules Pattern** (from `ai-coach/knowledge-modules/`):
   - Each module exports a const string
   - `buildKnowledgeModulesPrompt()` concatenates all modules
   - AI self-selects relevant sections via conditional headers

4. **Message Scoping** (new for multi-agent):
   - Session state stores messages with agent attribution (MA-1.1)
   - Working context scopes from session messages, NOT check-ins table
   - Strategy pattern allows future replacement with compaction/summary

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `features/memory/session-state.ts` | Session state service (MA-1.1) - source for messages |
| `features/memory/types.ts` | Existing types: AgentId, SessionMessage, AgentTransition |
| `features/ai-coach/context-builder.ts` | Pattern for long-term memory fetching |
| `features/ai-coach/prompts.ts` | Pattern for system prompt building with context |
| `features/ai-coach/knowledge-modules/index.ts` | Pattern for expertise module loading |
| `features/goals/queries.ts` | `getUserGoals()` - goals data fetching |
| `features/check-ins/queries.ts` | `getRecentUserCheckIns()` - engagement data |
| `features/ai-coach/summary-repository.ts` | `getUserSummaryData()` - user patterns/wins/struggles |
| `db/schema.ts` | Schema for profiles, goals, userSummaries tables |

### Technical Decisions

1. **Working Context Complements Existing Context Builder**
   - `ai-coach/context-builder.ts` remains for single-agent use (backward compat)
   - `memory/working-context.ts` is multi-agent aware, scopes by agent
   - Future: orchestrator (MA-2.2) uses working-context.ts

2. **Long-Term Memory as Dedicated Functions**
   - `long-term/user-profile.ts` - user profile data from profiles table
   - `long-term/goals-summary.ts` - active goals summary
   - `long-term/engagement.ts` - days since last check-in, engagement status
   - Each returns typed data, fetchable in parallel

3. **Message Scoping Strategy Pattern**
   - Interface: `MessageScopingStrategy` with `selectMessages(messages, agentId, config): Message[]`
   - Default: `LastNStrategy` - returns last N messages
   - Future: `CompactionStrategy` - summarizes older messages
   - Config per agent: `{ maxMessages: number, relevanceFilter?: (msg) => boolean }`

4. **Expertise Module Stub**
   - Create `getExpertiseModules(agentId): string[]` stub
   - Returns empty array for now
   - MA-2.1 (Coach Agent Extraction) implements actual module selection

## Implementation Plan

### Tasks

#### Task 1: Extend types.ts with Working Context Types
- **File:** `src/features/memory/types.ts`
- **Action:** Add new types for working context, long-term memory, and message scoping
- **Details:**
  ```typescript
  // User profile for context injection
  export type UserProfile = {
    id: string;
    email: string | null;
    createdAt: string;
  };

  // Goals summary for context (subset of full goal)
  export type GoalSummary = {
    id: string;
    title: string;
    status: string;
    goalType: 'habit' | 'target' | 'project';
  };

  // User summary data (patterns, wins, struggles)
  export type UserSummaryContext = {
    patterns: string[];
    wins: string[];
    struggles: string[];
    lastUpdated: string | null;
  };

  // Engagement data
  export type EngagementContext = {
    daysSinceLastCheckIn: number | null;
    status: 'new' | 'engaged' | 'returning';
    lastCheckInAt: string | null;
  };

  // Combined long-term memory
  export type LongTermMemory = {
    userProfile: UserProfile;
    goals: GoalSummary[];
    userSummary: UserSummaryContext | null;
    engagement: EngagementContext;
  };

  // Message scoping configuration per agent
  export type MessageScopingConfig = {
    maxMessages: number;
    relevanceFilter?: (message: SessionMessage) => boolean;
  };

  // Default scoping configs per agent type
  export const DEFAULT_SCOPING_CONFIGS: Record<AgentId, MessageScopingConfig> = {
    coach: { maxMessages: 10 },
    goalArchitect: { maxMessages: 10 },
    patternAnalyst: { maxMessages: 5 },
    motivator: { maxMessages: 5 },
    accountabilityPartner: { maxMessages: 10 },
  };

  // Final working context output (matches Vercel AI SDK expectations)
  export type WorkingContext = {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools: Record<string, unknown>; // Placeholder - actual tools defined in agent configs
  };
  ```

#### Task 2: Create long-term/user-profile.ts
- **File:** `src/features/memory/long-term/user-profile.ts` (new)
- **Action:** Create function to fetch user profile from profiles table
- **Details:**
  ```typescript
  import { db, profiles } from '@/src/db';
  import { eq } from 'drizzle-orm';
  import type { UserProfile } from '../types';

  /**
   * Fetch user profile for context injection
   * Returns basic profile data (id, email, createdAt)
   */
  export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const [profile] = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(eq(profiles.id, userId));

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      createdAt: profile.createdAt.toISOString(),
    };
  }
  ```

#### Task 3: Create long-term/goals-summary.ts
- **File:** `src/features/memory/long-term/goals-summary.ts` (new)
- **Action:** Create function to fetch active goals summary
- **Details:**
  ```typescript
  import { db, goals } from '@/src/db';
  import { eq, and } from 'drizzle-orm';
  import type { GoalSummary } from '../types';

  /**
   * Fetch active goals summary for context
   * Returns lightweight goal data (id, title, status, goalType)
   */
  export async function getGoalsSummary(userId: string): Promise<GoalSummary[]> {
    const userGoals = await db
      .select({
        id: goals.id,
        title: goals.title,
        status: goals.status,
        goalType: goals.goalType,
      })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, 'active')));

    return userGoals.map((g) => ({
      id: g.id,
      title: g.title,
      status: g.status,
      goalType: g.goalType as 'habit' | 'target' | 'project',
    }));
  }
  ```

#### Task 4: Create long-term/engagement.ts
- **File:** `src/features/memory/long-term/engagement.ts` (new)
- **Action:** Create function to calculate engagement status from check-ins
- **Details:**
  ```typescript
  import { db, checkIns } from '@/src/db';
  import { eq, desc } from 'drizzle-orm';
  import type { EngagementContext } from '../types';

  const ENGAGEMENT_THRESHOLD_DAYS = 3;

  /**
   * Calculate user engagement status based on check-in history
   * Returns days since last check-in and engagement status
   */
  export async function getEngagementContext(userId: string): Promise<EngagementContext> {
    // Get most recent check-in
    const [lastCheckIn] = await db
      .select({ createdAt: checkIns.createdAt })
      .from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.createdAt))
      .limit(1);

    if (!lastCheckIn) {
      return {
        daysSinceLastCheckIn: null,
        status: 'new',
        lastCheckInAt: null,
      };
    }

    const daysSince = Math.floor(
      (Date.now() - lastCheckIn.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      daysSinceLastCheckIn: daysSince,
      status: daysSince <= ENGAGEMENT_THRESHOLD_DAYS ? 'engaged' : 'returning',
      lastCheckInAt: lastCheckIn.createdAt.toISOString(),
    };
  }
  ```

#### Task 5: Create long-term/index.ts
- **File:** `src/features/memory/long-term/index.ts` (new)
- **Action:** Create barrel export and combined fetch function
- **Details:**
  ```typescript
  export { getUserProfile } from './user-profile';
  export { getGoalsSummary } from './goals-summary';
  export { getEngagementContext } from './engagement';

  import { getUserProfile } from './user-profile';
  import { getGoalsSummary } from './goals-summary';
  import { getEngagementContext } from './engagement';
  import { getUserSummaryData } from '@/src/features/ai-coach/summary-repository';
  import type { LongTermMemory, UserProfile } from '../types';

  /**
   * Fetch all long-term memory in parallel
   * Returns combined LongTermMemory object
   */
  export async function fetchLongTermMemory(userId: string): Promise<LongTermMemory> {
    const [userProfile, goals, userSummaryData, engagement] = await Promise.all([
      getUserProfile(userId),
      getGoalsSummary(userId),
      getUserSummaryData(userId),
      getEngagementContext(userId),
    ]);

    // Provide default profile if not found (shouldn't happen with valid userId)
    const profile: UserProfile = userProfile ?? {
      id: userId,
      email: null,
      createdAt: new Date().toISOString(),
    };

    return {
      userProfile: profile,
      goals,
      userSummary: userSummaryData
        ? {
            patterns: userSummaryData.patterns ?? [],
            wins: userSummaryData.wins ?? [],
            struggles: userSummaryData.struggles ?? [],
            lastUpdated: userSummaryData.lastUpdated ?? null,
          }
        : null,
      engagement,
    };
  }
  ```

#### Task 6: Create working-context.ts
- **File:** `src/features/memory/working-context.ts` (new)
- **Action:** Create main assembly function with message scoping
- **Details:**
  ```typescript
  import type {
    AgentId,
    SessionMessage,
    WorkingContext,
    LongTermMemory,
    MessageScopingConfig,
    DEFAULT_SCOPING_CONFIGS,
  } from './types';
  import { fetchLongTermMemory } from './long-term';

  /**
   * Select relevant messages using "last N" strategy
   * Designed for easy replacement with compaction/summary strategy later
   */
  export function selectMessages(
    messages: SessionMessage[],
    agentId: AgentId,
    config?: Partial<MessageScopingConfig>
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const defaultConfig = DEFAULT_SCOPING_CONFIGS[agentId];
    const maxMessages = config?.maxMessages ?? defaultConfig.maxMessages;
    const filter = config?.relevanceFilter ?? defaultConfig.relevanceFilter;

    // Apply optional filter
    let filtered = filter ? messages.filter(filter) : messages;

    // Take last N messages
    const scoped = filtered.slice(-maxMessages);

    // Transform to Vercel AI SDK format (strip metadata)
    return scoped.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  /**
   * Build context injection string for system prompt
   * Includes user profile, goals summary, user patterns
   */
  export function buildContextInjection(memory: LongTermMemory): string {
    const sections: string[] = [];

    // Goals section
    if (memory.goals.length > 0) {
      const goalsList = memory.goals
        .map((g, i) => `${i + 1}. "${g.title}" (${g.goalType})`)
        .join('\n');
      sections.push(`## User's Active Goals\n${goalsList}`);
    } else {
      sections.push(`## User's Active Goals\nNo active goals yet.`);
    }

    // User summary section
    if (memory.userSummary) {
      const parts: string[] = [];
      if (memory.userSummary.patterns.length > 0) {
        parts.push(`**Patterns:** ${memory.userSummary.patterns.join('; ')}`);
      }
      if (memory.userSummary.wins.length > 0) {
        parts.push(`**Past wins:** ${memory.userSummary.wins.join('; ')}`);
      }
      if (memory.userSummary.struggles.length > 0) {
        parts.push(`**Challenges:** ${memory.userSummary.struggles.join('; ')}`);
      }
      if (parts.length > 0) {
        sections.push(`## What You Know About This User\n${parts.join('\n')}`);
      }
    }

    // Engagement section
    const { engagement } = memory;
    if (engagement.daysSinceLastCheckIn !== null) {
      sections.push(
        `## Engagement\n**Status:** ${engagement.status}\n**Days since last check-in:** ${engagement.daysSinceLastCheckIn}`
      );
    } else {
      sections.push(`## Engagement\n**Status:** new user (first conversation)`);
    }

    return sections.join('\n\n');
  }

  /**
   * Stub for expertise module loading
   * Returns empty array - implemented in MA-2.1 (Coach Agent Extraction)
   */
  export function getExpertiseModules(_agentId: AgentId): string[] {
    // TODO: Implement in MA-2.1 - return agent-specific expertise modules
    return [];
  }

  /**
   * Assemble working context for an agent invocation
   * This is the main entry point for the orchestrator
   */
  export async function assembleWorkingContext(
    agentId: AgentId,
    baseSystemPrompt: string,
    sessionMessages: SessionMessage[],
    userId: string,
    scopingConfig?: Partial<MessageScopingConfig>
  ): Promise<WorkingContext> {
    // Fetch long-term memory
    const longTermMemory = await fetchLongTermMemory(userId);

    // Build context injection
    const contextInjection = buildContextInjection(longTermMemory);

    // Get expertise modules (stubbed for now)
    const expertiseModules = getExpertiseModules(agentId);
    const expertiseSection = expertiseModules.length > 0
      ? `\n\n## Expertise\n${expertiseModules.join('\n\n')}`
      : '';

    // Assemble system prompt
    const systemPrompt = `${baseSystemPrompt}\n\n${contextInjection}${expertiseSection}`;

    // Scope messages
    const messages = selectMessages(sessionMessages, agentId, scopingConfig);

    return {
      systemPrompt,
      messages,
      tools: {}, // Placeholder - actual tools defined in agent configs (MA-2.x)
    };
  }
  ```

#### Task 7: Update index.ts exports
- **File:** `src/features/memory/index.ts`
- **Action:** Add exports for new working context functions and types
- **Details:**
  ```typescript
  // Add to existing exports:

  // Working context
  export {
    assembleWorkingContext,
    selectMessages,
    buildContextInjection,
    getExpertiseModules,
  } from './working-context';

  // Long-term memory
  export {
    fetchLongTermMemory,
    getUserProfile,
    getGoalsSummary,
    getEngagementContext,
  } from './long-term';
  ```

### Acceptance Criteria

- [ ] **AC 1:** Given a valid userId, when `fetchLongTermMemory(userId)` is called, then it returns a `LongTermMemory` object with userProfile, goals array, userSummary (or null), and engagement context
- [ ] **AC 2:** Given session messages and an agentId, when `selectMessages(messages, agentId)` is called, then it returns at most `maxMessages` messages in Vercel AI SDK format (role + content only)
- [ ] **AC 3:** Given a LongTermMemory object, when `buildContextInjection(memory)` is called, then it returns a formatted string with goals, user summary (if exists), and engagement status
- [ ] **AC 4:** Given all required parameters, when `assembleWorkingContext(agentId, basePrompt, messages, userId)` is called, then it returns a `WorkingContext` with systemPrompt (base + context injection), scoped messages, and empty tools object
- [ ] **AC 5:** Given an agentId, when `getExpertiseModules(agentId)` is called, then it returns an empty array (stub behavior)
- [ ] **AC 6:** Given a user with no check-ins, when `getEngagementContext(userId)` is called, then it returns `{ status: 'new', daysSinceLastCheckIn: null, lastCheckInAt: null }`
- [ ] **AC 7:** Given a user with a check-in 2 days ago, when `getEngagementContext(userId)` is called, then it returns `{ status: 'engaged', daysSinceLastCheckIn: 2, lastCheckInAt: <iso-string> }`
- [ ] **AC 8:** Given a user with a check-in 10 days ago, when `getEngagementContext(userId)` is called, then it returns `{ status: 'returning', daysSinceLastCheckIn: 10, lastCheckInAt: <iso-string> }`

## Additional Context

### Dependencies

- **Completed:**
  - MA-1.1 Session State Infrastructure - provides SessionMessage type and session storage
  - Existing schema: profiles, goals, checkIns, userSummaries tables
  - `features/ai-coach/summary-repository.ts` - reused for getUserSummaryData

- **External:**
  - drizzle-orm (already installed)
  - No new packages required

### Testing Strategy

Unit tests skipped per user request. Validation approach:
1. Manual testing via future orchestrator integration (MA-2.2)
2. Can verify individual functions via API route or script if needed
3. TypeScript compilation will catch type mismatches

### Notes

**Design Rationale:**
- Message scoping uses strategy pattern to enable future compaction/summary without code changes
- Long-term memory functions are separate for parallel fetching and individual testability
- Context injection follows existing `ai-coach/prompts.ts` pattern for consistency
- Tools placeholder allows orchestrator to inject agent-specific tools

**Future Enhancements:**
- Replace `selectMessages` with `CompactionStrategy` that summarizes older messages
- Add RAG-based check-in retrieval for semantic search
- Implement actual expertise modules in MA-2.1

**Risk Mitigation:**
- Graceful handling of missing profile (provides default)
- Null-safe userSummary handling
- Type-safe message transformation

---

## Review Notes

**Adversarial review completed: 2026-01-19**
**Resolution approach:** Auto-fix real issues

### Findings (12 total, 11 fixed, 1 skipped as noise)

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| F1 | Medium | Fixed | `userProfile` fetched but not used in `buildContextInjection` - added user context section |
| F2 | High | Fixed | No error handling in `fetchLongTermMemory` - wrapped in try/catch, returns ServiceResult |
| F3 | Medium | Fixed | Unsafe type assertion on `goalType` - added runtime validation with schema enum |
| F4 | Low | Fixed | `GoalSummary.status` uses generic string - changed to use `GoalStatus` type |
| F5 | Low | Fixed | Missing `userId` validation - added Zod UUID validation |
| F6 | Low | Fixed | Magic number `ENGAGEMENT_THRESHOLD_DAYS` - added JSDoc explaining rationale |
| F7 | Medium | Fixed | Silent data fabrication when profile missing - now throws explicit error |
| F8 | Low | Skipped | No tests - explicitly skipped per user request in tech-spec |
| F9 | Low | Fixed | Type alias redefinition smell - removed unnecessary re-alias |
| F10 | Medium | Fixed | No limit on goals returned - added `MAX_GOALS_FOR_CONTEXT = 10` limit |
| F11 | Low | Fixed | `WorkingContext.tools` untyped - added TODO comment noting this is intentional placeholder |
| F12 | Low | Fixed | `selectMessages` strips metadata - added JSDoc documenting this design decision |
