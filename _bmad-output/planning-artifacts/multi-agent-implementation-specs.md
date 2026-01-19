# Multi-Agent Roundtable Implementation Specs

**Created:** 2026-01-19
**Status:** Spec stubs ready for tech-spec workflow
**Architecture Reference:** `_bmad-output/planning-artifacts/architecture.md` (Decision 1, Decision 10)

---

## Execution Order

Execute these specs in order. Each phase depends on the previous.

| Phase | Spec ID | Name | Estimated Complexity |
|-------|---------|------|---------------------|
| 1 | `MA-1.1` | Session State Infrastructure | Low |
| 1 | `MA-1.2` | Working Context Builder | Medium |
| 1 | `MA-1.3` | Agent Type Definitions | Low |
| 2 | `MA-2.1` | Coach Agent Extraction | Medium |
| 2 | `MA-2.2` | Single-Agent Orchestrator | Medium |
| 2 | `MA-2.3` | API Route Integration | Low |
| 3 | `MA-3.1` | Handoff Tool Pattern | Medium |
| 3 | `MA-3.2` | Transition State Handling | Medium |
| 3 | `MA-3.3` | Agent Transition Logging | Low |
| 4 | `MA-4.1` | Goal Architect Agent | Medium |
| 4 | `MA-4.2` | Coach-to-Architect Handoff | Medium |
| 4 | `MA-4.3` | Visible Handoff UI | Medium |
| 5 | `MA-5.1` | Explicit Agent Requests | Low |
| 5 | `MA-5.2` | Session Recovery | Medium |
| 5 | `MA-5.3` | Error Handling & Fallbacks | Medium |

---

## Phase 1: Foundation (Memory System)

### MA-1.1: Session State Infrastructure

**Objective:** Create database table and services for storing conversation session state (Tier 2 of three-tier memory).

**Input Documents:**
- Architecture Decision 1 (Three-Tier Memory)
- Architecture Decision 2 (Data Model)

**Requirements:**
1. Create `conversation_sessions` table with Drizzle schema
   - `id` (uuid, primary key)
   - `user_id` (uuid, FK to profiles)
   - `active_agent` (text, enum: 'coach' | 'goalArchitect' | 'patternAnalyst' | 'motivator' | 'accountabilityPartner')
   - `messages` (jsonb - array of message objects with role, content, agent attribution)
   - `agent_transitions` (jsonb - array of transition records)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)
   - `expires_at` (timestamp, nullable - for session cleanup)

2. Create session state service (`features/memory/session-state.ts`)
   - `getOrCreateSession(userId: string): Promise<ConversationSession>`
   - `updateSession(sessionId: string, updates: Partial<ConversationSession>): Promise<void>`
   - `addMessage(sessionId: string, message: SessionMessage): Promise<void>`
   - `recordTransition(sessionId: string, transition: AgentTransition): Promise<void>`
   - `clearSession(sessionId: string): Promise<void>`

3. Generate and apply Drizzle migration

**Acceptance Criteria:**
- [ ] Migration runs successfully
- [ ] Can create, read, update session via service functions
- [ ] Session persists across requests
- [ ] Unit tests pass for session-state.ts

**Files to Create/Modify:**
- `src/db/schema.ts` (add conversation_sessions)
- `src/features/memory/session-state.ts` (new)
- `src/features/memory/session-state.test.ts` (new)
- `src/features/memory/types.ts` (new)
- `drizzle/migrations/XXXX_add_conversation_sessions.sql` (generated)

---

### MA-1.2: Working Context Builder

**Objective:** Create the function that assembles scoped working context (Tier 1) for each agent invocation.

**Input Documents:**
- Architecture Decision 1 (Three-Tier Memory - Scoped Context Assembly)
- Architecture Decision 10 (Agent configurations with expertise modules)

**Requirements:**
1. Create working context builder (`features/memory/working-context.ts`)
   - `assembleWorkingContext(agentId, sessionState, longTermMemory): WorkingContext`
   - Returns: `{ systemPrompt, messages, tools }`

2. Implement scoped message selection
   - Select last N relevant messages (not full history)
   - Filter by relevance to current agent's task
   - Include agent attribution in message metadata

3. Implement context injection
   - User profile context (name, preferences)
   - Goals summary context (active goals, status)
   - Engagement context (days since last check-in)

4. Define agent-specific context rules
   - Coach: user profile, goals summary, last 10 messages, user summary
   - Goal Architect: user profile, specific goal detail, goal-related messages only

