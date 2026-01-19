---
title: 'Agent Type Definitions'
slug: 'agent-type-definitions'
created: '2026-01-19'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript 5.x (strict mode)
  - Vercel AI SDK 6.x (tool types via 'ai' package)
files_to_modify:
  - src/features/agents/ (new directory)
  - src/features/agents/memory/ (moved from src/features/memory/)
  - src/features/agents/types.ts (new)
  - src/features/agents/index.ts (new)
  - _bmad-output/planning-artifacts/architecture.md (update)
code_patterns:
  - Discriminated unions for result types (ServiceResult<T>)
  - Re-export shared types through barrel exports
  - Tool factory pattern with userId binding
  - 'ReturnType<typeof tool>' for tool type references
test_patterns:
  - Type-level validation via TypeScript compiler
  - No runtime tests needed for pure type definitions
---

# Tech-Spec: Agent Type Definitions

**Created:** 2026-01-19
**Spec ID:** MA-1.3

## Overview

### Problem Statement

The multi-agent orchestrator (Phase 2) needs TypeScript types to define agent configurations, state management, and handoff mechanisms. Additionally, `features/memory/` and `features/agents/` are tightly coupled but currently structured as siblings. Memory exists primarily to serve the agent system, so it should be a subdirectory of agents.

### Solution

1. **Restructure:** Move `features/memory/` to `features/agents/memory/`
2. **Update architecture doc** to reflect the new structure
3. **Create agent types:** `AgentState`, `AgentConfig`, `HandoffResult`, `AgentResponse` in `features/agents/types.ts`

### Scope

**In Scope:**
- Move `features/memory/` → `features/agents/memory/`
- Update architecture.md with new project structure
- Create `AgentState`, `AgentConfig`, `HandoffResult`, `AgentResponse` interfaces
- Create barrel exports for clean imports

**Out of Scope:**
- Orchestrator implementation (MA-2.2)
- Actual agent configs/system prompts (MA-2.1, MA-4.1)
- Tool implementations (MA-3.1)

## Context for Development

### Current State

```
features/
├── memory/           # Currently a sibling - should be under agents
│   ├── types.ts      # Has AgentId, SessionMessage, WorkingContext
│   ├── session-state.ts
│   ├── working-context.ts
│   ├── long-term/
│   └── index.ts
└── (no agents/ yet)
```

### Target State

```
features/
└── agents/
    ├── types.ts           # NEW: AgentState, AgentConfig, HandoffResult, AgentResponse
    ├── index.ts           # NEW: Barrel export for agents + re-export memory
    └── memory/            # MOVED from features/memory/
        ├── types.ts       # Existing: AgentId, SessionMessage, WorkingContext
        ├── session-state.ts
        ├── working-context.ts
        ├── long-term/
        └── index.ts
```

### Why This Structure

