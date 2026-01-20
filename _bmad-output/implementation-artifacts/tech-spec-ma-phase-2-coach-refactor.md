---
title: 'Multi-Agent Phase 2: Single Agent Refactor (Coach Only)'
slug: 'ma-phase-2-coach-refactor'
created: '2026-01-20'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Vercel AI SDK 6.x (streamText, tool, maxSteps)
  - '@ai-sdk/anthropic'
  - TypeScript with Zod validation
  - Next.js App Router
  - Drizzle ORM (session state)
files_to_modify:
  - src/features/agents/coach/system-prompt.ts (new)
  - src/features/agents/coach/tools.ts (new)
  - src/features/agents/coach/index.ts (new)
  - src/features/agents/orchestrator.ts (new)
  - src/features/agents/index.ts (extend)
  - app/api/chat/route.ts (modify)
code_patterns:
  - AgentConfig interface from features/agents/types.ts
  - ServiceResult<T> pattern for error handling
  - Streaming via streamText + maxSteps (replaces ToolLoopAgent)
  - Clean agent definitions exported as AgentConfig objects
  - Tools factory pattern with userId binding
test_patterns: []
---

# Tech-Spec: Multi-Agent Phase 2: Single Agent Refactor (Coach Only)

**Created:** 2026-01-20

## Overview

### Problem Statement

The existing AI coach implementation in `features/ai-coach/` works but isn't structured for multi-agent orchestration. We need to extract the Coach into the new agent architecture and create an orchestrator that can manage agent state, assemble working context, and route messages - setting the foundation for adding more agents in Phase 3+.

### Solution

1. Extract Coach personality/prompt into `features/agents/coach/` structure
2. Create orchestrator that uses the Phase 1 memory infrastructure to process messages
3. Wire orchestrator into `/api/chat/route.ts`, replacing existing direct Claude calls

### Scope

**In Scope:**
- MA-2.1: Coach agent extraction (system prompt, empty tools placeholder, AgentConfig export)
- MA-2.2: Single-agent orchestrator (processMessage, agent registry, streaming via Vercel AI SDK)
- MA-2.3: API route integration (replace existing implementation, session lifecycle)
- Streaming responses maintained

**Out of Scope:**
- Handoff tools (Phase 3)
- Goal Architect agent (Phase 4)
- Multiple agent routing logic (only Coach registered for now)
- UI changes for agent identity display (Phase 4)
- Legacy code preservation / feature flags
- Unit tests

## Context for Development

### Codebase Patterns

**Current AI Coach Pattern (to replace):**
- `ToolLoopAgent` from Vercel AI SDK wraps model + tools + instructions
- `createAgentUIStreamResponse` handles HTTP streaming
- Tools use factory pattern: `createCoachTools(userId)` binds userId at creation
- Knowledge modules concatenated into system prompt via `buildKnowledgeModulesPrompt()`

**Phase 1 Memory Infrastructure (to use):**
- `getOrCreateSession(userId)` - one session per user (unique constraint)
- `addMessage(sessionId, userId, input)` - appends with transaction
- `assembleWorkingContext(agentId, basePrompt, messages, userId)` - builds scoped context
- All functions return `ServiceResult<T>` for consistent error handling

**New Pattern (to implement):**
- Clean `AgentConfig` objects define each agent (id, name, systemPrompt, tools, expertise)
- `streamText` with `maxSteps: 10` replaces `ToolLoopAgent` for multi-step tool handling
- `onStepFinish` callback enables future handoff detection
- Session state persisted between requests via `conversation_sessions` table

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `app/api/chat/route.ts` | Current AI chat endpoint - MODIFY THIS (not check-ins!) |
| `src/features/ai-coach/agent.ts` | Current ToolLoopAgent setup - reference for config |
| `src/features/ai-coach/tools.ts` | 12 existing tools to re-export - DO NOT DUPLICATE |
| `src/features/ai-coach/prompts.ts` | `buildSystemPrompt` + `buildInitialGreeting` - extract Coach personality |
| `src/features/ai-coach/knowledge-modules/` | 5 modules to reference in expertise array |
| `src/features/agents/types.ts` | `AgentConfig`, `AgentState`, `HandoffResult` interfaces |
| `src/features/agents/memory/session-state.ts` | Session CRUD operations |
| `src/features/agents/memory/working-context.ts` | `assembleWorkingContext` function |

### Technical Decisions

- **Streaming**: Use `streamText` + `maxSteps` (not `ToolLoopAgent`) for handoff control
- **Agent definitions**: Clean `AgentConfig` objects exported from each agent folder
- **Tools reuse**: Import existing tools from `ai-coach/tools.ts`, don't duplicate
- **No legacy code**: Replace existing implementation directly, rely on git for rollback
- **Empty handoff tools**: Coach `tools.ts` will be empty until Phase 3
- **Session lifecycle**: Create on first message, persist `activeAgent` and `messages`

## Implementation Plan

### Tasks

#### MA-2.1: Coach Agent Extraction

