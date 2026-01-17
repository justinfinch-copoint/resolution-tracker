---
title: 'Enhanced Goal System Backend Implementation'
slug: 'enhanced-goal-system-backend'
created: '2026-01-17'
status: 'complete'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack:
  - Next.js 16 App Router
  - Drizzle ORM
  - PostgreSQL
  - Supabase Auth
  - Zod validation
  - TypeScript strict mode
files_to_modify:
  - resolution-tracker/src/db/schema.ts
  - resolution-tracker/src/features/goals/repository.ts
  - resolution-tracker/src/features/goals/queries.ts
  - resolution-tracker/src/features/goals/types.ts
  - resolution-tracker/src/features/check-ins/repository.ts
  - resolution-tracker/src/features/check-ins/types.ts
  - resolution-tracker/src/features/ai-coach/tools.ts
files_to_create:
  - resolution-tracker/src/features/milestones/
  - resolution-tracker/src/features/implementation-intentions/
  - resolution-tracker/app/api/check-ins/route.ts
  - resolution-tracker/app/api/milestones/route.ts
  - resolution-tracker/app/api/implementation-intentions/route.ts
code_patterns:
  - DDD vertical slice architecture
  - Repository pattern (raw DB ops) + Queries pattern (business logic + transforms)
  - Snake_case DB columns, camelCase API responses
  - Transform functions convert DB to API types
  - Drizzle migrations (never push)
  - Zod for validation schemas
test_patterns:
  - Co-located tests (*.test.ts next to source)
  - No tests exist yet - establish pattern
---

# Tech-Spec: Enhanced Goal System Backend Implementation

**Created:** 2026-01-17

## Overview

### Problem Statement

The current goal model only stores `title` and `status` — insufficient for helping users achieve their goals. Research on goal-setting effectiveness (Locke & Latham, implementation intentions, SMART criteria) shows that effective goals need:

- **Structured types** (Habit/Target/Project) with type-specific tracking
- **Implementation intentions** ("If X, then Y" plans) to bridge the intention-behavior gap
- **Milestones** for complex goals and progress visualization
- **Success criteria** and progress measurement tied to goal type
- **Recovery plans** to prevent the "what-the-hell effect" when users slip

The current check-in model is also too loose — just free text optionally tied to a goal. We can't calculate completion rates, track progress toward targets, or identify milestone completions.

### Solution

Implement a research-backed enhanced goal data model with:

1. **Enhanced goals table** with goal_type, motivation fields, type-specific tracking fields
2. **New milestones table** for breaking down goals into trackable sub-goals
3. **New implementation_intentions table** for if-then planning
4. **Enhanced check_ins table** with structured progress fields by goal type
5. **Full API layer** with validation, repository, and route handlers

Fresh migration approach: delete existing migrations, create single new migration.

### Scope

**In Scope:**
- Database schema changes (4 tables: enhanced goals, milestones, implementation_intentions, enhanced check_ins)
- New enums: `goal_type` (habit, target, project), `progress_sentiment` (behind, on_track, ahead), `habit_status` (completed, skipped, missed)
- Repository layer for all entities
- API routes with Zod validation
- Type definitions
- Delete existing migrations, create fresh single migration

**Out of Scope:**
- UI/frontend changes
- AI coach prompt updates to leverage new fields
- Conversational goal setup flow
- Data migration (no existing production data)

## Context for Development

### Codebase Patterns

**From investigation:**

