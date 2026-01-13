---
title: 'MVP Foundation Setup'
slug: 'mvp-foundation-setup'
created: '2026-01-13'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Next.js 16.x (App Router)
  - TypeScript 5.x (strict mode)
  - Supabase (Postgres + Auth)
  - Drizzle ORM
  - Tailwind CSS 3.x
  - shadcn/ui
  - Node.js 20.x LTS
  - Vercel AI SDK 6.x
files_to_modify:
  - 'NEW: resolution-tracker/ (entire app directory)'
  - 'NEW: src/db/schema.ts'
  - 'NEW: src/db/seed.ts'
  - 'NEW: drizzle.config.ts'
  - 'NEW: drizzle/migrations/'
  - 'NEW: src/features/ (domain folders)'
  - 'NEW: src/shared/'
  - 'NEW: src/lib/'
  - 'NEW: .github/workflows/ci.yml'
  - 'NEW: .env.example'
code_patterns:
  - 'DDD + Vertical Slice Architecture'
  - 'Tables: snake_case, plural (goals, check_ins)'
  - 'Files: kebab-case (goal-card.tsx)'
  - 'Components: PascalCase (GoalCard)'
  - 'Functions: camelCase (createGoal)'
  - 'Feature isolation: features/ owns types, logic, components'
  - 'Thin API routes: validate → delegate → return'
test_patterns:
  - 'Co-located tests: actions.test.ts next to actions.ts'
  - 'No separate __tests__ directories'
  - 'describe() for feature, it() for behavior'
---

# Tech-Spec: MVP Foundation Setup

**Created:** 2026-01-13

## Overview

### Problem Statement

Before building any features, we need a properly configured Next.js project with Supabase integration, Drizzle ORM, database schema, and the folder structure defined in the architecture doc. Without this foundation, feature development will be inconsistent and require rework.

### Solution

Initialize the project using the official Supabase starter, configure Drizzle ORM with the core database schema, set up the devcontainer for local Postgres, establish the vertical slice folder structure, and ensure all tooling (TypeScript, Tailwind, shadcn/ui) is correctly configured.

### Scope

**In Scope:**
- Project initialization (`npx create-next-app -e with-supabase`)
- Drizzle ORM setup with initial migration
- Database schema for all 5 tables (`users`, `goals`, `check_ins`, `user_summaries`, `integrations`)
- Devcontainer configuration (local Postgres)
- Folder structure per architecture doc (features/, shared/, db/)
- Environment variable setup (.env.local, .env.example)
- shadcn/ui initialization with warm color theme
- Basic CI workflow (GitHub Actions)

**Out of Scope:**
- Auth flows (separate spec)
- Any UI beyond shadcn/ui setup
- API routes
- AI integration
- Feature-specific components

## Context for Development

### Codebase Patterns

**Confirmed Clean Slate** — No existing application code. Only BMAD configuration, devcontainer setup, and git files exist.

**Pre-configured Infrastructure:**
- Devcontainer with Postgres 16 container (`db` service)
- Redis 7 container (for future use)
- Database `ResolutionTracker` already created
- Port forwarding: 5432 (Postgres), 6379 (Redis)
- Local DATABASE_URL: `postgresql://postgres:postgres@db:5432/ResolutionTracker`

**Architecture Pattern:** DDD + Vertical Slice
- Feature isolation: Each domain owns types, logic, data access, components
- Thin API routes: Validate input → delegate to feature → return response
- Dependencies flow inward: UI → features → shared

**Naming Conventions (MUST FOLLOW):**
| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `goals`, `check_ins` |
| Columns | snake_case | `user_id`, `created_at` |
| Files | kebab-case | `goal-card.tsx` |
| Components | PascalCase | `GoalCard` |
| Functions | camelCase | `createGoal` |
| Constants | SCREAMING_SNAKE | `MAX_GOALS` |

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `_bmad-output/planning-artifacts/architecture.md` | Complete architecture decisions, project structure |
| `_bmad-output/project-context.md` | Critical implementation rules for AI agents |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | Color system, design tokens for shadcn/ui theme |
| `.devcontainer/docker-compose.yml` | Existing Postgres/Redis configuration |

### Technical Decisions

**From Architecture Doc:**