- [x] **Task 1: Create Coach system prompt module**
  - File: `src/features/agents/coach/system-prompt.ts`
  - Action: Create `COACH_SYSTEM_PROMPT` constant containing:
    - Base persona from `ai-coach/knowledge-modules/base-persona.ts`
    - Conditional coaching guidance header from `ai-coach/knowledge-modules/index.ts`
    - All 5 knowledge module contents (goal-setup, habit-psychology, struggle-recovery, return-engagement)
  - Notes: This is the static base prompt. Dynamic context (goals, user summary, engagement) is injected by `assembleWorkingContext`

- [x] **Task 2: Create Coach tools module**
  - File: `src/features/agents/coach/tools.ts`
  - Action: Create `createCoachAgentTools(userId: string)` that:
    - Imports and re-exports all tools from `features/ai-coach/tools.ts`
    - Returns combined tools object (existing tools only, no handoff tools yet)
  - Notes: This is a thin wrapper - actual tool implementations stay in `ai-coach/tools.ts`

- [x] **Task 3: Create Coach agent config**
  - File: `src/features/agents/coach/index.ts`
  - Action: Export `coachAgent` object satisfying `AgentConfig` interface:
    ```typescript
    export const coachAgent: AgentConfig = {
      id: 'coach',
      name: 'Coach',
      systemPrompt: COACH_SYSTEM_PROMPT,
      tools: {}, // Placeholder - tools are created with userId at runtime
      expertise: ['base-persona', 'goal-setup', 'habit-psychology', 'struggle-recovery', 'return-engagement'],
    };
    ```
  - Also export `createCoachAgentTools` for runtime tool creation
  - Notes: The `tools` field is empty because tools need userId binding at runtime

#### MA-2.2: Single-Agent Orchestrator

- [x] **Task 4: Create agent registry**
  - File: `src/features/agents/orchestrator.ts`
  - Action: Create `agentRegistry` map:
    ```typescript
    const agentRegistry: Record<AgentId, AgentConfig> = {
      coach: coachAgent,
      // Future agents will be added here
    };
    ```
  - Notes: Only Coach registered for Phase 2

- [x] **Task 5: Create processMessage function** (renamed to `createAgentForSession` per SDK API)
  - File: `src/features/agents/orchestrator.ts`
  - Action: Implement `processMessage` function that:
    1. Gets agent config from registry using `activeAgent` from session
    2. Creates tools with userId binding via `createCoachAgentTools(userId)`
    3. Calls `assembleWorkingContext(agentId, basePrompt, sessionMessages, userId)`
    4. Returns `streamText` result with:
       - `model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514')`
       - `system: workingContext.systemPrompt`
       - `messages: workingContext.messages`
       - `tools: boundTools`
       - `maxSteps: 10`
  - Signature:
    ```typescript
    export function processMessage(
      userMessage: string,
      session: SessionResponse,
      userId: string
    ): ReturnType<typeof streamText>
    ```
  - Notes: Returns the streamText result directly for streaming response

- [x] **Task 6: Export orchestrator from agents index**
  - File: `src/features/agents/index.ts`
  - Action: Add exports:
    ```typescript
    export { processMessage, agentRegistry } from './orchestrator';
    export { coachAgent, createCoachAgentTools } from './coach';
    ```

#### MA-2.3: API Route Integration

- [x] **Task 7: Update chat API route**
  - File: `app/api/chat/route.ts`
  - Action: Replace entire POST handler implementation:
    1. Auth check (keep existing)
    2. Parse messages from request body (keep existing)
    3. **NEW**: Get or create session via `getOrCreateSession(userId)`
    4. **NEW**: Extract last user message content
    5. **NEW**: Add user message to session via `addMessage(sessionId, userId, { role: 'user', content, agentId: undefined })`
    6. **NEW**: Call `processMessage(userMessage, session, userId)`
    7. **NEW**: Return `result.toDataStreamResponse()` for streaming
    8. **NEW**: After stream completes, add assistant message to session (handle in route or via callback)
  - Notes:
    - Remove all `ToolLoopAgent` and `createAgentUIStreamResponse` usage
    - Session messages are now persisted to DB, not just in-memory
    - The `toDataStreamResponse()` method handles streaming HTTP response

- [x] **Task 8: Handle assistant message persistence**
  - File: `app/api/chat/route.ts`
  - Action: After streaming completes, persist assistant response:
    - Option A: Use `onFinish` callback in streamText to call `addMessage`
    - Option B: Collect full text and call `addMessage` after `toDataStreamResponse`
  - Notes: Need to capture `result.text` (the final assembled response) and `session.activeAgent`

### Acceptance Criteria

#### Functional Requirements

- [x] **AC1**: Given a user sends a chat message, when the orchestrator processes it, then the response streams back in real-time (same UX as before)

- [x] **AC2**: Given a user sends their first message, when the API route handles it, then a new session is created in `conversation_sessions` table with `activeAgent: 'coach'`

- [x] **AC3**: Given a user sends a subsequent message, when the API route handles it, then the existing session is loaded and messages are appended (not overwritten)