- **Database**: Drizzle ORM, snake_case tables/columns, always generate migrations (never push)
- **API Routes**: Thin handlers — validate input, delegate to feature services, return responses
- **API Responses**: Return data directly on success, `{ error: string, code: string }` on failure
- **Transform Pattern**: `transformGoalToResponse()` in queries.ts converts DB types to API types
- **Repository Pattern**: `repository.ts` handles raw DB operations (select, insert, update, delete)
- **Queries Pattern**: `queries.ts` handles business logic and calls repository + transforms
- **Validation**: Currently manual in API routes, but Zod available (used in `ai-coach/tools.ts`)
- **Feature Structure**: Each feature has `repository.ts`, `types.ts`, `queries.ts`, `index.ts`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `resolution-tracker/src/db/schema.ts` | Current schema — goals minimal, check_ins with optional goal_id |
| `resolution-tracker/src/features/goals/repository.ts` | CRUD with transaction for limit checks |
| `resolution-tracker/src/features/goals/queries.ts` | Transform + business logic |
| `resolution-tracker/src/features/goals/types.ts` | Types, constants, validation helpers |
| `resolution-tracker/src/features/check-ins/repository.ts` | Basic CRUD, no structured progress |
| `resolution-tracker/src/features/ai-coach/tools.ts` | Zod schema example for validation |
| `resolution-tracker/app/api/goals/route.ts` | API pattern example (GET list, POST create) |
| `resolution-tracker/app/api/goals/[id]/route.ts` | API pattern example (GET single, PATCH, DELETE) |
| `resolution-tracker/drizzle.config.ts` | Migration config — schema at `./src/db/schema.ts` |

### Technical Decisions

1. **goal_id required on check-ins** — All check-ins must be tied to a goal (no "general" check-ins)
2. **Habit tracking by day** — Track completion status per day with skip option (non-punitive)
3. **progress_sentiment stored** — AI-assessed field updated during check-ins, not computed on-fly
4. **Single migration** — Delete existing 3 migrations, create fresh schema migration
5. **Nullable enhanced fields** — Fields like `why_it_matters` are nullable (extracted conversationally over time)
6. **Use Zod for API validation** — Consistent with AI tools pattern, replace manual validation
7. **Milestones & Implementation Intentions as separate features** — Own their own repository, types, queries

## Implementation Plan

### Task Overview

| Phase | Description | Tasks |
|-------|-------------|-------|
| 1 | Database Schema | Tasks 1-4 |
| 2 | Goals Feature | Tasks 5-8 |
| 3 | Check-ins Feature | Tasks 9-12 |
| 4 | Milestones Feature | Tasks 13-16 |
| 5 | Implementation Intentions Feature | Tasks 17-20 |
| 6 | AI Coach Integration | Task 21 |

---

### Phase 1: Database Schema

- [x] **Task 1: Clean up existing migrations**
  - Files to delete:
    - `resolution-tracker/drizzle/migrations/0000_parallel_union_jack.sql`
    - `resolution-tracker/drizzle/migrations/0001_silky_katie_power.sql`
    - `resolution-tracker/drizzle/migrations/0002_striped_stark_industries.sql`
    - `resolution-tracker/drizzle/migrations/meta/*`
  - Action: Delete all files in `drizzle/migrations/` directory
  - Notes: Fresh start since no production data exists

- [x] **Task 2: Update database schema with enhanced goal model**
  - File: `resolution-tracker/src/db/schema.ts`
  - Actions:
    1. Add new enums:
       - `goal_type_enum`: `'habit' | 'target' | 'project'`
       - `progress_sentiment_enum`: `'behind' | 'on_track' | 'ahead'`
       - `habit_completion_status_enum`: `'completed' | 'skipped' | 'missed'`
    2. Enhance `goals` table with new columns:
       - `goal_type` (enum, not null, default 'habit')
       - `success_criteria` (text, nullable)
       - `target_date` (timestamp, nullable)
       - `why_it_matters` (text, nullable)
       - `current_baseline` (text, nullable)
       - `recovery_plan` (text, nullable)
       - `target_value` (numeric, nullable) — for Target type
       - `target_unit` (text, nullable) — for Target type (e.g., "dollars", "miles")
       - `frequency_per_week` (integer, nullable) — for Habit type
       - `progress_sentiment` (enum, nullable)
       - `check_in_count` (integer, default 0)
       - `last_check_in_at` (timestamp, nullable)
    3. Create `milestones` table:
       - `id` (uuid, pk)
       - `goal_id` (uuid, fk to goals, cascade delete)
       - `title` (text, not null)
       - `description` (text, nullable)
       - `target_date` (timestamp, nullable)
       - `sort_order` (integer, not null, default 0)
       - `completed_at` (timestamp, nullable)
       - `created_at` (timestamp, not null)
       - Index on `goal_id`
    4. Create `implementation_intentions` table:
       - `id` (uuid, pk)
       - `goal_id` (uuid, fk to goals, cascade delete)
       - `trigger_condition` (text, not null) — the "If..." part
       - `action` (text, not null) — the "Then I will..." part
       - `is_active` (boolean, default true)
       - `created_at` (timestamp, not null)
       - Index on `goal_id`
    5. Enhance `check_ins` table:
       - Change `goal_id` to NOT NULL (required)
       - Add `milestone_id` (uuid, nullable, fk to milestones, set null on delete)
       - Add `value_recorded` (numeric, nullable) — for Target progress
       - Add `habit_completion_status` (enum, nullable) — for Habit tracking
       - Add `check_in_date` (date, not null, default today) — for habit day tracking
       - Index on `check_in_date`
    6. Export all new types
  - Notes: Follow existing patterns for enums, indexes, type exports

