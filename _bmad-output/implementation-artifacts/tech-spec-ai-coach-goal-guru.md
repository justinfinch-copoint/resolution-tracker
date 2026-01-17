---
title: 'AI Coach Goal Guru Implementation'
slug: 'ai-coach-goal-guru'
created: '2026-01-17'
status: 'complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Vercel AI SDK 6.0.33 (ToolLoopAgent)
  - '@ai-sdk/anthropic' 3.0.12
  - Next.js 16 App Router
  - Drizzle ORM 0.45.1
  - TypeScript 5.x strict mode
  - Zod validation
  - React 19
files_to_modify:
  - resolution-tracker/src/features/ai-coach/tools.ts
  - resolution-tracker/src/features/ai-coach/context-builder.ts
  - resolution-tracker/src/features/ai-coach/prompts.ts
  - resolution-tracker/src/features/ai-coach/types.ts
  - resolution-tracker/app/api/chat/route.ts
  - resolution-tracker/app/api/goals/route.ts
  - resolution-tracker/app/api/goals/[id]/route.ts
  - resolution-tracker/app/api/goals/[id]/milestones/route.ts
  - resolution-tracker/app/api/milestones/[id]/route.ts
  - resolution-tracker/app/api/milestones/[id]/complete/route.ts
  - resolution-tracker/app/api/goals/[id]/intentions/route.ts
  - resolution-tracker/app/api/intentions/[id]/route.ts
  - resolution-tracker/src/features/goals/index.ts
  - resolution-tracker/src/features/milestones/index.ts
  - resolution-tracker/src/features/implementation-intentions/index.ts
  - _bmad-output/planning-artifacts/architecture.md
files_to_create:
  - resolution-tracker/src/features/goals/services.ts
  - resolution-tracker/src/features/milestones/services.ts
  - resolution-tracker/src/features/implementation-intentions/services.ts
  - resolution-tracker/src/features/ai-coach/agent.ts
  - resolution-tracker/src/features/ai-coach/knowledge-modules/base-persona.ts
  - resolution-tracker/src/features/ai-coach/knowledge-modules/goal-setup.ts
  - resolution-tracker/src/features/ai-coach/knowledge-modules/habit-psychology.ts
  - resolution-tracker/src/features/ai-coach/knowledge-modules/struggle-recovery.ts
  - resolution-tracker/src/features/ai-coach/knowledge-modules/return-engagement.ts
  - resolution-tracker/src/features/ai-coach/knowledge-modules/index.ts
  - resolution-tracker/src/lib/api-utils.ts
code_patterns:
  - Services layer for reusable business logic (validation + business rules + repository calls)
  - ToolLoopAgent class for agentic AI interactions
  - Knowledge modules as TypeScript files exporting prompt strings
  - Repository pattern (raw DB ops) → Services pattern (business logic) → API/Tools
  - Zod validation in services layer (shared between API and tools)
  - Result type pattern: { success: boolean, data?: T, error?: { code: string, message: string } }
test_patterns:
  - Co-located tests (*.test.ts next to source)
  - No existing tests for services - establish pattern
---

# Tech-Spec: AI Coach Goal Guru Implementation

**Created:** 2026-01-17

## Overview

### Problem Statement

The current AI Coach can record check-ins and update user summaries, but cannot create or modify goals. Users must use separate CRUD screens for goal management. This fragments the experience — the PRD's "aha moment" is feeling like talking to someone who knows you, not switching between a chatbot and forms.

Additionally, the current architecture has business logic split between:
- Repository layer (transaction-based checks like MAX_ACTIVE_GOALS)
- API routes (Zod validation, pre-checks)

This makes it hard for AI tools to reuse the same logic, risking inconsistency.

### Solution

1. **Add Services Layer**: Create `services.ts` for each feature that encapsulates validation (Zod) + business rules + repository calls. Both API routes and AI tools call services.

2. **Implement Goal Guru Tools**: Add AI tools for complete goal lifecycle management:
   - `createGoal` - Create goals through conversation
   - `updateGoal` - Modify goals (title, status, enhanced fields)
   - `pauseGoal` / `resumeGoal` - Explicit pause/resume
   - `addMilestone` - Create milestones for project goals
   - `addImplementationIntention` - Create if-then plans