**Acceptance Criteria:**
- [ ] Working context is assembled correctly for Coach agent
- [ ] Message scoping limits context size appropriately
- [ ] User profile and goals are injected into system prompt
- [ ] Unit tests verify context assembly logic

**Files to Create/Modify:**
- `src/features/memory/working-context.ts` (new)
- `src/features/memory/working-context.test.ts` (new)
- `src/features/memory/types.ts` (extend)

---

### MA-1.3: Agent Type Definitions

**Objective:** Define TypeScript types for the multi-agent system.

**Input Documents:**
- Architecture Decision 10 (Agent Team, AgentId, AgentState, AgentConfig)

**Requirements:**
1. Define agent identifier type
   ```typescript
   type AgentId = 'coach' | 'goalArchitect' | 'patternAnalyst' | 'motivator' | 'accountabilityPartner';
   ```

2. Define agent state type
   ```typescript
   interface AgentState {
     activeAgent: AgentId;
     transitionHistory: AgentTransition[];
   }
   ```

3. Define agent configuration type
   ```typescript
   interface AgentConfig {
     id: AgentId;
     name: string;  // Display name
     systemPrompt: string;
     tools: Record<string, Tool>;
     expertise: string[];  // Knowledge modules to include
     messageFilter?: (message: Message) => boolean;  // For scoped context
   }
   ```

4. Define handoff types
   ```typescript
   interface HandoffResult {
     handoff: AgentId;
     reason: string;
     context?: string;
     announcement: string;  // Visible to user
   }

   interface AgentTransition {
     from: AgentId;
     to: AgentId;
     reason: string;
     timestamp: Date;
   }
   ```

5. Define message types with agent attribution
   ```typescript
   interface SessionMessage {
     role: 'user' | 'assistant';
     content: string;
     agentId?: AgentId;  // Which agent sent this
     timestamp: Date;
   }
   ```

**Acceptance Criteria:**
- [ ] All types compile without errors
- [ ] Types are exported and importable
- [ ] Types align with architecture document

**Files to Create/Modify:**
- `src/features/agents/types.ts` (new)

---

## Phase 2: Single Agent Refactor (Coach Only)

### MA-2.1: Coach Agent Extraction

**Objective:** Extract existing AI coach logic into the new agent structure.

**Input Documents:**
- Architecture Decision 10 (Coach agent personality, expertise)
- Existing `features/ai-coach/` code

**Requirements:**
1. Create Coach agent folder structure
   ```
   features/agents/coach/
   ├── system-prompt.ts
   ├── tools.ts
   └── index.ts
   ```

2. Extract/write Coach system prompt
   - Warm, supportive personality
   - "Home base" framing
   - Knowledge of user context
   - Non-judgmental, no guilt mechanics

3. Define Coach expertise modules
   - Base persona
   - Check-in support
   - Return engagement (for users coming back after absence)

4. Create placeholder for handoff tools (empty for now - implemented in Phase 3)

**Acceptance Criteria:**
- [ ] Coach system prompt captures existing AI coach personality
- [ ] Coach exports valid AgentConfig
- [ ] No functional changes to user experience yet

**Files to Create/Modify:**
- `src/features/agents/coach/system-prompt.ts` (new)
- `src/features/agents/coach/tools.ts` (new - placeholder)
- `src/features/agents/coach/index.ts` (new)

**Migration Notes:**
- Review existing `features/ai-coach/knowledge-modules/base-persona.ts` for content to migrate
- Keep existing ai-coach code working until Phase 2.3 integration

---

### MA-2.2: Single-Agent Orchestrator

**Objective:** Create the agent orchestrator that manages agent state and routes messages.

**Input Documents:**
- Architecture Decision 10 (Orchestrator Implementation)

**Requirements:**
1. Create orchestrator (`features/agents/orchestrator.ts`)
   - `processMessage(userMessage, sessionState, memoryContext): Promise<AgentResponse>`
   - Manages which agent is active
   - Assembles working context
   - Calls Claude API via Vercel AI SDK
   - Returns response with agent attribution

2. Implement agent registry
   - `agentConfigs: Record<AgentId, AgentConfig>`
   - Initially only Coach registered

3. Use Vercel AI SDK `generateText` with tools
   - Pass agent's system prompt
   - Pass agent's tools
   - Handle tool results

4. Return structured response
   ```typescript
   interface AgentResponse {
     text: string;
     agentId: AgentId;
     toolResults?: ToolResult[];
   }
   ```