- [x] **Task 3: Generate fresh migration**
  - Command: `cd resolution-tracker && npm run db:generate`
  - Action: Run Drizzle Kit to generate SQL migration from schema
  - Notes: Should produce single migration file with complete schema

- [x] **Task 4: Apply migration to local database**
  - Command: `cd resolution-tracker && npm run db:migrate`
  - Action: Apply migration to local Postgres
  - Notes: May need to drop existing tables first if they conflict

---

### Phase 2: Goals Feature Updates

- [x] **Task 5: Update goals types with new fields and Zod schemas**
  - File: `resolution-tracker/src/features/goals/types.ts`
  - Actions:
    1. Add goal type constants: `GOAL_TYPES = ['habit', 'target', 'project'] as const`
    2. Add progress sentiment constants: `PROGRESS_SENTIMENTS = ['behind', 'on_track', 'ahead'] as const`
    3. Create Zod schemas:
       - `createGoalSchema` — validates title (required), goal_type, optional enhanced fields
       - `updateGoalSchema` — partial version for PATCH
    4. Update `CreateGoalInput` type with all new optional fields
    5. Update `UpdateGoalInput` type with all new optional fields
    6. Update `GoalResponse` type with all new fields (camelCase)
    7. Add validation helpers: `isValidGoalType()`, `isValidProgressSentiment()`
  - Notes: Enhanced fields are optional at creation (populated conversationally)

- [x] **Task 6: Update goals repository for new fields**
  - File: `resolution-tracker/src/features/goals/repository.ts`
  - Actions:
    1. Update `createGoal()` to accept all new fields
    2. Update `updateGoal()` to handle all new fields
    3. Add `incrementCheckInCount()` function — called when check-in created
    4. Add `updateProgressSentiment()` function — for AI to update sentiment
    5. Add `getGoalWithRelations()` — returns goal with milestones and implementation intentions
  - Notes: Keep transaction logic for active goal limit

- [x] **Task 7: Update goals queries with new transforms**
  - File: `resolution-tracker/src/features/goals/queries.ts`
  - Actions:
    1. Update `transformGoalToResponse()` to include all new fields
    2. Add `transformGoalWithRelationsToResponse()` for full detail view
    3. Update `getUserGoals()` if filtering by type needed
  - Notes: Ensure dates converted to ISO strings, nulls preserved

- [x] **Task 8: Update goals API routes with Zod validation**
  - Files:
    - `resolution-tracker/app/api/goals/route.ts`
    - `resolution-tracker/app/api/goals/[id]/route.ts`
  - Actions:
    1. Import Zod schemas from types
    2. Replace manual validation with `schema.safeParse(body)`
    3. Update POST to accept all new fields
    4. Update PATCH to accept all new fields
    5. Add GET `/api/goals/[id]` to return goal with relations (milestones, intentions)
  - Notes: Keep existing error response format `{ error, code }`

---

### Phase 3: Check-ins Feature Updates

- [x] **Task 9: Update check-ins types with structured progress**
  - File: `resolution-tracker/src/features/check-ins/types.ts`
  - Actions:
    1. Add habit status constants: `HABIT_COMPLETION_STATUSES = ['completed', 'skipped', 'missed'] as const`
    2. Create Zod schemas:
       - `createCheckInSchema` — goalId (required), content, optional structured fields
    3. Update `CreateCheckInInput`:
       - `goalId` — string (required, no longer nullable)
       - `content` — string
       - `milestoneId` — string | null (for project milestone completions)
       - `valueRecorded` — number | null (for target progress)
       - `habitCompletionStatus` — enum | null (for habit tracking)
       - `checkInDate` — string (ISO date, defaults to today)
    4. Update `CheckInResponse` with new fields (camelCase)
  - Notes: goalId is now required per technical decision

