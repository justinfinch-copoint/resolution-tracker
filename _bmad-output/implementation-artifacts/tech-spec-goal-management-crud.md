---
title: 'Goal Management CRUD'
slug: 'goal-management-crud'
created: '2026-01-14'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Next.js 16 (App Router)
  - TypeScript 5.x (strict mode)
  - Drizzle ORM
  - Supabase (Postgres + Auth)
  - shadcn/ui (Button, Card, Input, Label, Badge, Dropdown, Checkbox)
  - Vercel AI SDK (installed, not used in this spec)
files_to_modify:
  - src/features/goals/types.ts (create)
  - src/features/goals/repository.ts (create)
  - src/features/goals/queries.ts (create)
  - src/features/goals/actions.ts (create)
  - src/features/goals/components/goal-card.tsx (create)
  - src/features/goals/components/goal-form.tsx (create)
  - src/features/goals/components/goal-list.tsx (create)
  - app/api/goals/route.ts (create)
  - app/api/goals/[id]/route.ts (create)
  - app/protected/goals/page.tsx (create)
  - app/protected/layout.tsx (modify - add nav link)
code_patterns:
  - DDD + Vertical Slice architecture
  - Business logic in features/, thin API routes
  - snake_case DB to camelCase API transformation
  - Server actions for mutations
  - shadcn/ui + useState for forms
test_patterns:
  - Co-located tests (*.test.ts next to source)
  - describe by feature, it for behaviors
---

# Tech-Spec: Goal Management CRUD

**Created:** 2026-01-14

## Overview

### Problem Statement

Users need a way to create, view, edit, and delete their yearly resolutions. The system should enforce a 2-5 active goal limit to keep users focused.

### Solution

Implement full CRUD operations for goals following the DDD + vertical slice architecture, with limit enforcement at both API and UI layers, and manual status transitions.

### Scope

**In Scope:**
- Create goals (with active goal limit check: max 5, min 2 encouraged)
- Read goals (list all user goals, view single goal)
- Update goals (edit title, change status manually)
- Delete goals
- Status management: `active` -> `completed` / `paused` / `abandoned`
- API routes: `/api/goals` (GET, POST), `/api/goals/[id]` (GET, PATCH, DELETE)
- Feature layer: `features/goals/` (actions, queries, repository, types, components)
- UI: `/protected/goals` page with goal list and forms

**Out of Scope:**
- AI coach integration (separate spec)
- Check-in functionality
- Dashboard home page integration
- Notion/Zapier integrations
- Goal suggestions or templates

## Context for Development

### Codebase Patterns

**Architecture:** DDD + Vertical Slice
- Business logic lives in `src/features/{domain}/`
- API routes are thin: validate input, delegate to feature, return response
- Each feature owns: types, repository, queries, actions, components

**Naming Conventions:**
- Files: `kebab-case.ts` (`goal-card.tsx`, `repository.ts`)
- Components: `PascalCase` (`GoalCard`, `GoalForm`)
- Functions: `camelCase` (`createGoal`, `getGoalsByUserId`)
- Types: `PascalCase` (`Goal`, `CreateGoalInput`)
- DB tables/columns: `snake_case` (`goals`, `user_id`, `created_at`)

**API Response Format:**
- Success: `Response.json(data)` with camelCase fields
- Error: `Response.json({ error: string, code: string }, { status: number })`

