---
project_name: 'Resolution Tracker'
user_name: 'Justin'
date: '2026-01-13'
sections_completed: ['technology_stack', 'database_rules', 'api_rules', 'code_organization', 'naming_conventions', 'ai_integration', 'testing_rules', 'auth_rules', 'anti_patterns']
---

# Project Context for AI Agents

_Critical rules and patterns for implementing Resolution Tracker. Focus on unobvious details._

---

## Technology Stack & Versions

| Technology | Version | Notes |
|------------|---------|-------|
| Next.js | 16.x | App Router only, no Pages Router |
| TypeScript | 5.x | Strict mode enabled |
| Supabase | Latest | Postgres + Auth |
| Drizzle ORM | Latest | For all DB operations |
| Vercel AI SDK | 6.x | With @ai-sdk/anthropic |
| Tailwind CSS | 3.x | With shadcn/ui |
| Node.js | 20.x | LTS |

---

## Critical Implementation Rules

### Database Rules (Drizzle)

- **NEVER use `drizzle-kit push`** - Always generate migrations
- Tables: `snake_case`, plural (`goals`, `check_ins`)
- Columns: `snake_case` (`user_id`, `created_at`)
- Always run `npm run db:generate` then `npm run db:migrate`
- Schema lives in `src/db/schema.ts`

### API Rules

- Return data directly on success: `Response.json(data)`
- Errors: `{ error: string, code: string }` with proper HTTP status
- Transform DB `snake_case` to `camelCase` in responses
- Dates: ISO 8601 strings always

### Code Organization (DDD + Vertical Slice)

- Business logic in `features/` NOT in `app/api/`
- API routes are thin - validate, delegate to feature, return
- Each feature owns: actions, queries, repository, types, components
- Features don't import from each other - use `shared/` for common

### File & Naming Conventions

- Files: `kebab-case.ts` (`goal-card.tsx`, `context-builder.ts`)
- Components: `PascalCase` (`GoalCard`, `CheckInForm`)
- Functions: `camelCase` (`createGoal`, `buildContext`)
- Types: `PascalCase` (`Goal`, `CheckIn`)
- Constants: `SCREAMING_SNAKE` (`MAX_GOALS`)

### AI Integration (Vercel AI SDK)

- Use `@ai-sdk/anthropic` provider, NOT direct Claude API
- Use `useChat` hook for conversation state
- Use `streamText` in API routes for streaming responses
- Context building happens in `features/ai-coach/context-builder.ts`

### Testing Rules

- Co-locate tests: `actions.test.ts` next to `actions.ts`
- Use `describe` for feature, `it` for behavior
- No separate `__tests__` directories

### Auth Rules

- Supabase Auth with magic links only (no passwords)
- Protected routes under `/protected/*`
- Auth check in `lib/supabase/proxy.ts` (redirects to `/auth/login`)
- Local dev uses real Supabase auth (no mocking)
- Profiles created via app-level upsert in auth confirm route
- All user data tables have FK to profiles.id with cascade delete

---

## Anti-Patterns (NEVER Do These)

- Don't put business logic in API route handlers
- Don't use `drizzle-kit push` - always generate migrations
- Don't import between features - use shared/ instead
- Don't use direct Claude API - use Vercel AI SDK
- Don't create separate test directories - co-locate tests
- Don't use `undefined` in JSON - use `null`
- Don't skip migration generation for "quick" changes

---

## Project Structure Reference

```
src/
├── app/           # Next.js routes (UI layer only)
├── features/      # Business logic (goals, check-ins, ai-coach, integrations)
├── shared/        # Cross-cutting (db, auth, ui)
├── db/            # Schema + seed
└── lib/           # Pure utilities
```

---

## Quick Commands

```bash
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed test data
npm run db:reset     # Migrate + seed
```
