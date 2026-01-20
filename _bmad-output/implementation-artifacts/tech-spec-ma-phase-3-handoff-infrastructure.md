---
title: 'Multi-Agent Handoff Infrastructure (Phase 3)'
slug: 'ma-phase-3-handoff-infrastructure'
created: '2026-01-20'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Vercel AI SDK 6.x (ToolLoopAgent, tool(), createAgentUIStreamResponse)
  - TypeScript (strict mode)
  - Drizzle ORM
  - Zod (schema validation)
  - Next.js 16.x App Router
files_to_modify:
  - src/features/agents/shared-tools.ts (new)
  - src/features/agents/coach/tools.ts (modify)
  - app/api/chat/route.ts (modify)
  - src/features/agents/orchestrator.ts (modify)
  - src/features/agents/goal-architect/index.ts (new - placeholder)
code_patterns:
  - Tool factory with userId binding: createXTools(userId) returns Record<string, tool>
  - Post-stream processing in onFinish callback
  - Session state via recordTransition() with Drizzle transaction
  - AgentId type from activeAgentEnum (single source of truth in schema)
test_patterns:
  - No tests currently exist in src/ (project-context says co-locate but none written)
  - Tests deferred - focus on implementation
---

# Tech-Spec: Multi-Agent Handoff Infrastructure (Phase 3)

**Created:** 2026-01-20

## Overview

### Problem Statement

The orchestrator currently supports only one agent (Coach). When users express goal-setting intent (e.g., "I want to start exercising"), Coach should hand off to the Goal Architect agent seamlessly. There's no mechanism for agents to trigger transitions or for the orchestrator to detect and process handoffs.

### Solution

Create a handoff tool factory that agents can use to request transitions, update the chat API's `onFinish` callback to detect handoff results after streaming completes, and update session state to route subsequent messages to the new active agent. The announcement text is generated naturally by the handing-off agent as part of its response.

### Scope

**In Scope:**
- `createHandoffTool(targetAgent, config)` factory function in new `shared-tools.ts`
- Add `transferToGoalArchitect` tool to Coach agent
- Update `onFinish` callback in chat API to detect handoff results
- Update session `activeAgent` when handoff detected via `recordTransition()`
- Register placeholder Goal Architect in orchestrator (for routing, not full implementation)
- Add `returnToCoach` as shared tool pattern for specialists

**Out of Scope:**
- Goal Architect agent implementation (Phase 4 - MA-4.1)
- Separate `agent_transitions` database table (JSONB in session is sufficient for MVP)
- Mid-stream agent switching (not supported by Vercel AI SDK architecture)
- UI changes for agent identity display (Phase 4 - MA-4.3)
- Other specialist agents (Motivator, Pattern Analyst, etc.)

## Context for Development

### Codebase Patterns

- **Tool Factory Pattern**: Tools are created with `tool()` from Vercel AI SDK, taking `description`, `inputSchema` (Zod), and `execute` function. Factory functions like `createCoachTools(userId)` bind userId and return `Record<string, tool>`.

- **Session State Updates**: Use `recordTransition()` from `session-state.ts` which atomically updates `activeAgent` and appends to `agentTransitions` array using Drizzle transaction.

- **Post-Stream Processing**: The `onFinish` callback in `createAgentUIStreamResponse` fires after stream completes, receives `responseMessage` with `parts` array. Currently only extracts text parts - needs extension for tool result detection.

- **Agent Registry**: `agentRegistry` in orchestrator maps `AgentId` to `AgentConfig`. Parallel `toolFactoryRegistry` maps `AgentId` to tool factory functions.