- [x] **Task 10: Update check-ins repository for structured progress**
  - File: `resolution-tracker/src/features/check-ins/repository.ts`
  - Actions:
    1. Update `createCheckIn()` to accept all new fields
    2. After creating check-in, call `goals.incrementCheckInCount()` and update `last_check_in_at`
    3. Add `getCheckInsByGoalId()` — for goal-specific history
    4. Add `getHabitCheckInsForPeriod()` — for habit completion rate calculation
    5. Add `getLatestValueCheckIn()` — for target progress (most recent value_recorded)
  - Notes: Consider transaction for check-in + goal update atomicity

- [x] **Task 11: Add check-ins queries for progress calculations**
  - File: `resolution-tracker/src/features/check-ins/queries.ts` (create if needed)
  - Actions:
    1. Add `transformCheckInToResponse()`
    2. Add `calculateHabitCompletionRate(goalId, startDate, endDate)` — completed / (completed + missed)
    3. Add `calculateTargetProgress(goalId)` — latest value / target value
    4. Add `getCheckInHistory(goalId)` — transformed check-ins for a goal
  - Notes: Skip percentage counts skips as neutral (not failure)

- [x] **Task 12: Create check-ins API routes**
  - Files:
    - `resolution-tracker/app/api/check-ins/route.ts` (create)
    - `resolution-tracker/app/api/check-ins/[id]/route.ts` (create)
  - Actions:
    1. GET `/api/check-ins` — list check-ins for user (optional goalId filter)
    2. POST `/api/check-ins` — create check-in with Zod validation
    3. GET `/api/check-ins/[id]` — get single check-in
    4. DELETE `/api/check-ins/[id]` — delete check-in (optional, for corrections)
  - Notes: Follow existing API route patterns from goals

---

### Phase 4: Milestones Feature (New)

- [x] **Task 13: Create milestones types**
  - File: `resolution-tracker/src/features/milestones/types.ts` (create)
  - Actions:
    1. Re-export DB types from schema
    2. Create Zod schemas:
       - `createMilestoneSchema` — goalId, title (required), description, targetDate, sortOrder
       - `updateMilestoneSchema` — partial for PATCH
       - `completeMilestoneSchema` — just id
    3. Define `MilestoneResponse` type (camelCase)
    4. Add validation helpers
  - Notes: Milestones belong to goals, cascade delete

- [x] **Task 14: Create milestones repository**
  - File: `resolution-tracker/src/features/milestones/repository.ts` (create)
  - Actions:
    1. `getMilestonesByGoalId(goalId)` — ordered by sort_order
    2. `getMilestoneById(id, userId)` — with ownership check via goal
    3. `createMilestone(goalId, input)`
    4. `updateMilestone(id, userId, input)`
    5. `completeMilestone(id, userId)` — sets completed_at
    6. `deleteMilestone(id, userId)`
    7. `reorderMilestones(goalId, milestoneIds)` — update sort_order
  - Notes: Ownership verified by joining to goals table

- [x] **Task 15: Create milestones queries and index**
  - Files:
    - `resolution-tracker/src/features/milestones/queries.ts` (create)
    - `resolution-tracker/src/features/milestones/index.ts` (create)
  - Actions:
    1. `transformMilestoneToResponse()`
    2. `getMilestonesForGoal(goalId, userId)` — validated + transformed
    3. `calculateMilestoneProgress(goalId)` — completed / total
    4. Export all from index.ts
  - Notes: Progress calculation for project-type goals