3. **Migrate to ToolLoopAgent**: Refactor from `streamText()` to Vercel AI SDK's `ToolLoopAgent` class for cleaner agent abstraction and reusable agent definition.

4. **Implement Knowledge Modules**: Create domain-specific knowledge modules (goal-setup, habit-psychology, struggle-recovery, etc.) that get injected into prompts based on conversation context.

5. **Update Architecture Document**: Document the services layer pattern as Decision 11.

### Scope

**In Scope:**
- Services layer for goals, milestones, implementation-intentions
- Goal Guru tools (createGoal, updateGoal, pauseGoal, resumeGoal, addMilestone, addImplementationIntention)
- ToolLoopAgent migration for AI Coach
- Knowledge modules (base-persona, goal-setup, habit-psychology, struggle-recovery, return-engagement)
- Update architecture document with services layer pattern (Decision 11)
- Conversational goal setup flow (What → Why → How → Measure → Recovery)
- Refactor API routes to use services layer

**Out of Scope:**
- Removing goal CRUD UI pages (separate task after this works)
- Mobile-specific optimizations
- Advanced analytics/charts
- Fitness/finance/learning domain modules (can add later)
- Automatic sentiment detection for phase selection (manual via tool for now)

## Context for Development

### Codebase Patterns

**From investigation:**

**Current Architecture (to be updated):**
```
API Routes → Repository (DB ops + transaction business rules)
           → Queries (transforms + some business checks)

AI Tools → Repository directly
```

**New Architecture:**
```
API Routes → Services (validation + business rules + repository calls)
                    ↓
              Repository (raw DB operations)

AI Tools → Services (same business logic as API)
```

**Service Result Pattern:**
```typescript
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

**ToolLoopAgent Pattern:**
```typescript
import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const coachAgent = new ToolLoopAgent({
  model: anthropic('claude-sonnet-4-20250514'),
  instructions: systemPrompt,
  tools: coachTools,
  stopWhen: stepCountIs(10),
});