- **Type Sources**: `AgentId` derived from `activeAgentEnum` in schema.ts (single source of truth). `HandoffResult` already defined in `types.ts`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/agents/orchestrator.ts:38-54` | Agent registry and tool factory registry |
| `src/features/agents/types.ts:48-53` | HandoffResult interface (already defined) |
| `src/features/agents/coach/tools.ts` | Thin wrapper, add transferToGoalArchitect here |
| `src/features/agents/memory/session-state.ts:191-253` | recordTransition() implementation |
| `app/api/chat/route.ts:100-125` | onFinish callback - modify for handoff detection |
| `src/features/ai-coach/tools.ts:66-476` | Tool factory pattern reference |
| `src/features/agents/memory/types.ts:38-41` | recordTransitionInputSchema |

### Technical Decisions

1. **Post-stream handoff detection**: Handoffs are detected in `onFinish` after the stream completes, not mid-stream. The `responseMessage.parts` array contains tool results - scan for `HandoffResult` shape.

2. **Natural announcements**: The handing-off agent generates announcement text as part of its response (e.g., "Let me bring in the Goal Architect...") before calling the handoff tool. No injection needed - LLM naturally explains before tool calls.

3. **Session-based routing**: Next user message automatically goes to new agent because session's `activeAgent` was updated via `recordTransition()`.

4. **No separate transitions table**: The `agentTransitions` JSONB array in `conversation_sessions` is sufficient for MVP. Can add dedicated table later for analytics.

5. **Placeholder Goal Architect**: Create minimal `AgentConfig` for Goal Architect (id, name, empty tools, basic system prompt) to enable end-to-end handoff testing. Full implementation is Phase 4.

## Implementation Plan

### Tasks

#### Task 1: Create Handoff Tool Factory

- **File:** `src/features/agents/shared-tools.ts` (new)
- **Action:** Create factory function that generates handoff tools for any target agent
- **Details:**
  ```typescript
  // Export createHandoffTool factory
  export function createHandoffTool(
    targetAgent: AgentId,
    config: {
      description: string;  // When LLM should use this tool
      reasonDescription?: string;  // Description for reason param
    }
  ): ReturnType<typeof tool>
  ```
- **Implementation:**
  - Import `tool` from 'ai', `z` from 'zod', `AgentId` and `HandoffResult` from types
  - Tool input schema: `{ reason: z.string(), context: z.string().optional() }`
  - Execute function returns `HandoffResult` with `handoff: targetAgent`
  - Generate announcement text: `"Switching to ${agentDisplayName}..."`
  - Export `AGENT_DISPLAY_NAMES` map for human-readable names

#### Task 2: Create Placeholder Goal Architect Agent

- **File:** `src/features/agents/goal-architect/index.ts` (new)
- **Action:** Create minimal AgentConfig for Goal Architect to enable handoff routing
- **Details:**
  - Create directory `src/features/agents/goal-architect/`
  - Export `goalArchitectAgent: AgentConfig` with:
    - `id: 'goalArchitect'`
    - `name: 'Goal Architect'`
    - `systemPrompt`: Basic placeholder prompt acknowledging handoff
    - `tools: {}` (empty - full tools in Phase 4)
    - `expertise: []`
  - Export `createGoalArchitectTools(userId)` returning `returnToCoach` tool only

#### Task 3: Register Goal Architect in Orchestrator

- **File:** `src/features/agents/orchestrator.ts` (modify)
- **Action:** Add Goal Architect to agent registry and tool factory registry
- **Details:**
  - Import `goalArchitectAgent, createGoalArchitectTools` from `./goal-architect`
  - Add to `agentRegistry`: `goalArchitect: goalArchitectAgent`
  - Add to `toolFactoryRegistry`: `goalArchitect: createGoalArchitectTools`
  - Remove `as Record<AgentId, ...>` casts (now both agents registered)

#### Task 4: Add Handoff Tool to Coach

- **File:** `src/features/agents/coach/tools.ts` (modify)
- **Action:** Add `transferToGoalArchitect` tool using the factory
- **Details:**
  - Import `createHandoffTool` from `../shared-tools`
  - Create tool with description:
    ```
    "Transfer to Goal Architect when user wants to: create a new goal,
    restructure an existing goal, turn a vague intention into a concrete goal,
    or explicitly asks to speak with the Goal Architect."
    ```
  - Add to returned tools object from `createCoachAgentTools`

#### Task 5: Add Handoff Detection to Chat API

- **File:** `app/api/chat/route.ts` (modify)
- **Action:** Detect handoff results in `onFinish` and update session state
- **Details:**
  - Import `recordTransition` from session-state
  - Import `HandoffResult` type
  - Create helper function `findHandoffResult(parts)` to scan for handoff tool results
  - In `onFinish` callback, after saving assistant message:
    1. Call `findHandoffResult(responseMessage.parts)`
    2. If handoff found, call `recordTransition(session.id, user.id, { to: handoff.handoff, reason: handoff.reason })`
    3. Log transition for debugging
  - Handle errors gracefully (log but don't throw - user already got response)

#### Task 6: Export Shared Tools from Index

- **File:** `src/features/agents/index.ts` (modify)
- **Action:** Export shared tools for external use
- **Details:**
  - Add export: `export { createHandoffTool, AGENT_DISPLAY_NAMES } from './shared-tools'`

### Acceptance Criteria

- [ ] **AC1:** Given Coach is active, when user says "I want to start a new exercise habit", then Coach calls `transferToGoalArchitect` tool and response includes announcement text.

- [ ] **AC2:** Given a handoff tool returns `HandoffResult`, when `onFinish` callback runs, then `recordTransition()` is called with correct `to` agent and `reason`.

- [ ] **AC3:** Given a handoff occurred in previous request, when user sends next message, then the message is processed by the new agent (Goal Architect).

- [ ] **AC4:** Given Goal Architect is active, when user says "I'm done setting up my goal", then Goal Architect calls `returnToCoach` tool and session returns to Coach.

- [ ] **AC5:** Given handoff detection fails (e.g., DB error), when `onFinish` runs, then error is logged but user response is not affected (graceful degradation).

- [ ] **AC6:** Given `createHandoffTool` is called with `'goalArchitect'`, when tool executes, then it returns valid `HandoffResult` with `handoff: 'goalArchitect'`.

- [ ] **AC7:** Given Goal Architect placeholder is registered, when `createAgentForSession` is called with `activeAgent: 'goalArchitect'`, then agent is created without error.

## Additional Context

### Dependencies

- **Phase 2 Complete**: Coach agent extraction and single-agent orchestrator must be working
- **Existing Infrastructure**:
  - `HandoffResult` type in `types.ts` (already defined)
  - `recordTransition()` in `session-state.ts` (already implemented)
  - `AgentConfig` interface (already defined)
  - `activeAgentEnum` includes 'goalArchitect' (already in schema)

### Testing Strategy

**Manual Testing Flow:**
1. Start conversation with Coach
2. Say "I want to start exercising regularly"
3. Verify Coach responds with announcement and calls handoff tool
4. Check database: session `activeAgent` should be 'goalArchitect'
5. Send follow-up message
6. Verify Goal Architect responds (placeholder response is fine)
7. Say "I'm done, take me back to Coach"
8. Verify return to Coach works

**Debug Logging:**
- Add `console.log` in `onFinish` when handoff detected
- Log transition details: from, to, reason

**Future Tests (out of scope for this spec):**
- Unit test for `createHandoffTool` factory
- Unit test for `findHandoffResult` helper
- Integration test for full handoff flow

### Notes

- **Phase 4 Dependency**: This spec creates infrastructure. Phase 4 (MA-4.1) will flesh out Goal Architect with real system prompt, tools, and expertise modules.

- **Announcement UX**: The LLM naturally generates explanation text before calling tools. We rely on this behavior rather than injecting announcements. If announcements feel robotic, adjust tool descriptions in Phase 4.

- **Error Recovery**: If handoff detection fails, user is unaffected (they got their response). Next message will still go to Coach (activeAgent unchanged). This is acceptable for MVP.

- **Future Handoffs**: The `createHandoffTool` factory makes adding new handoffs trivial. For Pattern Analyst: `createHandoffTool('patternAnalyst', { description: '...' })`.

## Review Notes

**Adversarial Review Completed:** 2026-01-20

### Findings Summary

| ID | Severity | Validity | Description | Resolution |
|----|----------|----------|-------------|------------|
| F1 | Medium | Real | Missing `context` field propagation in recordTransition | Fixed |
| F2 | High | Real | Type guard validates handoff as string, should validate AgentId | Fixed |
| F3 | High | Undecided | Race condition - session state stale during handoff | Deferred (acceptable for MVP) |
| F4 | Medium | Noise | Multiple handoffs in single response not handled | Skipped (unlikely scenario) |
| F5 | Medium | Real | AGENT_DISPLAY_NAMES returns undefined for unregistered agents | Fixed |
| F6 | Medium | Noise | No rate limiting on handoff tool | Skipped (out of scope for MVP) |
| F7 | Low | Noise | Goal Architect prompt promises nonexistent functionality | Skipped (intentional placeholder) |
| F8 | Low | Noise | Unused _userId parameter | Skipped (Phase 4 will use) |
| F9 | Medium | Noise | ToolFactory uses `any` type | Skipped (Vercel AI SDK complexity) |
| F10 | High | Real | getRegisteredAgentIds return type misleading | Fixed |
| F11 | High | Real | No validation target agent is registered before handoff | Fixed |
| F12 | High | Real | Assistant message saved with wrong agentId after handoff | Fixed |

**Resolution Approach:** Auto-fix real findings (F1, F2, F5, F10, F11, F12)
**Total Findings:** 12 (6 fixed, 6 skipped as noise/deferred)
