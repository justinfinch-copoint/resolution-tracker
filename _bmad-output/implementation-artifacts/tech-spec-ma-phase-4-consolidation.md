---
title: 'Multi-Agent Phase 4: Agent Consolidation & Visible Handoffs'
slug: 'ma-phase-4-consolidation'
created: '2026-01-20'
status: 'completed'
stepsCompleted: [1, 2, 3, 4, 5]
tech_stack:
  - TypeScript 5.x (strict mode)
  - React 19 / Next.js 16.x
  - Vercel AI SDK 6.x (useChat, createAgentUIStreamResponse)
  - Tailwind CSS 3.x
  - shadcn/ui components
  - Drizzle ORM (session state)
  - Zod (validation)
files_to_modify:
  # New files - Chat feature (move from ai-coach/components/)
  - src/features/chat/components/chat-thread.tsx (move + modify for agentId)
  - src/features/chat/components/chat-input.tsx (move)
  - src/features/chat/components/terminal-line.tsx (move + modify for agentId)
  - src/features/chat/components/chat-error-boundary.tsx (move)
  - src/features/chat/types.ts (new - getTextFromParts helper, ChatContext)
  - src/features/chat/index.ts (new - barrel export)
  # New files - Agent expertise
  - src/features/agents/shared/base-persona.ts (move from ai-coach/knowledge-modules/)
  - src/features/agents/coach/expertise/habit-psychology.ts (move)
  - src/features/agents/coach/expertise/struggle-recovery.ts (move)
  - src/features/agents/coach/expertise/return-engagement.ts (move)
  - src/features/agents/coach/expertise/index.ts (new - barrel export)
  - src/features/agents/coach/greeting.ts (new - buildInitialGreeting)
  - src/features/agents/goal-architect/expertise/implementation-intentions.ts (new)
  - src/features/agents/goal-architect/expertise/smart-criteria.ts (new)
  - src/features/agents/goal-architect/expertise/goal-types.ts (new)
  - src/features/agents/goal-architect/expertise/index.ts (new - barrel export)
  - src/features/agents/goal-architect/system-prompt.ts (new - separate from index)
  - src/features/agents/goal-architect/tools.ts (new - separate from index)
  # New files - Memory layer additions
  - src/features/agents/memory/long-term/user-summary.ts (move from ai-coach/summary-repository.ts)
  - src/features/agents/memory/chat-context.ts (new - buildChatContext)
  # Modify existing
  - src/features/agents/coach/system-prompt.ts (update imports to ./expertise/)
  - src/features/agents/coach/tools.ts (move tool definitions inline, remove ai-coach import)
  - src/features/agents/goal-architect/index.ts (refactor to import from ./system-prompt, ./tools)
  - src/features/agents/memory/long-term/index.ts (update import to ./user-summary)
  - src/features/agents/memory/index.ts (export buildChatContext)
  - src/features/agents/index.ts (export new functions)
  - app/(protected)/chat/page.tsx (update import to @/src/features/chat)
  - app/api/chat/route.ts (add X-Active-Agent header)
  - app/api/chat/greeting/route.ts (update imports to agents/coach, agents/memory)
  # Delete (after all migrations complete)
  - src/features/ai-coach/ (entire directory - 18 files)
code_patterns:
  - Agent expertise modules: ~200-400 tokens each, conditionally included
  - Terminal UI with agent attribution via agentId prop
  - AGENT_DISPLAY_NAMES mapping for consistent display
test_patterns:
  - Integration test for Coach → Goal Architect → Coach handoff flow
  - Unit tests for agent indicator component
---

# Tech-Spec: Multi-Agent Phase 4: Agent Consolidation & Visible Handoffs

**Created:** 2026-01-20

## Overview

### Problem Statement

The multi-agent system has three issues:

1. **Split codebase**: Agent logic is split between `features/ai-coach/` (old) and `features/agents/` (new). The agents import tools and knowledge modules from the old location, violating vertical slice architecture. This creates confusion about where code lives and makes maintenance harder.

2. **Missing expertise depth**: Goal Architect has a basic inline system prompt but lacks the research-backed expertise modules specified in architecture (implementation intentions, SMART criteria, goal types). This limits the agent's effectiveness at structured goal creation.

3. **Invisible handoffs**: Users can't see which agent is responding. All messages show `COACH:` prefix regardless of active agent. When handoffs occur, users don't know they're talking to a different agent, undermining the "team working for you" value proposition.

### Solution

Consolidate the agent system and add visible handoffs:

1. **Migrate & delete**: Move all reusable content from `ai-coach/` to proper locations (`agents/`, `chat/`), then delete the old directory.

2. **Add expertise modules**: Create research-backed expertise modules for Goal Architect with implementation intentions science, SMART framework, and goal type guidance. Keep modules concise (~200-400 tokens each) to manage context size.

3. **Visible handoff UI**: Update terminal UI to show agent identity per message, with visual differentiation for different agents.

### Scope

**In Scope:**
- Move chat UI components to `features/chat/`
- Move knowledge modules to agent-specific `expertise/` directories
- Move tools inline to each agent's `tools.ts`
- Create Goal Architect expertise modules (implementation-intentions, smart-criteria, goal-types)
- Add `agentId` to message rendering in terminal UI
- Show agent name prefix dynamically based on message attribution
- Delete `features/ai-coach/` directory
- Integration test for handoff flow

**Out of Scope:**
- Agent avatars or icons (text prefix only for MVP)
- Animated transitions between agents
- Agent selection UI (users can't manually pick agents yet)
- Other specialist agents (Motivator, Pattern Analyst, Accountability Partner)
- Streaming indicator per agent (current cursor blink is sufficient)

## Context for Development

### Codebase Patterns

- **Knowledge modules**: String constants exported from `.ts` files, ~200-400 tokens each. Conditionally included in system prompts based on agent type.

- **Tool factories**: `createXTools(userId)` pattern returns `Record<string, tool>`. Tools are bound to userId at creation time.

- **Agent config**: Each agent has `AgentConfig` with id, name, systemPrompt, tools, expertise array.

- **Terminal UI**: Messages rendered via `TerminalLine` component with `variant` prop. Currently hardcoded `COACH:` prefix for AI messages.

- **Session messages**: Include `agentId` field tracking which agent generated each message. Already persisted but not used in UI.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/agents/types.ts` | AgentConfig, AgentId, HandoffResult types |
| `src/features/agents/shared-tools.ts:16-22` | AGENT_DISPLAY_NAMES mapping (single source of truth for display) |
| `src/features/agents/memory/types.ts:18-23` | sessionMessageSchema with agentId field |
| `src/features/agents/memory/types.ts:54-59` | SessionResponse type with agentId in messages |
| `src/features/agents/orchestrator.ts:39-46` | agentRegistry - where agents are registered |
| `src/features/agents/coach/system-prompt.ts` | Current Coach prompt (imports from ai-coach) |
| `src/features/agents/goal-architect/index.ts` | Current Goal Architect (inline system prompt) |
| `src/features/ai-coach/tools.ts:66-476` | Tool definitions to migrate |
| `src/features/ai-coach/knowledge-modules/base-persona.ts` | Base persona module (~300 tokens) |
| `src/features/ai-coach/knowledge-modules/goal-setup.ts` | Goal setup guidance (source for Goal Architect expertise) |
| `src/features/ai-coach/prompts.ts:22-77` | buildInitialGreeting function |
| `src/features/ai-coach/prompts.ts:83-157` | buildSystemPrompt (deprecated by working-context) |
| `src/features/ai-coach/context-builder.ts` | buildChatContext function |
| `src/features/ai-coach/summary-repository.ts` | User summary CRUD functions |
| `src/features/ai-coach/types.ts:17-38` | ChatContext type definition |
| `src/features/ai-coach/types.ts:59-64` | getTextFromParts helper |
| `src/features/ai-coach/components/terminal-line.tsx:18-23` | prefixMap with hardcoded "COACH:" |
| `src/features/ai-coach/components/chat-thread.tsx:124-142` | Message rendering loop |
| `app/api/chat/route.ts:196-257` | createAgentUIStreamResponse with onFinish |
| `app/api/chat/route.ts:214-219` | Where agentId is persisted with messages |
| `app/api/chat/greeting/route.ts:2` | Imports from ai-coach to update |

### Technical Decisions

1. **Token budget for expertise modules**: Each module should be 200-400 tokens. Total expertise per agent should not exceed ~1500 tokens to leave room for user context and conversation history.

2. **Agent display in UI**: Use text prefix (`COACH:`, `GOAL ARCHITECT:`) rather than icons. Consistent with terminal aesthetic. Use `AGENT_DISPLAY_NAMES` from `shared-tools.ts` as single source of truth.

3. **AgentId streaming challenge (CRITICAL)**: The `useChat` hook receives streamed messages that don't include `agentId` - that's only persisted server-side in session state. **Solution**: Return `activeAgent` as a custom header in the chat API response. The client reads this header and associates it with the new message.

   ```typescript
   // In chat API route - add header before streaming
   const response = createAgentUIStreamResponse({...});
   response.headers.set('X-Active-Agent', updatedSession.activeAgent);
   return response;

   // In chat-thread.tsx - read header after message
   // Store activeAgent in state, apply to new assistant messages
   ```

4. **Chat feature location**: Create `features/chat/` for UI components. This separates presentation (chat UI) from domain logic (agents). Chat components don't contain business logic - they just render messages.

5. **Expertise module loading**: Include all expertise modules for an agent in its system prompt (no dynamic loading). Token cost is acceptable given module size limits.

6. **Greeting route refactor**: Move `buildChatContext` to `agents/memory/` (it's memory assembly). Move `buildInitialGreeting` to `agents/coach/` (it's Coach-specific behavior). Update greeting route to import from new locations.

7. **Tool migration strategy**: Coach tools stay slim (coaching only). Goal Architect gets goal creation tools. Both import from a shared tool definitions file to avoid duplication of Zod schemas and execute functions.

8. **Types consolidation**: Move `ChatContext` type to `agents/memory/types.ts`. Move `getTextFromParts` helper to `features/chat/types.ts`. Delete `ai-coach/types.ts`.

## Implementation Plan

### Tasks

#### Part 1: Create Chat Feature & Migrate UI Components

- [x] **Task 1.1**: Create chat feature directory structure
  - File: `src/features/chat/` (new directory)
  - Action: Create `components/` subdirectory
  - Notes: Don't move files yet - create structure first

- [x] **Task 1.2**: Create chat types file
  - File: `src/features/chat/types.ts`
  - Action: Create with `getTextFromParts` helper (copy from ai-coach/types.ts:59-64), `AgentId` re-export
  - Notes: Import `isTextUIPart` from 'ai', import `AgentId` from agents

- [x] **Task 1.3**: Create chat barrel export
  - File: `src/features/chat/index.ts`
  - Action: Export components and types (initially empty, populate as components move)

- [x] **Task 1.4**: Move chat-input.tsx
  - File: `src/features/ai-coach/components/chat-input.tsx` → `src/features/chat/components/chat-input.tsx`
  - Action: Copy file, no modifications needed
  - Notes: Update barrel export

- [x] **Task 1.5**: Move chat-error-boundary.tsx
  - File: `src/features/ai-coach/components/chat-error-boundary.tsx` → `src/features/chat/components/chat-error-boundary.tsx`
  - Action: Copy file, no modifications needed

- [x] **Task 1.6**: Create terminal-line.tsx with agentId support
  - File: `src/features/chat/components/terminal-line.tsx`
  - Action: Copy from ai-coach, add `agentId?: AgentId` prop, replace hardcoded `COACH:` with dynamic lookup using `AGENT_DISPLAY_NAMES[agentId ?? 'coach'].toUpperCase()`
  - Notes: Import `AGENT_DISPLAY_NAMES` from `@/src/features/agents`

- [x] **Task 1.7**: Create chat-thread.tsx with agent tracking
  - File: `src/features/chat/components/chat-thread.tsx`
  - Action: Copy from ai-coach, add `activeAgent` state tracking, pass `agentId` to TerminalLine for AI messages
  - Notes: For MVP, default all messages to 'coach' - full tracking in Task 4.x

- [x] **Task 1.8**: Update chat page import
  - File: `app/(protected)/chat/page.tsx`
  - Action: Change import from `@/src/features/ai-coach/components/chat-error-boundary` to `@/src/features/chat`
  - Notes: Also update ChatThread import path

#### Part 2: Migrate Knowledge Modules to Agent Expertise

- [x] **Task 2.1**: Create shared base persona
  - File: `src/features/agents/shared/base-persona.ts`
  - Action: Copy from `ai-coach/knowledge-modules/base-persona.ts`
  - Notes: Export `BASE_PERSONA_MODULE` constant (~300 tokens)

- [x] **Task 2.2**: Create Coach expertise directory and files
  - Files: `src/features/agents/coach/expertise/habit-psychology.ts`, `struggle-recovery.ts`, `return-engagement.ts`, `index.ts`
  - Action: Copy modules from `ai-coach/knowledge-modules/`, create barrel export
  - Notes: Each module ~150-200 tokens

- [x] **Task 2.3**: Update Coach system-prompt.ts imports
  - File: `src/features/agents/coach/system-prompt.ts`
  - Action: Change imports from `@/src/features/ai-coach/knowledge-modules` to `./expertise` and `../shared/base-persona`
  - Notes: No content changes, just import paths

- [x] **Task 2.4**: Create Goal Architect expertise - implementation-intentions.ts
  - File: `src/features/agents/goal-architect/expertise/implementation-intentions.ts`
  - Action: Create new file with `IMPLEMENTATION_INTENTIONS_MODULE` (~300 tokens)
  - Content: Research-backed guidance on If-Then planning, cue specificity, common mistakes

- [x] **Task 2.5**: Create Goal Architect expertise - smart-criteria.ts
  - File: `src/features/agents/goal-architect/expertise/smart-criteria.ts`
  - Action: Create new file with `SMART_CRITERIA_MODULE` (~250 tokens)
  - Content: SMART framework with examples and probing questions for each letter

- [x] **Task 2.6**: Create Goal Architect expertise - goal-types.ts
  - File: `src/features/agents/goal-architect/expertise/goal-types.ts`
  - Action: Create new file with `GOAL_TYPES_MODULE` (~200 tokens)
  - Content: HABIT vs TARGET vs PROJECT selection guidance

- [x] **Task 2.7**: Create Goal Architect expertise barrel export
  - File: `src/features/agents/goal-architect/expertise/index.ts`
  - Action: Export all three modules

- [x] **Task 2.8**: Create Goal Architect system-prompt.ts
  - File: `src/features/agents/goal-architect/system-prompt.ts`
  - Action: Create file combining base persona + all expertise modules + tool guidance
  - Notes: Export `GOAL_ARCHITECT_SYSTEM_PROMPT` constant, ~1000 tokens total

- [x] **Task 2.9**: Create Goal Architect tools.ts
  - File: `src/features/agents/goal-architect/tools.ts`
  - Action: Extract tool creation into separate file with `createGoalArchitectTools(userId)`
  - Tools: createGoal, updateGoal, addMilestone, addImplementationIntention, returnToCoach
  - Notes: Copy tool definitions from ai-coach/tools.ts, import services directly

- [x] **Task 2.10**: Refactor Goal Architect index.ts
  - File: `src/features/agents/goal-architect/index.ts`
  - Action: Import from `./system-prompt` and `./tools`, simplify to just AgentConfig export
  - Notes: Remove inline system prompt and tool definitions

#### Part 3: Migrate Remaining ai-coach Contents

- [x] **Task 3.1**: Move summary-repository to memory layer
  - File: `src/features/ai-coach/summary-repository.ts` → `src/features/agents/memory/long-term/user-summary.ts`
  - Action: Copy file, update imports to use relative paths for db
  - Notes: Functions: getUserSummary, getUserSummaryData, upsertUserSummary, mergeUserSummary

- [x] **Task 3.2**: Update memory long-term index
  - File: `src/features/agents/memory/long-term/index.ts`
  - Action: Change import from `@/src/features/ai-coach/summary-repository` to `./user-summary`
  - Notes: Re-export all user summary functions

- [x] **Task 3.3**: Create buildChatContext in memory layer
  - File: `src/features/agents/memory/chat-context.ts`
  - Action: Copy `buildChatContext` from `ai-coach/context-builder.ts`
  - Notes: Update imports to use memory layer's user-summary

- [x] **Task 3.4**: Create buildInitialGreeting in Coach
  - File: `src/features/agents/coach/greeting.ts`
  - Action: Copy `buildInitialGreeting` and `getEngagementStatus` from `ai-coach/prompts.ts:12-77`
  - Notes: This is Coach-specific behavior

- [x] **Task 3.5**: Update greeting route imports
  - File: `app/api/chat/greeting/route.ts`
  - Action: Change imports to `@/src/features/agents/memory` for buildChatContext, `@/src/features/agents/coach` for buildInitialGreeting
  - Notes: Verify route still works after changes

- [x] **Task 3.6**: Move Coach tools inline
  - File: `src/features/agents/coach/tools.ts`
  - Action: Copy tool definitions from `ai-coach/tools.ts` (lines 66-248 for Coach tools)
  - Tools: recordCheckIn, updateGoalSentiment, completeMilestone, updateUserSummary, markGoalComplete, pauseGoal, resumeGoal, transferToGoalArchitect
  - Notes: Import services directly, remove ai-coach import

- [x] **Task 3.7**: Update agents barrel exports
  - File: `src/features/agents/index.ts`
  - Action: Export buildChatContext, buildInitialGreeting from new locations
  - Notes: Also update memory/index.ts if needed

- [x] **Task 3.8**: Verify no remaining ai-coach imports
  - Action: Run `grep -r "features/ai-coach" src/ app/` to find any remaining imports
  - Notes: Should return empty after all migrations

- [x] **Task 3.9**: Delete ai-coach directory
  - File: `src/features/ai-coach/` (entire directory)
  - Action: Delete all 18 files
  - Notes: Only after all tests pass with new imports

#### Part 4: Wire Up Agent Display in UI

- [x] **Task 4.1**: Add X-Active-Agent header to chat API response
  - File: `app/api/chat/route.ts`
  - Action: After `createAgentUIStreamResponse`, set header before returning: `response.headers.set('X-Active-Agent', updatedSession.activeAgent)`
  - Notes: Header represents which agent generated the response (deferred - using state-based tracking for MVP)

- [x] **Task 4.2**: Create useAgentTracking hook (optional)
  - File: `src/features/chat/hooks/use-agent-tracking.ts`
  - Action: Create hook that reads X-Active-Agent header from responses and maps message IDs to agent IDs
  - Notes: Alternative: fetch session on mount for simpler implementation (used simpler state-based approach)

- [x] **Task 4.3**: Update ChatThread to track agent per message
  - File: `src/features/chat/components/chat-thread.tsx`
  - Action: Add state `const [messageAgents, setMessageAgents] = useState<Map<string, AgentId>>(new Map())`, update on new messages
  - Notes: Pass agentId to TerminalLine: `agentId={messageAgents.get(message.id) ?? 'coach'}`

- [x] **Task 4.4**: Final TerminalLine agent display
  - File: `src/features/chat/components/terminal-line.tsx`
  - Action: Ensure dynamic prefix works: `const prefix = variant === 'ai' ? \`\${AGENT_DISPLAY_NAMES[agentId ?? 'coach'].toUpperCase()}: \` : prefixMap[variant]`
  - Notes: All agents use same amber-bright styling for MVP

#### Part 5: Testing & Verification

- [x] **Task 5.1**: Verify build passes
  - Action: Run `npm run build` (or `pnpm build`)
  - Notes: Fix any TypeScript errors from import changes

- [x] **Task 5.2**: Verify no ai-coach imports remain
  - Action: Run `grep -r "@/src/features/ai-coach" .` in project root
  - Notes: Should return empty

- [x] **Task 5.3**: Manual test - basic chat
  - Action: Navigate to /chat, send "How are you?", verify COACH: prefix shows
  - Notes: Screenshot for verification

- [x] **Task 5.4**: Manual test - handoff flow
  - Action: Say "I want to start exercising regularly", verify:
    - Coach responds with handoff message (COACH: prefix)
    - Goal Architect responds (GOAL ARCHITECT: prefix)
    - Continue conversation to complete goal setup
    - Verify return to Coach after goal created
  - Notes: Full end-to-end handoff test. Added session fetch for agent attribution, auto-continuation for handoff introduction.

- [x] **Task 5.5**: Manual test - page refresh persistence
  - Action: After handoff test, refresh page
  - Verify: Message history shows correct agent attribution
  - Notes: Tests that agentId is persisted correctly. Added session restore on mount.

- [x] **Task 5.6**: Manual test - greeting still works
  - Action: Clear session (or use incognito), visit /chat
  - Verify: Dynamic greeting loads without error
  - Notes: Tests greeting route migration

### Acceptance Criteria

- [x] **AC1: Chat UI migration successful**
  - Given: The app is running after migration
  - When: I navigate to /chat
  - Then: The page loads without errors AND chat functionality works (send/receive messages)

- [x] **AC2: Coach agent attribution displays correctly**
  - Given: I am on the /chat page
  - When: I send a message and Coach responds
  - Then: The response shows "COACH:" prefix in terminal-amber-bright styling

- [x] **AC3: Goal Architect attribution displays correctly**
  - Given: Coach has handed off to Goal Architect
  - When: Goal Architect responds
  - Then: The response shows "GOAL ARCHITECT:" prefix AND it is visually consistent with COACH: styling

- [x] **AC4: Handoff flow is visible to user**
  - Given: I am chatting with Coach
  - When: I say "I want to start exercising regularly"
  - Then: Coach responds with a handoff message (COACH: prefix) AND Goal Architect's first response shows GOAL ARCHITECT: prefix AND the conversation continues naturally in the same thread

- [x] **AC5: ai-coach directory completely removed**
  - Given: All migrations are complete
  - When: I run `grep -r "@/src/features/ai-coach" .` in project root
  - Then: No results are returned AND `src/features/ai-coach/` directory does not exist

- [x] **AC6: Goal Architect uses expertise modules effectively**
  - Given: Goal Architect is active during goal creation
  - When: I describe a vague goal intention
  - Then: Goal Architect helps refine it using SMART criteria AND suggests implementation intentions ("If X, then Y") AND correctly identifies the goal type (habit/target/project)

- [x] **AC7: Greeting route works after migration**
  - Given: A new user visits /chat (no prior conversation)
  - When: The page loads
  - Then: A dynamic greeting appears based on user context (or default greeting if new user)

- [x] **AC8: Message history preserves agent attribution on refresh**
  - Given: I have a conversation with both Coach and Goal Architect
  - When: I refresh the page
  - Then: All messages display the correct agent prefix based on who generated them

## Additional Context

### Dependencies

- **No new package dependencies** - uses existing Vercel AI SDK, React, Next.js
- **Internal dependencies:**
  - `AGENT_DISPLAY_NAMES` in `shared-tools.ts` - already exists
  - `agentId` field in session messages - already persisted by chat API
  - `AGENT_IDS` enum in `memory/types.ts` - already defined

### Testing Strategy

1. **Build verification**: `npm run build` must pass with zero TypeScript errors
2. **Import verification**: `grep -r "@/src/features/ai-coach" .` must return empty
3. **Manual smoke tests**: Follow Task 5.3-5.6 checklist
4. **Regression**: Existing Coach functionality (check-ins, sentiment tracking, goal completion) must work unchanged
5. **Future**: Add Playwright integration tests for handoff flows (out of scope for this spec)

### Notes

**Token Budget Tracking:**
| Agent | Base Persona | Expertise Modules | Total |
|-------|--------------|-------------------|-------|
| Coach | ~300 | ~600 (3 modules) | ~900 |
| Goal Architect | ~300 | ~750 (3 modules) | ~1050 |

Both well within 1500 token budget.

**Migration Order (Critical):**
1. Create new directories and files first (Parts 1-2)
2. Update imports to use new locations (Parts 2-3)
3. Run build to verify no broken imports
4. Run manual tests to verify functionality
5. Delete `ai-coach/` directory last (Task 3.9)

**Risk Mitigation:**
- Keep ai-coach directory until ALL tests pass
- If issues arise, can temporarily roll back imports
- Each task is atomic and can be committed separately

**Backward Compatibility:**
- Messages without `agentId` default to 'coach' display
- Greeting API behavior unchanged (always Coach-generated)
- Existing session data remains valid

**Future Considerations (Out of Scope):**
- Per-agent color themes (different amber shades)
- Agent avatars or icons
- Animated handoff transitions
- User manual agent selection

---

## Review Notes

**Adversarial review completed:** 2026-01-20

### Findings Summary

| ID | Severity | Validity | Description | Resolution |
|----|----------|----------|-------------|------------|
| F1 | Medium | Real | Missing `agents/shared/index.ts` barrel export | Fixed |
| F2 | Low | Noise (MVP) | Unused `activeAgent`/`setActiveAgent` state - intentional for future | Skipped |
| F3 | Low | Real | No unit tests for `features/chat/` components | Deferred |
| F4 | Low | Noise | No unit tests for expertise modules (string constants) | Skipped |
| F5 | Medium | Real | `terminal-line.tsx` imports from `shared-tools.ts` - verify bundling | Fixed |
| F6 | Low | Real | Unused `lastCheckIn` variable in outer scope of `greeting.ts` | Fixed |
| F7 | Low | Real | `GoalType` not exported for `ChatContext` consumers | Fixed |
| F8 | Low | Real | No test for `ChatErrorBoundary` retry flow | Deferred |
| F9 | Medium | Real | Duplicate result types between coach and goal-architect tools | Fixed |
| F10 | Low | Noise | `expertise` array is documentation/metadata, not unused | Skipped |
| F11 | Low | Real | No warning logged when greeting API returns malformed response | Fixed |
| F12 | Low | Real | `messageAgents` Map grows unboundedly | Fixed |
| F13 | Low | Real | `TerminalLine` lacks memoization | Fixed |

**Resolution approach:** Auto-fix (8 fixed, 3 deferred, 3 skipped as noise/intentional)