// In API route:
const result = coachAgent.stream({ messages: modelMessages });
return result.toUIMessageStreamResponse();
```

**Knowledge Module Pattern (All Modules with Conditional Activation):**
```typescript
// knowledge-modules/index.ts
// All modules are always included - AI self-selects based on user message
export function buildKnowledgeModulesPrompt(): string {
  return `
${BASE_PERSONA_MODULE}

## Conditional Coaching Guidance
Apply the relevant section(s) below based on what the user is discussing.

### When User Wants to CREATE or SET UP a New Goal:
${GOAL_SETUP_MODULE}

### When User Has a HABIT-Type Goal and Is Discussing It:
${HABIT_PSYCHOLOGY_MODULE}

### When User Expresses FRUSTRATION, FAILURE, or SETBACK:
${STRUGGLE_RECOVERY_MODULE}

### When User Is RETURNING After Extended Absence (14+ days):
${RETURN_ENGAGEMENT_MODULE}
`;
}
```

**Rationale:** Including all modules (~2-3K tokens, ~$0.006-0.009/request) is simpler than implementing routing logic. The AI is capable of reading conditional sections and applying only what's relevant. This avoids:
- Custom semantic router implementation complexity
- Additional API calls for classification
- Edge cases around module switching mid-conversation

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `resolution-tracker/src/features/goals/repository.ts` | DB operations with transaction-based MAX_GOALS check |
| `resolution-tracker/src/features/goals/types.ts` | Zod schemas (createGoalSchema, updateGoalSchema), constants |
| `resolution-tracker/src/features/goals/queries.ts` | Transform functions (transformGoalToResponse) |
| `resolution-tracker/src/features/milestones/repository.ts` | Milestone CRUD with ownership verification |
| `resolution-tracker/src/features/milestones/types.ts` | Milestone Zod schemas |
| `resolution-tracker/src/features/implementation-intentions/repository.ts` | Intention CRUD with ownership verification |
| `resolution-tracker/src/features/implementation-intentions/types.ts` | Intention Zod schemas |
| `resolution-tracker/src/features/check-ins/repository.ts` | createCheckIn with goal update transaction |
| `resolution-tracker/src/features/ai-coach/tools.ts` | Current AI tools (recordCheckIn, etc.) |
| `resolution-tracker/src/features/ai-coach/prompts.ts` | Current system prompt builder |
| `resolution-tracker/src/features/ai-coach/context-builder.ts` | Current context assembly |
| `resolution-tracker/app/api/chat/route.ts` | Current streamText implementation |
| `resolution-tracker/app/api/goals/route.ts` | Current goals API (validation pattern) |
| `_bmad-output/planning-artifacts/architecture.md` | Architecture decisions document |

### Technical Decisions

1. **Services layer pattern**: Services handle validation (Zod) + business rules + repository calls. Return `ServiceResult<T>` for consistent error handling. This replaces the current split between API route validation and repository business logic.

2. **ToolLoopAgent migration**: Migrate from `streamText()` to `ToolLoopAgent` class. Use `stopWhen: stepCountIs(10)` for goal setup conversations that may need multiple tool calls. The agent is defined once and reused across requests.

3. **Knowledge module injection (all modules, conditional activation)**: Modules are TypeScript files exporting prompt strings. All modules are always included in the system prompt with conditional activation headers (e.g., "When user wants to CREATE a new goal..."). The AI self-selects which sections to apply based on the user's message. This approach was chosen over rule-based selection or semantic routing because:
   - Simpler implementation (no routing logic)
   - Zero additional latency (no classification step)
   - Handles intent detection naturally (AI understands context)
   - Token cost is minimal (~2-3K tokens, ~$0.006-0.009/request)

4. **Goal setup flow via tools**: AI guides users through What → Why → How → Measure → Recovery. After each piece of info, AI calls `updateGoal` tool to persist incrementally. User doesn't fill a form — they have a conversation.

5. **Backward compatibility**: Keep existing tools working (recordCheckIn, updateUserSummary, etc.). Add new Goal Guru tools alongside. API routes continue to work but use services layer.

6. **Error handling in tools**: Tools catch service errors and return `{ success: false, message }` so AI can respond appropriately to the user (e.g., "You've reached the maximum of 5 active goals").

## Implementation Plan

### Task Overview

| Phase | Description | Tasks |
|-------|-------------|-------|
| 1 | Services Layer | Tasks 1-4 |
| 2 | ToolLoopAgent Setup | Tasks 5-6 |
| 3 | Goal Guru Tools | Tasks 7-10 |
| 4 | Knowledge Modules | Tasks 11-14 |
| 5 | API Route Refactor | Tasks 15-17 |
| 6 | Architecture Doc Update | Task 18 |

---

### Phase 1: Services Layer

- [x] **Task 1: Create goals services layer**
  - File: `resolution-tracker/src/features/goals/services.ts` (create)
  - Actions:
    1. Define `ServiceResult<T>` type
    2. Create `createGoalService(userId, input)` - Zod validation + canCreateGoal check + repository.createGoal
    3. Create `updateGoalService(id, userId, input)` - Zod validation + repository.updateGoal
    4. Create `pauseGoalService(id, userId)` - sets status to 'paused'
    5. Create `resumeGoalService(id, userId)` - checks active limit + sets status to 'active'
    6. Create `getGoalService(id, userId)` - returns transformed response
    7. Create `listGoalsService(userId)` - returns transformed responses
  - Notes: All functions return `ServiceResult<GoalResponse>` or `ServiceResult<GoalResponse[]>`

- [x] **Task 2: Create milestones services layer**
  - File: `resolution-tracker/src/features/milestones/services.ts` (create)
  - Actions:
    1. Create `createMilestoneService(goalId, userId, input)` - Zod validation + ownership check + repository.createMilestone
    2. Create `updateMilestoneService(id, userId, input)` - Zod validation + repository.updateMilestone
    3. Create `completeMilestoneService(id, userId)` - repository.completeMilestone
    4. Create `listMilestonesService(goalId, userId)` - ownership check + repository.getMilestonesByGoalId
  - Notes: Ownership verification via goal relationship

- [x] **Task 3: Create implementation-intentions services layer**
  - File: `resolution-tracker/src/features/implementation-intentions/services.ts` (create)
  - Actions:
    1. Create `createIntentionService(goalId, userId, input)` - Zod validation + repository.createIntention
    2. Create `updateIntentionService(id, userId, input)` - Zod validation + repository.updateIntention
    3. Create `toggleIntentionService(id, userId)` - repository.toggleIntentionActive
    4. Create `listIntentionsService(goalId, userId)` - repository.getIntentionsByGoalId
  - Notes: "If X, then Y" structure for behavior change

- [x] **Task 4: Export services from feature indexes**
  - Files:
    - `resolution-tracker/src/features/goals/index.ts`
    - `resolution-tracker/src/features/milestones/index.ts`
    - `resolution-tracker/src/features/implementation-intentions/index.ts`
  - Actions:
    1. Add exports for all service functions
    2. Export `ServiceResult` type from goals (shared)
  - Notes: Services are the new public API for features

---

### Phase 2: ToolLoopAgent Setup

- [x] **Task 5: Create AI Coach agent definition**
  - File: `resolution-tracker/src/features/ai-coach/agent.ts` (create)
  - Actions:
    1. Import `ToolLoopAgent`, `stepCountIs` from 'ai'
    2. Import `anthropic` from '@ai-sdk/anthropic'
    3. Define `createCoachAgent(systemPrompt, tools)` factory function
    4. Configure with `stopWhen: stepCountIs(10)`
    5. Export agent type with `InferAgentUIMessage`
  - Notes: Agent is created per-request with dynamic system prompt

- [x] **Task 6: Update chat API route to use ToolLoopAgent**
  - File: `resolution-tracker/app/api/chat/route.ts`
  - Actions:
    1. Import `createCoachAgent` from agent.ts
    2. Replace `streamText()` call with `agent.stream()`
    3. Return `result.toUIMessageStreamResponse()` (same as before)
    4. Keep auth check and context building unchanged
  - Notes: API surface unchanged, internal implementation updated

---

### Phase 3: Goal Guru Tools

- [x] **Task 7: Add createGoal tool**
  - File: `resolution-tracker/src/features/ai-coach/tools.ts`
  - Actions:
    1. Add `createGoal` tool with Zod schema matching createGoalSchema
    2. Input: title (required), goalType, whyItMatters, successCriteria, targetDate, currentBaseline, recoveryPlan, targetValue, targetUnit, frequencyPerWeek
    3. Execute: Call `createGoalService(userId, input)`
    4. Return: `{ success, goalId?, message }`
  - Notes: AI extracts structured data from conversation

- [x] **Task 8: Add updateGoal tool**
  - File: `resolution-tracker/src/features/ai-coach/tools.ts`
  - Actions:
    1. Add `updateGoal` tool for modifying existing goals
    2. Input: goalId (required), plus all optional update fields
    3. Execute: Call `updateGoalService(id, userId, input)`
    4. Return: `{ success, message }`
  - Notes: Used for incremental goal refinement during setup

- [x] **Task 9: Add pauseGoal and resumeGoal tools**
  - File: `resolution-tracker/src/features/ai-coach/tools.ts`
  - Actions:
    1. Add `pauseGoal` tool - Input: goalId; Execute: `pauseGoalService(id, userId)`
    2. Add `resumeGoal` tool - Input: goalId; Execute: `resumeGoalService(id, userId)`
  - Notes: Non-punitive pause allows users to take breaks

- [x] **Task 10: Add addMilestone and addImplementationIntention tools**
  - File: `resolution-tracker/src/features/ai-coach/tools.ts`
  - Actions:
    1. Add `addMilestone` tool - Input: goalId, title, description?, targetDate?
    2. Add `addImplementationIntention` tool - Input: goalId, triggerCondition, action
    3. Execute: Call respective service functions
  - Notes: For project goals (milestones) and all goals (intentions)

---

### Phase 4: Knowledge Modules

- [x] **Task 11: Create base persona module**
  - File: `resolution-tracker/src/features/ai-coach/knowledge-modules/base-persona.ts` (create)
  - Actions:
    1. Extract base personality from current prompts.ts
    2. Include: warm/encouraging tone, non-judgmental, practical, memory-aware
    3. Include: "better than nothing" philosophy, no guilt mechanics
    4. Include: tool usage guidelines
  - Notes: Always included in system prompt

- [x] **Task 12: Create goal setup module**
  - File: `resolution-tracker/src/features/ai-coach/knowledge-modules/goal-setup.ts` (create)
  - Actions:
    1. Create conversational flow guide for What → Why → How → Measure → Recovery
    2. Include prompts for each step (e.g., "What's driving this for you?")
    3. Include guidance on when to call createGoal vs updateGoal
    4. Include goal type detection hints
  - Notes: Activated when no goals exist or user expresses intent to create

- [x] **Task 13: Create remaining knowledge modules**
  - Files:
    - `resolution-tracker/src/features/ai-coach/knowledge-modules/habit-psychology.ts`
    - `resolution-tracker/src/features/ai-coach/knowledge-modules/struggle-recovery.ts`
    - `resolution-tracker/src/features/ai-coach/knowledge-modules/return-engagement.ts`
  - Actions:
    1. habit-psychology: Habit stacking, cue-routine-reward, small wins, non-punitive streaks
    2. struggle-recovery: What-the-hell effect prevention, scope reduction, recovery plan activation
    3. return-engagement: Warm welcome, no guilt about absence, fresh start option
  - Notes: Content from PRD and architecture doc Decision 10

- [x] **Task 14: Create knowledge module index and update context builder**
  - Files:
    - `resolution-tracker/src/features/ai-coach/knowledge-modules/index.ts` (update)
    - `resolution-tracker/src/features/ai-coach/prompts.ts` (update)
  - Actions:
    1. Update index.ts to export `buildKnowledgeModulesPrompt()` function that combines all modules with conditional activation headers
    2. Remove `selectKnowledgeModules(context)` function (no longer needed)
    3. Update `buildSystemPrompt` to call `buildKnowledgeModulesPrompt()` and include full output
    4. Remove module selection logic from context builder
  - Notes: All modules always included with conditional headers - AI self-selects based on user message

---

### Phase 5: API Route Refactor

- [x] **Task 15: Refactor goals API routes to use services**
  - Files:
    - `resolution-tracker/app/api/goals/route.ts`
    - `resolution-tracker/app/api/goals/[id]/route.ts`
  - Actions:
    1. Replace direct repository calls with service calls
    2. Remove Zod validation from routes (now in services)
    3. Map service errors to HTTP responses (code → status)
  - Notes: Routes become thin HTTP adapters

- [x] **Task 16: Refactor milestones API routes to use services**
  - Files:
    - `resolution-tracker/app/api/goals/[id]/milestones/route.ts`
    - `resolution-tracker/app/api/milestones/[id]/route.ts`
    - `resolution-tracker/app/api/milestones/[id]/complete/route.ts`
  - Actions:
    1. Replace direct repository calls with service calls
    2. Remove Zod validation from routes
  - Notes: Same pattern as goals

- [x] **Task 17: Refactor implementation-intentions API routes to use services**
  - Files:
    - `resolution-tracker/app/api/goals/[id]/intentions/route.ts`
    - `resolution-tracker/app/api/intentions/[id]/route.ts`
  - Actions:
    1. Replace direct repository calls with service calls
    2. Remove Zod validation from routes
  - Notes: Same pattern as goals and milestones

---

### Phase 6: Architecture Documentation

- [x] **Task 18: Update architecture document with Decision 11**
  - File: `_bmad-output/planning-artifacts/architecture.md`
  - Actions:
    1. Add "Decision 11: Services Layer Pattern"
    2. Document: Repository → Services → API/Tools flow
    3. Document: `ServiceResult<T>` pattern
    4. Update Project Structure section with services.ts files
    5. Update AI Agent Implementation Guidelines
  - Notes: Ensures future AI agents follow the pattern

---

### Acceptance Criteria

#### Services Layer

- [x] **AC1:** Given a valid goal creation request, when `createGoalService()` is called, then it validates with Zod, checks active goal limit, creates goal, and returns `{ success: true, data: GoalResponse }`.

- [x] **AC2:** Given an invalid goal type, when `createGoalService()` is called, then it returns `{ success: false, error: { code: 'VALIDATION_ERROR', message } }` without calling repository.

- [x] **AC3:** Given user has 5 active goals, when `createGoalService()` is called, then it returns `{ success: false, error: { code: 'MAX_GOALS_REACHED', message } }`.

- [x] **AC4:** Given a valid milestone creation, when `createMilestoneService()` is called with goalId owned by different user, then it returns `{ success: false, error: { code: 'NOT_FOUND', message } }`.

#### ToolLoopAgent

- [x] **AC5:** Given a chat request, when the API route processes it, then it uses ToolLoopAgent.stream() and returns streaming response.

- [x] **AC6:** Given a conversation requiring multiple tool calls, when AI processes it, then ToolLoopAgent executes up to 10 steps before stopping.

#### Goal Guru Tools

- [x] **AC7:** Given AI detects user wants to create a goal, when AI calls `createGoal` tool with extracted title, then a new goal is created and AI confirms creation.

- [x] **AC8:** Given AI is guiding user through goal setup and learns "why it matters", when AI calls `updateGoal` tool with whyItMatters field, then the goal is updated incrementally.

- [x] **AC9:** Given user says "I need to take a break from this goal", when AI calls `pauseGoal` tool, then goal status changes to 'paused' without judgment.

- [x] **AC10:** Given user wants to add an if-then plan, when AI calls `addImplementationIntention` tool with trigger and action, then intention is created and linked to goal.

#### Knowledge Modules

- [x] **AC11:** Given any chat request, when system prompt is built, then ALL knowledge modules (GOAL_SETUP, HABIT_PSYCHOLOGY, STRUGGLE_RECOVERY, RETURN_ENGAGEMENT) are included with conditional activation headers.

- [x] **AC12:** Given user says "I want to create a new goal", when AI processes the message, then AI applies GOAL_SETUP_MODULE guidance (conversational flow: What → Why → How → Measure → Recovery).

- [x] **AC13:** Given user expresses frustration about a goal, when AI processes the message, then AI applies STRUGGLE_RECOVERY_MODULE guidance (no guilt, scope reduction, recovery plan).

#### API Route Refactor

- [x] **AC14:** Given POST `/api/goals` with invalid data, when services layer validates, then response is 400 with same error format as before.

- [x] **AC15:** Given both AI tool and API route create a goal, when goal limit is reached, then both return consistent MAX_GOALS_REACHED error.

#### Architecture Documentation

- [x] **AC16:** Given architecture.md is updated, when an AI agent reads it, then it understands to use services layer instead of repository directly.

## Additional Context

### Dependencies

- **Vercel AI SDK 6.0.33** - Already installed, includes ToolLoopAgent
- **@ai-sdk/anthropic 3.0.12** - Already installed for Claude provider
- **Zod** - Already installed and used in types.ts files
- **No new packages required**

### Testing Strategy

**Unit Tests:**
- `services.test.ts` for each feature - validation, business rules, error cases
- `agent.test.ts` - ToolLoopAgent creation with mocked provider
- `knowledge-modules/index.test.ts` - verify `buildKnowledgeModulesPrompt()` includes all modules with conditional headers

**Integration Tests:**
- API route tests verifying service layer integration
- Tool execution tests with mocked services

**Manual Testing:**
- Create goal through conversation (all 5 steps)
- Pause and resume goal through conversation
- Add milestones to project goal through conversation
- Verify AI applies correct guidance based on user intent (goal setup, struggle, etc.)
- Test max goals limit through both AI and API

### Notes

**High-Risk Items:**
- ToolLoopAgent API may differ slightly from docs - verify with actual SDK
- Knowledge module prompt size - monitor token usage
- Service error code mapping to HTTP status codes

**Known Limitations:**
- All modules always included increases token usage (~2-3K tokens per request)
- Domain modules (fitness, finance) not included in this spec

**Future Considerations (Out of Scope):**
- Remove goal CRUD UI pages after AI-first flow is validated
- Add more domain-specific knowledge modules
- If module count grows significantly (10+), consider semantic router for module selection:
  - Use embedding-based classification (e.g., `semantic-router` pattern)
  - Pre-compute route embeddings, classify user message with cosine similarity
  - Adds ~50-100ms latency but reduces token cost
- Sentiment analysis for automatic struggle detection
- Proactive engagement based on check-in patterns

---

## Review Notes

- Adversarial review completed: 2026-01-17
- Findings: 10 total, 6 real issues fixed, 4 noise/by-design skipped
- Resolution approach: Auto-fix

**Fixes Applied:**
- F10 (Critical): Added goalType to system prompt goals section so AI can identify habit/target/project goals
- F7 (High): Added daysSinceLastCheckIn to system prompt so AI can determine extended absence
- F1 (Medium): Updated architecture document Decision 10 with new "all modules with conditional headers" approach
- F3/F9 (Medium): Clarified 14+ days extended absence threshold in adaptive tone section
- F5 (Low): Removed specific token cost estimates from code comments (may become stale)

**Skipped (noise/by-design):**
- F2: ChatContext removal intentional per spec
- F4: Lost testability is accepted tradeoff for simplicity
- F6: No enforcement of conditional activation is the design
- F8: Removed helpers were internal-only