**Auth Pattern:**
- Server: `const supabase = await createClient()` then `supabase.auth.getUser()`
- User ID comes from `user.id` (UUID matching profiles.id)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts` | Goals table schema with status enum |
| `src/db/index.ts` | Drizzle client export (`db`) |
| `lib/supabase/server.ts` | Server-side Supabase client |
| `lib/supabase/proxy.ts` | Protected route middleware |
| `app/auth/confirm/route.ts` | Profile upsert pattern |
| `components/login-form.tsx` | Form pattern (useState + shadcn/ui) |
| `components/ui/` | Available shadcn components |

### Technical Decisions

1. **Server Actions vs API Routes:** Use API routes for CRUD (enables easy Zapier integration later)
2. **Form Handling:** useState + shadcn/ui (matches existing login-form pattern)
3. **Goal Limit Enforcement:** Check in both repository (API) and UI (disable button when at 5)
4. **Status Transitions:** Any status can change to any other (no state machine needed)
5. **No pagination for MVP:** Users have max 5 goals, no need for pagination

## Implementation Plan

### Tasks

#### Phase 1: Feature Foundation (Types & Repository)

- [x] **Task 1: Create feature directory structure**
  - Files: `src/features/goals/` directory
  - Action: Create directories `src/features/goals/` and `src/features/goals/components/`
  - Notes: Establishes vertical slice structure

- [x] **Task 2: Define types**
  - File: `src/features/goals/types.ts`
  - Action: Create types for API layer
    ```typescript
    // Re-export DB types
    export type { Goal, NewGoal, GoalStatus } from '@/src/db/schema';

    // API input/output types
    export type CreateGoalInput = { title: string };
    export type UpdateGoalInput = { title?: string; status?: GoalStatus };
    export type GoalResponse = {
      id: string;
      userId: string;
      title: string;
      status: GoalStatus;
      createdAt: string;
      updatedAt: string;
    };

    // Constants
    export const MAX_ACTIVE_GOALS = 5;
    export const MIN_ACTIVE_GOALS = 2;
    ```
  - Notes: camelCase for API responses, snake_case stays in DB layer

- [x] **Task 3: Create repository layer**
  - File: `src/features/goals/repository.ts`
  - Action: Implement data access functions
    ```typescript
    // Functions to implement:
    getGoalsByUserId(userId: string): Promise<Goal[]>
    getGoalById(id: string, userId: string): Promise<Goal | null>
    getActiveGoalCount(userId: string): Promise<number>
    createGoal(userId: string, input: CreateGoalInput): Promise<Goal>
    updateGoal(id: string, userId: string, input: UpdateGoalInput): Promise<Goal | null>
    deleteGoal(id: string, userId: string): Promise<boolean>
    ```
  - Notes: All queries filter by userId for security. Use Drizzle `eq()` and `and()`.

- [x] **Task 4: Create queries layer**
  - File: `src/features/goals/queries.ts`
  - Action: Export query functions that transform DB results to API format
    ```typescript
    // Functions:
    transformGoalToResponse(goal: Goal): GoalResponse
    getUserGoals(userId: string): Promise<GoalResponse[]>
    getUserGoal(id: string, userId: string): Promise<GoalResponse | null>
    canCreateGoal(userId: string): Promise<boolean>
    ```
  - Notes: Handles snake_case → camelCase, dates → ISO strings

#### Phase 2: API Routes

- [x] **Task 5: Create goals list/create API route**
  - File: `app/api/goals/route.ts`
  - Action: Implement GET (list) and POST (create) handlers
    ```typescript
    // GET /api/goals
    // - Auth check via createClient().auth.getUser()
    // - Return all goals for user
    // - 401 if not authenticated

    // POST /api/goals
    // - Validate title is non-empty string
    // - Check active goal count < MAX_ACTIVE_GOALS
    // - Return 400 with code "MAX_GOALS_REACHED" if limit hit
    // - Return 201 with created goal
    ```
  - Notes: Thin handler - delegate to queries/repository

- [x] **Task 6: Create single goal API route**
  - File: `app/api/goals/[id]/route.ts`
  - Action: Implement GET, PATCH, DELETE handlers
    ```typescript
    // GET /api/goals/[id]
    // - Return goal or 404

    // PATCH /api/goals/[id]
    // - Accept { title?, status? }
    // - Return updated goal or 404
    // - When changing TO active status, check limit

    // DELETE /api/goals/[id]
    // - Return 204 on success, 404 if not found
    ```
  - Notes: Always filter by userId in queries

#### Phase 3: UI Components

- [x] **Task 7: Create GoalCard component**
  - File: `src/features/goals/components/goal-card.tsx`
  - Action: Display single goal with status badge and actions
    ```typescript
    // Props: goal: GoalResponse, onEdit, onDelete, onStatusChange
    // UI elements:
    // - Card with title
    // - Badge showing status (color-coded)
    // - Dropdown menu: Edit, Change Status, Delete
    // - Status options: active, completed, paused, abandoned
    ```
  - Notes: Use shadcn Card, Badge, DropdownMenu

- [x] **Task 8: Create GoalForm component**
  - File: `src/features/goals/components/goal-form.tsx`
  - Action: Form for creating/editing goals
    ```typescript
    // Props:
    //   mode: 'create' | 'edit'
    //   goal?: GoalResponse (for edit mode)
    //   onSubmit: (data) => Promise<void>
    //   onCancel: () => void
    //   disabled?: boolean (for create when at limit)
    //
    // UI: Input for title, Submit/Cancel buttons
    // Validation: title required, non-empty
    ```
  - Notes: Follow login-form.tsx pattern (useState + shadcn)

- [x] **Task 9: Create GoalList component**
  - File: `src/features/goals/components/goal-list.tsx`
  - Action: Container for listing goals with create button
    ```typescript
    // Props: none (fetches own data)
    // Features:
    // - Fetch goals on mount
    // - "Add Goal" button (disabled if activeCount >= 5)
    // - Show message if activeCount < 2: "Add at least 2 goals to stay focused"
    // - Map goals to GoalCard components
    // - Empty state: "No goals yet. Start by adding your first resolution!"
    // - Handle loading/error states
    ```
  - Notes: Client component with useEffect for data fetching

- [x] **Task 10: Create index export**
  - File: `src/features/goals/index.ts`
  - Action: Barrel export for feature
    ```typescript
    export * from './types';
    export * from './queries';
    export { GoalList } from './components/goal-list';
    ```

#### Phase 4: Page & Navigation

- [x] **Task 11: Create goals page**
  - File: `app/protected/goals/page.tsx`
  - Action: Goals management page
    ```typescript
    // Server component wrapper
    // - Page title: "Your Goals"
    // - Render GoalList component
    // - Brief intro text about goal tracking
    ```
  - Notes: Keep simple - GoalList handles all logic

- [x] **Task 12: Add navigation link**
  - File: `app/protected/layout.tsx`
  - Action: Add "Goals" link to nav
    ```typescript
    // Add to nav div after "Resolution Tracker" link:
    <Link href="/protected/goals">Goals</Link>
    ```
  - Notes: Match existing nav styling

### Acceptance Criteria

#### Create Goal
- [x] **AC1:** Given an authenticated user with < 5 active goals, when they submit a valid title, then a new goal is created with status "active" and returned with 201
- [x] **AC2:** Given an authenticated user with 5 active goals, when they try to create a goal, then they receive 400 with error code "MAX_GOALS_REACHED"
- [x] **AC3:** Given an authenticated user, when they submit an empty title, then they receive 400 with validation error

#### Read Goals
- [x] **AC4:** Given an authenticated user with goals, when they request GET /api/goals, then all their goals are returned (not other users' goals)
- [x] **AC5:** Given an authenticated user, when they request GET /api/goals/[id] for their own goal, then that goal is returned
- [x] **AC6:** Given an authenticated user, when they request GET /api/goals/[id] for another user's goal, then 404 is returned

#### Update Goal
- [x] **AC7:** Given an authenticated user, when they PATCH their goal with a new title, then the title is updated and returned
- [x] **AC8:** Given an authenticated user with 5 active goals, when they try to change a paused goal to active, then they receive 400 with "MAX_GOALS_REACHED"
- [x] **AC9:** Given an authenticated user, when they change a goal status to "completed", then the status is updated successfully

#### Delete Goal
- [x] **AC10:** Given an authenticated user, when they DELETE their goal, then the goal is removed and 204 is returned
- [x] **AC11:** Given an authenticated user, when they DELETE a non-existent goal, then 404 is returned

#### UI Behavior
- [x] **AC12:** Given a user on /protected/goals with 5 active goals, when the page loads, then the "Add Goal" button is disabled
- [x] **AC13:** Given a user on /protected/goals with < 2 active goals, when the page loads, then a message encourages adding more goals
- [x] **AC14:** Given a user on /protected/goals, when they click a goal's status dropdown, then they can change to any status (active, completed, paused, abandoned)
- [x] **AC15:** Given an unauthenticated user, when they access /protected/goals, then they are redirected to /auth/login

## Additional Context

### Dependencies

**Existing (no install needed):**
- `drizzle-orm` - Database queries
- `@supabase/ssr` - Auth
- `shadcn/ui` components - UI
- `lucide-react` - Icons

**May need to add:**
- None for MVP (consider `zod` for validation in future)

### Testing Strategy

- Co-located tests: `repository.test.ts`, `actions.test.ts`
- Use `describe` for feature grouping
- Test repository functions with mocked DB
- Test API routes with mocked repository
- Manual E2E testing for MVP

### Notes

- Active goal limit: 2-5 (enforced at API and UI)
- Status transitions are manual (user-controlled)
- Separate page at `/protected/goals`
- Goal statuses from schema: `active`, `completed`, `paused`, `abandoned`
- No migrations needed - goals table already exists in schema

---

## Adversarial Review Findings

Review completed: 2026-01-14

| ID | Severity | Validity | Description | Resolution |
|----|----------|----------|-------------|------------|
| F1 | High | Real | No UUID validation on path parameters | Fixed |
| F2 | Medium | Real | No maximum length validation on title input | Fixed |
| F3 | Medium | Real | Repository functions lack error handling | Fixed |
| F4 | High | Real | Race condition in goal creation limit check | Fixed |
| F5 | High | Real | Race condition in status activation check | Fixed |
| F6 | Low | Noise | MIN_ACTIVE_GOALS is intentionally advisory only | Skipped |
| F7 | Low | Noise | Repository not exported - internal to feature | Skipped |
| F8 | Medium | Real | Missing confirmation dialog for delete | Fixed |
| F9 | Medium | Real | No sorting/ordering on goal list queries | Fixed |
| F10 | Medium | Noise | Auth boilerplate minimal - Next.js pattern | Skipped |
| F11 | Low | Noise | Transform placement fine in queries layer | Skipped |
| F12 | Medium | Real | Error state never cleared after success | Fixed |
| F13 | Medium | Real | No loading states during CRUD operations | Fixed |
| F14 | Medium | Real | Hardcoded status array duplicated | Fixed |

**Summary:** 14 findings total, 10 fixed, 4 skipped (noise/by design)