**Acceptance Criteria:**
- [ ] Orchestrator processes messages using Coach agent
- [ ] Working context is correctly assembled
- [ ] Claude API is called via Vercel AI SDK
- [ ] Response includes agent attribution
- [ ] Unit tests for orchestrator logic

**Files to Create/Modify:**
- `src/features/agents/orchestrator.ts` (new)
- `src/features/agents/orchestrator.test.ts` (new)
- `src/features/agents/index.ts` (new - exports)

---

### MA-2.3: API Route Integration

**Objective:** Wire the new orchestrator into the existing check-in API route.

**Input Documents:**
- Existing `app/api/check-ins/route.ts`
- Architecture Decision 10

**Requirements:**
1. Update check-in API route to use orchestrator
   - Load/create session state
   - Call `processMessage` from orchestrator
   - Save updated session state
   - Return response with agent attribution

2. Maintain backward compatibility
   - Existing request/response format should work
   - Add optional `agentId` to response

3. Handle session lifecycle
   - Create session on first message
   - Load existing session on subsequent messages
   - Session identified by user ID (one active session per user for MVP)

**Acceptance Criteria:**
- [ ] Existing check-in functionality works unchanged
- [ ] Session state is persisted between requests
- [ ] Response includes which agent responded
- [ ] Integration test: send message, get response, send another message with context retained

**Files to Create/Modify:**
- `src/app/api/check-ins/route.ts` (modify)

**Rollback Plan:**
- Keep old implementation commented or in separate function until verified working

---

## Phase 3: Handoff Infrastructure

### MA-3.1: Handoff Tool Pattern

**Objective:** Define how handoff tools work and create the shared pattern.

**Input Documents:**
- Architecture Decision 10 (Handoff Mechanism: Tool-Based Transitions)

**Requirements:**
1. Create handoff tool factory (`features/agents/shared-tools.ts`)
   ```typescript
   function createHandoffTool(targetAgent: AgentId, config: HandoffToolConfig): Tool
   ```

2. Define handoff tool return type
   - Must return `HandoffResult` with: handoff target, reason, announcement
   - Orchestrator detects this return type and triggers transition

3. Create shared tools available to all agents
   - (Future: shared utilities, but start minimal)

4. Document the handoff tool contract
   - Tool description tells LLM when to use it
   - Parameters capture reason and context
   - Return value triggers orchestrator transition

**Acceptance Criteria:**
- [ ] Handoff tool factory creates valid Vercel AI SDK tools
- [ ] Tool return type is correctly typed as HandoffResult
- [ ] Documentation explains how to add new handoff tools

**Files to Create/Modify:**
- `src/features/agents/shared-tools.ts` (new)
- `src/features/agents/types.ts` (extend if needed)

---

### MA-3.2: Transition State Handling

**Objective:** Update orchestrator to detect and process agent handoffs.

**Input Documents:**
- Architecture Decision 10 (handleAgentTransition function)

**Requirements:**
1. Update orchestrator to detect handoff tool results
   - After each step, check if any tool returned HandoffResult
   - If handoff detected, update session state

2. Implement `handleAgentTransition`
   - Update `activeAgent` in session state
   - Add transition to `transitionHistory`
   - Prepare context for new agent

3. Handle mid-conversation handoffs
   - When handoff occurs, new agent should continue the response
   - Announcement message should appear before new agent's response

4. Implement "return to Coach" as default behavior
   - All specialists should have returnToCoach tool
   - Coach is always reachable

**Acceptance Criteria:**
- [ ] Handoff tool triggers agent transition
- [ ] Session state reflects new active agent
- [ ] Transition is logged in history
- [ ] Announcement message is included in response
- [ ] Unit tests for transition handling

**Files to Create/Modify:**
- `src/features/agents/orchestrator.ts` (modify)
- `src/features/memory/session-state.ts` (modify - add recordTransition)

---

### MA-3.3: Agent Transition Logging

**Objective:** Create audit trail of agent transitions for debugging and analytics.

**Input Documents:**
- Architecture Decision 2 (agent_transitions table)

**Requirements:**
1. Create `agent_transitions` table
   - `id` (uuid)
   - `session_id` (uuid, FK to conversation_sessions)
   - `user_id` (uuid, FK to profiles)
   - `from_agent` (text)
   - `to_agent` (text)
   - `reason` (text)
   - `created_at` (timestamp)