- **Memory serves agents:** Working context, session state, and long-term memory all exist to support the agent orchestrator
- **Cohesive feature:** Everything agent-related in one place
- **Clean imports:** `import { AgentConfig, assembleWorkingContext } from '@/src/features/agents'`
- **No external consumers yet:** Memory module was just implemented, no imports to update

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/memory/types.ts` | Existing types to preserve (AgentId, WorkingContext, etc.) |
| `src/features/memory/index.ts` | Current barrel export pattern |
| `architecture.md:770-811` | Current project structure to update |
| `architecture.md:634-709` | Canonical type definitions from Decision 10 |

### Technical Decisions

1. **Memory as subdirectory:** Memory becomes `agents/memory/` not a sibling
2. **Two type files:** `agents/types.ts` (orchestration types) + `agents/memory/types.ts` (memory types)
3. **Re-exports:** `agents/index.ts` re-exports everything from `agents/memory/` for convenience
4. **No import updates needed:** Memory has no external consumers yet

## Implementation Plan

### Tasks

- [x] **Task 1:** Create agents directory and move memory
  - Action: `mkdir src/features/agents && mv src/features/memory src/features/agents/`
  - Notes: Git will track the move, preserving history

- [x] **Task 2:** Update architecture.md project structure
  - File: `_bmad-output/planning-artifacts/architecture.md`
  - Action: Update Decision 3 (Project Structure) and the complete directory tree to show:
    ```
    features/
    └── agents/                   # Multi-Agent System
        ├── types.ts              # AgentState, AgentConfig, HandoffResult, AgentResponse
        ├── index.ts              # Barrel export
        ├── orchestrator.ts       # (future: MA-2.2)
        ├── shared-tools.ts       # (future: MA-3.1)
        ├── memory/               # Three-Tier Memory System
        │   ├── types.ts          # AgentId, WorkingContext, SessionMessage, etc.
        │   ├── session-state.ts
        │   ├── working-context.ts
        │   ├── long-term/
        │   └── index.ts
        ├── coach/                # (future: MA-2.1)
        └── goal-architect/       # (future: MA-4.1)
    ```
  - Notes: Update both Decision 3 section and the complete project structure section

- [x] **Task 3:** Create agents/types.ts with orchestration types
  - File: `src/features/agents/types.ts` (new)
  - Action: Create file with:
    ```typescript
    import { tool } from 'ai';

    // Re-export memory types for convenience
    export type {
      AgentId,
      SessionMessage,
      AgentTransition,
      WorkingContext,
      LongTermMemory,
      MessageScopingConfig,
    } from './memory/types';

    // Re-export the AgentId values array
    export { AGENT_IDS } from './memory/types';

    /**
     * Runtime state for the agent orchestrator.
     * Tracks which agent is active and transition history.
     */
    export interface AgentState {
      activeAgent: AgentId;
      transitionHistory: Array<{
        from: AgentId;
        to: AgentId;
        reason: string;
        timestamp: Date;
      }>;
    }

    /**
     * Configuration for an agent.
     * Defines personality, capabilities, and behavior.
     */
    export interface AgentConfig {
      id: AgentId;
      name: string;  // Display name for UI (e.g., "Coach", "Goal Architect")
      systemPrompt: string;
      tools: Record<string, ReturnType<typeof tool>>;
      expertise: string[];  // Knowledge module IDs to include in context
      messageFilter?: (message: SessionMessage) => boolean;  // For scoped context
    }

    /**
     * Return type for handoff tools.
     * When a tool returns this shape, the orchestrator triggers agent transition.
     */
    export interface HandoffResult {
      handoff: AgentId;
      reason: string;
      context?: string;  // Optional context to pass to target agent
      announcement: string;  // Message shown to user (e.g., "Let me bring in the Goal Architect...")
    }

    /**
     * Response from the orchestrator after processing a message.
     */
    export interface AgentResponse {
      text: string;
      agentId: AgentId;
      toolResults?: unknown[];  // Vercel AI SDK tool results
    }
    ```
  - Notes: Import `tool` from 'ai' package for proper typing

- [x] **Task 4:** Create agents/index.ts barrel export
  - File: `src/features/agents/index.ts` (new)
  - Action: Create barrel export:
    ```typescript
    // Agent orchestration types
    export type {
      AgentId,
      AgentState,
      AgentConfig,
      HandoffResult,
      AgentResponse,
      SessionMessage,
      AgentTransition,
      WorkingContext,
      LongTermMemory,
    } from './types';

    export { AGENT_IDS } from './types';

    // Re-export memory services for convenience
    export {
      // Session state
      getOrCreateSession,
      getSession,
      getSessionByUserId,
      updateActiveAgent,
      addMessage,
      recordTransition,
      clearSession,
      // Working context
      assembleWorkingContext,
      selectMessages,
      buildContextInjection,
      // Long-term memory
      fetchLongTermMemory,
      getUserProfile,
      getGoalsSummary,
      getEngagementContext,
    } from './memory';
    ```
  - Notes: Single import point for all agent-related functionality

- [x] **Task 5:** Verify TypeScript compilation
  - Action: Run `npm run build` in `resolution-tracker/` directory
  - Notes: Ensures all imports resolve and types compile

### Acceptance Criteria

- [x] **AC 1:** Given the restructure is complete, when looking at `src/features/`, then `memory/` no longer exists as a top-level directory and `agents/memory/` contains all memory files

- [x] **AC 2:** Given `agents/types.ts` exists, when importing `AgentId` from it, then it is the same type as from `agents/memory/types.ts` (re-exported, not duplicated)

- [x] **AC 3:** Given `AgentConfig` interface is defined, when creating a config object, then it requires `id`, `name`, `systemPrompt`, `tools`, and `expertise` fields

- [x] **AC 4:** Given `HandoffResult` interface is defined, when a handoff tool returns, then it must include `handoff`, `reason`, and `announcement` fields

- [x] **AC 5:** Given `AgentState` interface is defined, when tracking state, then `transitionHistory` entries have `from`, `to`, `reason`, and `timestamp` (Date) fields

- [x] **AC 6:** Given the barrel export exists, when importing from `@/src/features/agents`, then both types (`AgentConfig`) and services (`assembleWorkingContext`) are accessible

- [x] **AC 7:** Given all changes are complete, when running `npm run build`, then TypeScript compilation succeeds

- [x] **AC 8:** Given the architecture doc is updated, when reading Decision 3 and the project structure, then they show `agents/memory/` structure (not `memory/` as sibling)

## Additional Context

### Dependencies

**Required (already installed):**
- `ai` package (Vercel AI SDK) - for `tool` type import
- TypeScript 5.x - for type definitions

**Depends on (already implemented):**
- MA-1.1: Session state infrastructure (will be moved)
- MA-1.2: Working context builder (will be moved)

**Depended on by (future specs):**
- MA-2.1: Coach Agent Extraction (will use `AgentConfig`)
- MA-2.2: Single-Agent Orchestrator (will use `AgentState`, `AgentResponse`)
- MA-3.1: Handoff Tool Pattern (will use `HandoffResult`)

### Testing Strategy

**Compile-time validation:**
- TypeScript strict mode catches type errors and broken imports
- `npm run build` is the verification step

**Manual verification:**
- Confirm `features/memory/` no longer exists
- Confirm `features/agents/memory/` contains all files
- Verify IDE autocomplete works for new types

### Notes

**Why restructure now:**
- Memory has no external consumers yet (clean move)
- Prevents awkward cross-imports between memory and agents
- Sets up clean architecture for Phase 2+

**Git considerations:**
- Use `git mv` or the filesystem move will be tracked correctly by git
- Commit the move separately from new files for clean history (optional)

**Future agent directories:**
- `agents/coach/` - MA-2.1
- `agents/goal-architect/` - MA-4.1
- `agents/orchestrator.ts` - MA-2.2
- `agents/shared-tools.ts` - MA-3.1

## Review Notes

- Adversarial review completed
- Findings: 14 total, 4 fixed, 10 skipped (noise/out-of-scope)
- Resolution approach: auto-fix

**Fixed Issues:**
- F1: Changed `import { tool }` to `import type { tool }` (type-only import)
- F2: Removed redundant AgentId local type declaration
- F3: Changed `timestamp: Date` to `timestamp: string` to match DB schema
- F6: Added `DEFAULT_SCOPING_CONFIGS` and `MessageScopingConfig` to barrel exports

**Skipped (noise/intentional design):**
- F4-F5, F7-F10, F13-F14: Types are intentionally designed per spec, test strategy is compile-time, toolResults typing deferred to MA-2.x per TODO