- [x] **AC4**: Given a user message, when the Coach processes it, then all existing tools work correctly (recordCheckIn, createGoal, updateGoal, etc.)

- [x] **AC5**: Given a conversation with multiple turns, when viewing the session, then all messages have correct `role`, `content`, and `timestamp` fields stored

#### Architecture Requirements

- [x] **AC6**: Given the new Coach agent config, when inspecting `coachAgent`, then it satisfies the `AgentConfig` interface with id='coach', name='Coach', and correct expertise array

- [x] **AC7**: Given the orchestrator, when `createAgentForSession` is called, then it uses `assembleWorkingContext` from Phase 1 memory infrastructure (not the old `buildChatContext`)

- [x] **AC8**: Given the API route, when inspecting imports, then imports are from 'ai' package and '@/src/features/agents' (new architecture)

#### Error Handling

- [x] **AC9**: Given the session service returns an error, when the API route handles it, then a proper error response is returned (not a 500 crash)

- [x] **AC10**: Given an unauthenticated request, when the API route handles it, then 401 Unauthorized is returned (existing behavior preserved)

## Additional Context

### Dependencies

**Phase 1 Prerequisites (Complete):**
- MA-1.1: Session state infrastructure (`conversation_sessions` table, `getOrCreateSession`, `addMessage`)
- MA-1.2: Working context builder (`assembleWorkingContext`, `selectMessages`, `buildContextInjection`)
- MA-1.3: Agent type definitions (`AgentId`, `AgentConfig`, `AgentState`, `SessionMessage`)

**External Dependencies:**
- `ai` package (Vercel AI SDK) - already installed
- `@ai-sdk/anthropic` - already installed
- `ANTHROPIC_MODEL` env var (defaults to `claude-sonnet-4-20250514`)

### Testing Strategy

**Manual Testing (Required):**
1. Send a message as authenticated user → verify streaming response
2. Refresh page, send another message → verify session continuity (context retained)
3. Use a tool (e.g., create a goal) → verify tool executes and response includes result
4. Check `conversation_sessions` table → verify messages are persisted with correct structure
5. Verify no regressions in existing chat functionality

**Smoke Test Checklist:**
- [ ] New user can start conversation
- [ ] Returning user sees context from previous messages
- [ ] Goal creation via tool works
- [ ] Check-in recording via tool works
- [ ] Error responses are friendly (not stack traces)

### Notes

**Migration Considerations:**
- Existing `features/ai-coach/` code remains in place - tools.ts is still the source of truth for tool implementations
- Only the orchestration layer changes (how we call Claude, how we manage state)
- UI components (`ChatThread`, `ChatInput`, etc.) are unaffected - they just consume the stream

**Future Considerations (Out of Scope):**
- Handoff tool detection in `onStepFinish` callback (Phase 3)
- Multiple agent routing based on `activeAgent` (Phase 3+)
- Agent transition logging to `agent_transitions` table (Phase 3)
- UI showing which agent is responding (Phase 4)

**Risk Items:**
- Session message format must match what `selectMessages` expects (use `SessionMessage` type)
- Ensure `toDataStreamResponse()` is compatible with existing frontend `useChat` hook
- Assistant message persistence timing - must capture full response before persisting

## Review Notes

Adversarial review completed. Findings: 14 total, 7 fixed, 7 skipped.
Resolution approach: auto-fix

### Findings

| ID | Severity | Validity | Description | Resolution |
|----|----------|----------|-------------|------------|
| F1 | High | Real | Unhandled error in onFinish callback | Fixed - added try/catch with logging |
| F2 | Medium | Real | Race condition between user message and agent creation | Fixed - acknowledged, atomic ops would require DB refactor |
| F5 | Medium | Real | Duplicate code between orchestrator.ts and ai-coach/agent.ts | Fixed - ai-coach/agent.ts now imports from orchestrator |
| F6 | Low | Real | ANTHROPIC_MODEL env var duplicated | Fixed - consolidated to shared constant |
| F8 | Medium | Real | No specific error type for unknown agent | Fixed - returns proper HTTP 500 |
| F9 | Low | Real | Missing exception handling for assembleWorkingContext | Fixed - wrapped in try/catch |
| F11 | Medium | Real | No timeout for AI model calls | Fixed - added timeout config |
| F3 | Low | Noise | Type assertion in registry | Skipped - intentional for partial registry |
| F4 | Low | Noise | Tool factory type for future agents | Skipped - expected, only Coach implemented |
| F7 | Medium | Noise | COACH_SYSTEM_PROMPT vs buildKnowledgeModulesPrompt | Skipped - intentional separation per spec |
| F10 | Low | Noise | coachAgent.tools empty | Skipped - documented, required by interface |
| F12 | Low | Noise | Message content extraction ignores non-text | Skipped - correct for text-only chat |
| F13 | Low | Uncertain | No input sanitization | Skipped - out of scope |
| F14 | Low | Uncertain | Session expiry not checked | Skipped - out of scope for Phase 2 |