2. Log transitions to database (not just session JSON)
   - Durable audit trail
   - Can query across sessions

3. Create query functions
   - `getTransitionsForSession(sessionId)`
   - `getTransitionsForUser(userId)` (for future analytics)

**Acceptance Criteria:**
- [ ] Migration runs successfully
- [ ] Transitions are logged to database
- [ ] Can query transitions by session
- [ ] Logging doesn't block response (async acceptable)

**Files to Create/Modify:**
- `src/db/schema.ts` (add agent_transitions)
- `src/features/agents/transition-logger.ts` (new)
- `drizzle/migrations/XXXX_add_agent_transitions.sql` (generated)

---

## Phase 4: Goal Architect Agent

### MA-4.1: Goal Architect Agent

**Objective:** Implement the Goal Architect specialist agent.

**Input Documents:**
- Architecture Decision 10 (Goal Architect personality, expertise)
- PRD Goal System Design section

**Requirements:**
1. Create Goal Architect folder structure
   ```
   features/agents/goal-architect/
   ├── system-prompt.ts
   ├── tools.ts
   ├── expertise/
   │   ├── implementation-intentions.ts
   │   ├── smart-criteria.ts
   │   └── goal-types.ts
   └── index.ts
   ```

2. Write Goal Architect system prompt
   - Thoughtful strategist personality
   - Asks clarifying questions
   - Guides through goal setup flow (What → Why → How → Measure → Recovery)
   - References implementation intentions research

3. Create expertise modules
   - Implementation intentions (If-then planning)
   - SMART criteria (Specific, Measurable, etc.)
   - Goal types (Habit vs Target vs Project)

4. Define Goal Architect tools
   - `createGoal` - creates goal via services layer
   - `updateGoal` - modifies existing goal
   - `returnToCoach` - hands back to Coach when done

**Acceptance Criteria:**
- [ ] Goal Architect has distinct personality from Coach
- [ ] System prompt includes goal-setting expertise
- [ ] Tools integrate with existing goal services
- [ ] Can create a goal through conversation

**Files to Create/Modify:**
- `src/features/agents/goal-architect/system-prompt.ts` (new)
- `src/features/agents/goal-architect/tools.ts` (new)
- `src/features/agents/goal-architect/expertise/*.ts` (new)
- `src/features/agents/goal-architect/index.ts` (new)

---

### MA-4.2: Coach-to-Architect Handoff

**Objective:** Enable Coach to hand off to Goal Architect when appropriate.

**Input Documents:**
- Architecture Decision 10 (Handoff Triggers, Coach tools)

**Requirements:**
1. Add `transferToGoalArchitect` tool to Coach
   - Description tells LLM when to trigger (new goal, restructure, vague intention)
   - Parameters: reason, goalContext (optional)
   - Returns HandoffResult with announcement

2. Register Goal Architect in orchestrator
   - Add to agentConfigs
   - Orchestrator can now route to goalArchitect

3. Implement announcement flow
   - Coach says "Let me bring in the Goal Architect..."
   - Goal Architect continues with their greeting
   - Seamless in single response

4. Test handoff scenarios
   - "I want to start exercising" → triggers handoff
   - "How am I doing?" → stays with Coach
   - "This goal isn't working" → triggers handoff

**Acceptance Criteria:**
- [ ] Coach correctly identifies when to hand off
- [ ] Handoff announcement appears in conversation
- [ ] Goal Architect takes over and can create goals
- [ ] Goal Architect can return to Coach
- [ ] End-to-end test: Coach → Goal Architect → goal created → return to Coach

**Files to Create/Modify:**
- `src/features/agents/coach/tools.ts` (add transferToGoalArchitect)
- `src/features/agents/orchestrator.ts` (register Goal Architect)

---

### MA-4.3: Visible Handoff UI

**Objective:** Display agent identity and transitions in the chat UI.

**Input Documents:**
- Architecture Decision 10 (Visible Handoff Protocol)
- PRD User Experience Principles

**Requirements:**
1. Update message display to show agent identity
   - Each message shows which agent sent it
   - Visual indicator (name, icon, or color)

2. Display handoff announcements distinctly
   - Transition messages are visually differentiated
   - "Let me bring in the Goal Architect..." appears as Coach
   - Next message shows Goal Architect identity

3. Show current active agent
   - Header or indicator showing who user is talking to
   - Updates when handoff occurs

4. Maintain conversation thread continuity
   - All messages in same thread
   - History shows the full conversation with agent attributions