1. **Starter Template:** `npx create-next-app -e with-supabase resolution-tracker`
   - Official Supabase starter with App Router, TypeScript, Tailwind
   - Cookie-based SSR auth via `supabase-ssr`
   - shadcn/ui included

2. **Database Access:** Drizzle ORM
   - NEVER use `drizzle-kit push` — always generate migrations
   - Schema in `src/db/schema.ts`
   - Migrations in `drizzle/migrations/`

3. **shadcn/ui Theme (from UX spec):**
   - Background: `#FEFDFB` (warm off-white)
   - Foreground: `#2D2A26` (warm charcoal)
   - Accent: `#E59500` (soft amber)
   - Border radius: `rounded-xl` (12px) for buttons, `rounded-2xl` (16px) for cards

4. **Database Schema (5 tables):**
   - `users` — Managed by Supabase Auth
   - `goals` — User's resolutions (id, user_id, title, status, created_at)
   - `check_ins` — Conversation entries (id, user_id, goal_id nullable, content, ai_response, created_at)
   - `user_summaries` — AI context memory (id, user_id, summary_json, updated_at)
   - `integrations` — Notion/Zapier configs (id, user_id, type, access_token, config_json)

## Implementation Plan

### Tasks

#### Phase 1: Project Initialization

- [x] **Task 1: Initialize Next.js project with Supabase starter**
  - Command: `npx create-next-app -e with-supabase resolution-tracker`
  - Location: Run from `/workspaces/week1/`
  - Result: Creates `resolution-tracker/` directory with starter template
  - Notes: Accept defaults during prompts (TypeScript, ESLint, Tailwind, App Router)