- [x] **Task 16: Create milestones API routes**
  - Files:
    - `resolution-tracker/app/api/goals/[id]/milestones/route.ts` (create)
    - `resolution-tracker/app/api/milestones/[id]/route.ts` (create)
    - `resolution-tracker/app/api/milestones/[id]/complete/route.ts` (create)
  - Actions:
    1. GET `/api/goals/[id]/milestones` — list milestones for goal
    2. POST `/api/goals/[id]/milestones` — create milestone
    3. GET `/api/milestones/[id]` — get single milestone
    4. PATCH `/api/milestones/[id]` — update milestone
    5. DELETE `/api/milestones/[id]` — delete milestone
    6. POST `/api/milestones/[id]/complete` — mark milestone complete
  - Notes: Nested under goals for creation, flat for updates

---

### Phase 5: Implementation Intentions Feature (New)

- [x] **Task 17: Create implementation-intentions types**
  - File: `resolution-tracker/src/features/implementation-intentions/types.ts` (create)
  - Actions:
    1. Re-export DB types from schema
    2. Create Zod schemas:
       - `createIntentionSchema` — goalId, triggerCondition, action (all required)
       - `updateIntentionSchema` — partial for PATCH
    3. Define `ImplementationIntentionResponse` type (camelCase)
  - Notes: The "If X, then Y" structure from research

- [x] **Task 18: Create implementation-intentions repository**
  - File: `resolution-tracker/src/features/implementation-intentions/repository.ts` (create)
  - Actions:
    1. `getIntentionsByGoalId(goalId)`
    2. `getIntentionById(id, userId)` — with ownership check via goal
    3. `createIntention(goalId, input)`
    4. `updateIntention(id, userId, input)`
    5. `toggleIntentionActive(id, userId)` — flip is_active
    6. `deleteIntention(id, userId)`
  - Notes: Ownership verified by joining to goals table

- [x] **Task 19: Create implementation-intentions queries and index**
  - Files:
    - `resolution-tracker/src/features/implementation-intentions/queries.ts` (create)
    - `resolution-tracker/src/features/implementation-intentions/index.ts` (create)
  - Actions:
    1. `transformIntentionToResponse()`
    2. `getActiveIntentionsForGoal(goalId, userId)` — only is_active = true
    3. Export all from index.ts
  - Notes: Active filter for AI coach context

- [x] **Task 20: Create implementation-intentions API routes**
  - Files:
    - `resolution-tracker/app/api/goals/[id]/intentions/route.ts` (create)
    - `resolution-tracker/app/api/intentions/[id]/route.ts` (create)
  - Actions:
    1. GET `/api/goals/[id]/intentions` — list intentions for goal
    2. POST `/api/goals/[id]/intentions` — create intention
    3. GET `/api/intentions/[id]` — get single intention
    4. PATCH `/api/intentions/[id]` — update intention
    5. DELETE `/api/intentions/[id]` — delete intention
  - Notes: Same nested/flat pattern as milestones

---

### Phase 6: AI Coach Integration

- [x] **Task 21: Update AI coach tools for enhanced check-ins**
  - File: `resolution-tracker/src/features/ai-coach/tools.ts`
  - Actions:
    1. Update `recordCheckIn` tool schema:
       - `goalId` — now required (string, not nullable)
       - Add `milestoneId` — optional string
       - Add `valueRecorded` — optional number
       - Add `habitCompletionStatus` — optional enum
    2. Update execute function to pass new fields to `createCheckIn()`
    3. Add new tool `updateGoalSentiment`:
       - Input: goalId, sentiment ('behind' | 'on_track' | 'ahead')
       - Calls `updateProgressSentiment()`
    4. Add new tool `completeMilestone`:
       - Input: milestoneId
       - Calls milestone repository
  - Notes: AI can now record structured progress and update sentiment

---

### Acceptance Criteria

#### Schema & Migration

- [x] **AC1:** Given the migrations directory is cleared, when `npm run db:generate` is run, then a single migration file is created containing all tables (profiles, goals, check_ins, milestones, implementation_intentions, user_summaries, integrations) with correct columns and constraints.

- [x] **AC2:** Given the fresh migration exists, when `npm run db:migrate` is run, then all tables are created in the database with correct enums (goal_type, progress_sentiment, habit_completion_status, goal_status, integration_type).

#### Goals Feature

- [x] **AC3:** Given a valid goal creation request with only title, when POST `/api/goals` is called, then a goal is created with goal_type defaulting to 'habit' and all enhanced fields null.