**Acceptance Criteria:**
- [ ] User can see which agent sent each message
- [ ] Handoff transitions are visible and clear
- [ ] Current agent indicator is accurate
- [ ] UI feels like talking to a team, not confusing

**Files to Create/Modify:**
- `src/features/check-ins/components/ai-response.tsx` (modify)
- `src/features/check-ins/components/message-thread.tsx` (modify or new)
- `src/features/check-ins/components/agent-indicator.tsx` (new)

---

## Phase 5: Polish & Edge Cases

### MA-5.1: Explicit Agent Requests

**Objective:** Allow users to explicitly request a specific agent.

**Requirements:**
1. Coach detects explicit agent requests
   - "Can I talk to the Goal Architect?"
   - "I want to speak with the Accountability Partner"
   - Add to Coach's system prompt

2. Handle requests for unavailable agents
   - "The Accountability Partner isn't available yet, but I can help with that..."
   - Graceful degradation for MVP (only Coach + Goal Architect)

3. Allow returning to Coach explicitly
   - "Can I go back to Coach?"
   - "I want to talk to Coach"

**Acceptance Criteria:**
- [ ] User can request Goal Architect explicitly
- [ ] User can request return to Coach
- [ ] Unavailable agents handled gracefully

**Files to Create/Modify:**
- `src/features/agents/coach/system-prompt.ts` (modify)

---

### MA-5.2: Session Recovery

**Objective:** Handle page refresh, reconnection, and session continuity.

**Requirements:**
1. Load session on page mount
   - Fetch active session for user
   - Restore message history
   - Restore active agent state

2. Handle expired/stale sessions
   - Session timeout (e.g., 24 hours)
   - Start fresh session if expired
   - Coach greeting on new session

3. Handle mid-conversation refresh
   - User refreshes during Goal Architect conversation
   - Should resume with Goal Architect, not reset to Coach

**Acceptance Criteria:**
- [ ] Page refresh preserves conversation
- [ ] Active agent is preserved across refresh
- [ ] Expired sessions start fresh with Coach
- [ ] Message history is displayed on reload

**Files to Create/Modify:**
- `src/features/check-ins/components/check-in-form.tsx` (modify)
- `src/features/memory/session-state.ts` (add expiration logic)

---

### MA-5.3: Error Handling & Fallbacks

**Objective:** Gracefully handle errors in the agent system.

**Requirements:**
1. Handle Claude API errors
   - Timeout, rate limit, service unavailable
   - Show friendly message, don't lose user's input
   - Retry logic with backoff

2. Handle handoff failures
   - Target agent fails to respond
   - Fall back to Coach with apology
   - Log error for debugging

3. Handle invalid state
   - Unknown agent in session
   - Corrupted session data
   - Reset to Coach as safe default

4. User-visible error messages
   - Don't show technical errors
   - "I'm having trouble right now, let me try again..."
   - Preserve conversation context

**Acceptance Criteria:**
- [ ] API errors don't crash the app
- [ ] Failed handoffs fall back to Coach
- [ ] User input is never lost
- [ ] Error messages are friendly

**Files to Create/Modify:**
- `src/features/agents/orchestrator.ts` (add error handling)
- `src/features/check-ins/components/error-boundary.tsx` (new or modify)

---

## Appendix: Future Agent Specs (Post-MVP)

These are placeholder specs for agents to be implemented after MVP.

### MA-F.1: Motivator Agent
- Personality: Enthusiastic cheerleader, genuine celebration
- Triggers: Achievements, milestones, low mood detection
- Tools: celebrateWin, encourageUser, returnToCoach

### MA-F.2: Pattern Analyst Agent
- Personality: Curious observer, data-driven insights
- Triggers: "How am I doing overall?", periodic insights
- Tools: analyzePatterns, generateInsights, returnToCoach
- Requires: Check-in history aggregation

### MA-F.3: Accountability Partner Agent
- Personality: Direct but caring, persistent follow-up
- Triggers: Missed commitments, commitment tracking
- Tools: followUpCommitment, acknowledgeProgress, returnToCoach
- Requires: Commitment tracking system

---

## Usage Instructions

To execute a spec:
1. Run the tech-spec workflow: `/bmad:bmm:workflows:create-tech-spec`
2. Reference this document and the specific spec ID (e.g., "MA-1.1")
3. The workflow will expand the stub into a full implementation-ready spec
4. Execute with `/bmad:bmm:workflows:quick-dev`

Execute in order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