- [x] **Task 2: Move app contents to workspace root (optional) OR work within resolution-tracker/**
  - Decision: Keep app in `resolution-tracker/` subdirectory for clean separation from BMAD config
  - Action: All subsequent tasks assume working directory is `resolution-tracker/`

#### Phase 2: Environment Configuration

- [x] **Task 3: Create environment files**
  - File: `resolution-tracker/.env.local`
  - Action: Create with local development values
  - Content:
    ```env
    # Database (local devcontainer)
    DATABASE_URL=postgresql://postgres:postgres@db:5432/ResolutionTracker

    # Supabase (placeholder - configure when setting up auth)
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

    # Claude API (placeholder - configure when setting up AI)
    ANTHROPIC_API_KEY=your-api-key
    ```

- [x] **Task 4: Create .env.example template**
  - File: `resolution-tracker/.env.example`
  - Action: Copy of .env.local with placeholder values (no secrets)
  - Notes: This file IS committed to git

#### Phase 3: Install Additional Dependencies

- [x] **Task 5: Install Drizzle ORM**
  - Command: `npm install drizzle-orm postgres`
  - Command: `npm install -D drizzle-kit`
  - Location: `resolution-tracker/`

- [x] **Task 6: Install Vercel AI SDK**
  - Command: `npm install ai @ai-sdk/anthropic`
  - Location: `resolution-tracker/`
  - Notes: Installing now for future features, ensures versions are locked

#### Phase 4: Create Folder Structure

- [x] **Task 7: Create vertical slice folder structure**
  - Location: `resolution-tracker/src/`
  - Action: Create directories:
    ```
    src/
    ├── db/                    # Database schema and client
    ├── features/              # Domain logic
    │   ├── goals/
    │   │   └── .gitkeep
    │   ├── check-ins/
    │   │   └── .gitkeep
    │   ├── ai-coach/
    │   │   └── .gitkeep
    │   └── integrations/
    │       ├── notion/
    │       │   └── .gitkeep
    │       └── zapier/
    │           └── .gitkeep
    ├── shared/
    │   ├── db/
    │   │   └── .gitkeep
    │   ├── auth/
    │   │   └── .gitkeep
    │   └── ui/
    │       └── .gitkeep
    └── lib/
        └── .gitkeep
    ```
  - Notes: Use `.gitkeep` files to preserve empty directories in git

#### Phase 5: Database Setup

- [x] **Task 8: Create Drizzle configuration**
  - File: `resolution-tracker/drizzle.config.ts`
  - Content:
    ```typescript
    import { defineConfig } from 'drizzle-kit';

    export default defineConfig({
      schema: './src/db/schema.ts',
      out: './drizzle/migrations',
      dialect: 'postgresql',
      dbCredentials: {
        url: process.env.DATABASE_URL!,
      },
    });
    ```

- [x] **Task 9: Create database schema**
  - File: `resolution-tracker/src/db/schema.ts`
  - Action: Define all 5 tables using Drizzle schema syntax
  - Content:
    ```typescript
    import { pgTable, uuid, text, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';

    // Goals table
    export const goals = pgTable('goals', {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id').notNull(),
      title: text('title').notNull(),
      status: varchar('status', { length: 20 }).notNull().default('active'),
      createdAt: timestamp('created_at').notNull().defaultNow(),
      updatedAt: timestamp('updated_at').notNull().defaultNow(),
    });

    // Check-ins table
    export const checkIns = pgTable('check_ins', {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id').notNull(),
      goalId: uuid('goal_id'), // nullable - supports general check-ins
      content: text('content').notNull(),
      aiResponse: text('ai_response'),
      createdAt: timestamp('created_at').notNull().defaultNow(),
    });

    // User summaries table (AI context memory)
    export const userSummaries = pgTable('user_summaries', {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id').notNull().unique(),
      summaryJson: jsonb('summary_json').notNull().default({}),
      updatedAt: timestamp('updated_at').notNull().defaultNow(),
    });

    // Integrations table
    export const integrations = pgTable('integrations', {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id').notNull(),
      type: varchar('type', { length: 50 }).notNull(), // 'notion' | 'zapier'
      accessToken: text('access_token'),
      configJson: jsonb('config_json').notNull().default({}),
      createdAt: timestamp('created_at').notNull().defaultNow(),
      updatedAt: timestamp('updated_at').notNull().defaultNow(),
    });

    // Type exports for use in features
    export type Goal = typeof goals.$inferSelect;
    export type NewGoal = typeof goals.$inferInsert;
    export type CheckIn = typeof checkIns.$inferSelect;
    export type NewCheckIn = typeof checkIns.$inferInsert;
    export type UserSummary = typeof userSummaries.$inferSelect;
    export type Integration = typeof integrations.$inferSelect;
    ```

- [x] **Task 10: Create Drizzle client**
  - File: `resolution-tracker/src/db/index.ts`
  - Content:
    ```typescript
    import { drizzle } from 'drizzle-orm/postgres-js';
    import postgres from 'postgres';
    import * as schema from './schema';

    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString);

    export const db = drizzle(client, { schema });
    export * from './schema';
    ```

- [x] **Task 11: Add database scripts to package.json**
  - File: `resolution-tracker/package.json`
  - Action: Add scripts section entries:
    ```json
    {
      "scripts": {
        "db:generate": "drizzle-kit generate",
        "db:migrate": "drizzle-kit migrate",
        "db:seed": "npx tsx src/db/seed.ts",
        "db:reset": "npm run db:migrate && npm run db:seed",
        "db:studio": "drizzle-kit studio"
      }
    }
    ```

- [x] **Task 12: Generate initial migration**
  - Command: `npm run db:generate`
  - Location: `resolution-tracker/`
  - Result: Creates `drizzle/migrations/0000_*.sql` file

- [x] **Task 13: Run initial migration**
  - Command: `npm run db:migrate`
  - Location: `resolution-tracker/`
  - Result: Creates tables in Postgres database

#### Phase 6: shadcn/ui Theme Configuration

- [x] **Task 14: Update Tailwind/shadcn theme with warm colors**
  - File: `resolution-tracker/src/app/globals.css`
  - Action: Update CSS variables in `:root` section:
    ```css
    :root {
      --background: 40 33% 99%;           /* #FEFDFB warm off-white */
      --foreground: 30 9% 16%;            /* #2D2A26 warm charcoal */
      --card: 36 29% 97%;                 /* #FAF8F5 warm card bg */
      --card-foreground: 30 9% 16%;
      --popover: 40 33% 99%;
      --popover-foreground: 30 9% 16%;
      --primary: 38 100% 45%;             /* #E59500 soft amber */
      --primary-foreground: 0 0% 100%;    /* white */
      --secondary: 30 11% 95%;            /* #F5F3F0 muted */
      --secondary-foreground: 30 9% 16%;
      --muted: 30 11% 95%;
      --muted-foreground: 25 6% 40%;      /* #6B6560 */
      --accent: 38 100% 45%;
      --accent-foreground: 0 0% 100%;
      --destructive: 10 50% 62%;          /* #D4756A soft coral */
      --destructive-foreground: 0 0% 100%;
      --border: 30 11% 90%;               /* #E8E4DF */
      --input: 30 11% 90%;
      --ring: 38 100% 45%;
      --radius: 0.75rem;                  /* 12px default */
    }
    ```
  - Notes: Dark mode variables can remain as starter defaults for now

- [x] **Task 15: Update tailwind.config.ts border radius**
  - File: `resolution-tracker/tailwind.config.ts`
  - Action: Ensure border radius values support our design system:
    ```typescript
    theme: {
      extend: {
        borderRadius: {
          lg: 'var(--radius)',        // 12px
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)',
          xl: '1rem',                 // 16px
          '2xl': '1.25rem',           // 20px
        },
      },
    }
    ```

#### Phase 7: CI/CD Setup

- [x] **Task 16: Create GitHub Actions CI workflow**
  - File: `resolution-tracker/.github/workflows/ci.yml`
  - Content:
    ```yaml
    name: CI

    on:
      push:
        branches: [main]
      pull_request:
        branches: [main]

    jobs:
      build:
        runs-on: ubuntu-latest

        steps:
          - uses: actions/checkout@v4

          - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'
              cache-dependency-path: resolution-tracker/package-lock.json

          - name: Install dependencies
            working-directory: resolution-tracker
            run: npm ci

          - name: Type check
            working-directory: resolution-tracker
            run: npm run build

          - name: Lint
            working-directory: resolution-tracker
            run: npm run lint
    ```

#### Phase 8: Seed Script

- [x] **Task 17: Create database seed script**
  - File: `resolution-tracker/src/db/seed.ts`
  - Content:
    ```typescript
    import { db, goals, checkIns, userSummaries } from './index';

    async function seed() {
      console.log('🌱 Seeding database...');

      // For local development only - uses a fixed test user ID
      // In production, users are created through Supabase Auth
      const testUserId = '00000000-0000-0000-0000-000000000001';

      // Clear existing data (for reset)
      await db.delete(checkIns);
      await db.delete(goals);
      await db.delete(userSummaries);

      // Seed goals
      const [goal1, goal2] = await db.insert(goals).values([
        { userId: testUserId, title: 'Exercise 3x per week', status: 'active' },
        { userId: testUserId, title: 'Learn Spanish basics', status: 'active' },
      ]).returning();

      console.log(`✓ Created ${2} goals`);

      // Seed check-ins
      await db.insert(checkIns).values([
        {
          userId: testUserId,
          goalId: goal1.id,
          content: 'Went to the gym today, felt great!',
          aiResponse: 'Nice work! Consistency is key. How are you feeling about tomorrow?'
        },
        {
          userId: testUserId,
          goalId: goal2.id,
          content: 'Did 10 minutes of Duolingo',
          aiResponse: '10 minutes is better than zero! What did you learn today?'
        },
      ]);

      console.log(`✓ Created ${2} check-ins`);

      // Seed user summary
      await db.insert(userSummaries).values({
        userId: testUserId,
        summaryJson: {
          patterns: ['Mornings are hard', 'More motivated after work'],
          wins: ['Gym streak: 3 days'],
          struggles: ['Spanish consistency'],
        },
      });

      console.log(`✓ Created user summary`);
      console.log('✅ Seed complete!');

      process.exit(0);
    }

    seed().catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
    ```

#### Phase 9: Verification

- [x] **Task 18: Verify setup**
  - Command: `npm run build` (should pass with no errors)
  - Command: `npm run lint` (should pass)
  - Command: `npm run db:studio` (opens Drizzle Studio to verify tables)
  - Action: Manually verify:
    - All 4 tables exist in database
    - Seed data is present
    - App loads at localhost:3000

### Acceptance Criteria

#### Project Structure
- [x] **AC1:** Given the project is initialized, when I run `ls resolution-tracker/src/`, then I see `app/`, `db/`, `features/`, `shared/`, and `lib/` directories
- [x] **AC2:** Given the features folder exists, when I run `ls resolution-tracker/src/features/`, then I see `goals/`, `check-ins/`, `ai-coach/`, and `integrations/` directories

#### Database
- [x] **AC3:** Given the database is configured, when I run `npm run db:generate`, then a migration file is created in `drizzle/migrations/`
- [x] **AC4:** Given migrations exist, when I run `npm run db:migrate`, then tables are created in Postgres without errors
- [x] **AC5:** Given tables exist, when I run `npm run db:seed`, then test data is inserted and visible in `npm run db:studio`
- [x] **AC6:** Given the schema is defined, when I inspect the database, then I see tables: `goals`, `check_ins`, `user_summaries`, `integrations`

#### Environment
- [x] **AC7:** Given `.env.local` exists, when I run `npm run dev`, then the app starts without "missing environment variable" errors
- [x] **AC8:** Given `.env.example` exists, when I inspect it, then it contains all required variables with placeholder values (no secrets)

#### Build & Lint
- [x] **AC9:** Given the project is set up, when I run `npm run build`, then it completes with no TypeScript errors
- [x] **AC10:** Given the project is set up, when I run `npm run lint`, then it completes with no ESLint errors

#### Theme
- [x] **AC11:** Given globals.css is updated, when I view the app, then the background color is warm off-white (#FEFDFB), not pure white

#### CI
- [x] **AC12:** Given .github/workflows/ci.yml exists, when I push to main, then GitHub Actions runs build and lint checks

## Additional Context

### Dependencies

**Required External Services:**
- None for foundation (Supabase and Claude API configured in later specs)

**NPM Packages Added:**
| Package | Version | Purpose |
|---------|---------|---------|
| drizzle-orm | latest | Database ORM |
| drizzle-kit | latest (dev) | Migration tooling |
| postgres | latest | Postgres driver |
| ai | 6.x | Vercel AI SDK core |
| @ai-sdk/anthropic | latest | Claude provider |
| tsx | latest (dev) | Run TypeScript directly (seed script) |

### Testing Strategy

**For this foundation spec:**
- No unit tests required (no business logic yet)
- Manual verification via acceptance criteria
- `npm run build` and `npm run lint` serve as automated checks
- `npm run db:studio` for visual database verification

**Testing infrastructure established for future specs:**
- Co-located test pattern documented
- Vitest can be added when first feature spec requires tests

### Notes

**Decisions Made:**
- App lives in `resolution-tracker/` subdirectory (keeps BMAD config separate)
- Using `tsx` for seed script (simpler than ts-node configuration)
- No RLS configured locally (handled by Supabase in production)
- Dark mode theme uses starter defaults (can be customized later)

**Known Limitations:**
- Local dev doesn't have Supabase Auth - will be configured in Auth spec
- AI features require API key - will be configured in AI Coach spec
- No production deployment yet - separate deployment spec if needed

**Risk Mitigation:**
- Schema designed upfront for all features to avoid breaking migrations later
- All table names follow conventions to prevent inconsistency
- Environment template ensures no developer forgets required variables

---

## Adversarial Review Findings

**Review Date:** 2026-01-13
**Resolution Approach:** Auto-fix real issues

| ID | Severity | Validity | Description | Status |
|----|----------|----------|-------------|--------|
| F1 | CRITICAL | Real | No foreign key constraints - goalId/userId accept any UUID | Fixed |
| F2 | HIGH | Real | No database indexes on user_id, goal_id, status columns | Fixed |
| F3 | HIGH | Real | updatedAt columns only set on INSERT, never update | Fixed |
| F4 | CRITICAL | Real | Seed script DELETEs all data with no environment check | Fixed |
| F5 | MEDIUM | Real | Non-null assertions on DATABASE_URL - cryptic errors if missing | Fixed |
| F6 | MEDIUM | Real | Status field is varchar, no enum or check constraint | Fixed |
| F7 | HIGH | Deferred | Access tokens in plain text - security concern | Deferred to Auth spec |
| F8 | LOW | Real | CI runs full build instead of tsc --noEmit | Fixed |
| F9 | LOW | Noise | No tests | Out of scope per spec |
| F10 | LOW | Noise | Dark mode doesn't match warm theme | Out of scope per spec |
| F11 | MEDIUM | Real | Database connection pool not configured for serverless | Fixed |
| F12 | LOW | Real | Missing NewUserSummary and NewIntegration type exports | Fixed |
| F13 | MEDIUM | Real | JSONB columns have no type safety | Fixed |
| F14 | MEDIUM | Deferred | Package uses 'latest' tags | Inherited from starter