- [x] **AC4:** Given a valid goal creation request with all fields (title, goalType, successCriteria, targetDate, whyItMatters, currentBaseline, recoveryPlan, targetValue, targetUnit, frequencyPerWeek), when POST `/api/goals` is called, then all fields are stored correctly.

- [x] **AC5:** Given a goal exists with milestones and implementation intentions, when GET `/api/goals/[id]` is called, then the response includes the goal with nested milestones and intentions arrays.

- [x] **AC6:** Given invalid goal type "invalid", when POST `/api/goals` is called, then response is 400 with error code VALIDATION_ERROR.

#### Check-ins Feature

- [x] **AC7:** Given a habit goal exists, when POST `/api/check-ins` is called with habitCompletionStatus='completed', then the check-in is created and the goal's check_in_count is incremented.

- [x] **AC8:** Given a target goal with target_value=1000, when POST `/api/check-ins` is called with valueRecorded=500, then the check-in stores the value and progress can be calculated as 50%.

- [x] **AC9:** Given a project goal with 3 milestones (1 completed), when POST `/api/check-ins` is called with milestoneId for second milestone, then milestone is marked complete and progress is 66%.

- [x] **AC10:** Given a check-in request without goalId, when POST `/api/check-ins` is called, then response is 400 with error code VALIDATION_ERROR.

#### Milestones Feature

- [x] **AC11:** Given a goal exists, when POST `/api/goals/[id]/milestones` is called with title and sortOrder, then milestone is created with goal relationship.

- [x] **AC12:** Given a milestone exists, when POST `/api/milestones/[id]/complete` is called, then completed_at is set to current timestamp.

- [x] **AC13:** Given a goal is deleted, when checking milestones table, then all related milestones are cascade deleted.

#### Implementation Intentions Feature

- [x] **AC14:** Given a goal exists, when POST `/api/goals/[id]/intentions` is called with triggerCondition="If it's 7am" and action="Then I will run", then intention is created with is_active=true.

- [x] **AC15:** Given an intention exists with is_active=true, when PATCH `/api/intentions/[id]` is called with isActive=false, then intention is deactivated.

#### AI Coach Tools

- [x] **AC16:** Given the AI coach recordCheckIn tool is called with goalId and habitCompletionStatus='skipped', then check-in is created with skip status and goal is updated.

- [x] **AC17:** Given the AI coach updateGoalSentiment tool is called with sentiment='ahead', then goal's progress_sentiment is updated to 'ahead'.

---

## Additional Context

### Dependencies

- **Drizzle ORM** (already installed) — schema definition, migrations, queries
- **Zod** (already installed) — API input validation
- **No new packages required**

### Database Dependencies (Task Order)

```
Task 2 (Schema) → Task 3 (Generate) → Task 4 (Migrate)
     ↓
Task 5-8 (Goals) → Task 9-12 (Check-ins) → Task 21 (AI Coach)
     ↓
Task 13-16 (Milestones)
     ↓
Task 17-20 (Implementation Intentions)
```

### Testing Strategy

**Unit Tests (co-located):**
- `src/features/goals/repository.test.ts` — CRUD with new fields
- `src/features/check-ins/repository.test.ts` — structured progress fields
- `src/features/check-ins/queries.test.ts` — progress calculations
- `src/features/milestones/repository.test.ts` — milestone CRUD, completion
- `src/features/implementation-intentions/repository.test.ts` — intention CRUD

**Integration Tests:**
- API route tests for each endpoint (validation, auth, responses)

**Manual Testing:**
- Create goal with all field types
- Add milestones, mark complete
- Add implementation intentions
- Create check-ins with different progress types
- Verify cascade deletes

### Notes

**High-Risk Items:**
- Schema migration may need `DROP TABLE` if existing tables conflict — dev-only concern
- goal_id becoming required on check_ins breaks existing data — acceptable since no production

**Known Limitations:**
- No UI to input new fields yet — will be done via AI conversation first
- progress_sentiment requires AI to update — not auto-calculated

**Future Considerations (Out of Scope):**
- Habit streak calculation (consecutive days)
- Progress trend analysis over time
- Goal templates with pre-filled milestones
- Reminder scheduling based on implementation intentions
