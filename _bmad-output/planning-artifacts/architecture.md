---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - prd.md
  - product-brief-week1-2026-01-08.md
workflowType: 'architecture'
project_name: 'Resolution Tracker'
user_name: 'Justin'
date: '2026-01-13'
status: 'complete'
completedAt: '2026-01-13'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- Goal Management: CRUD for 2-5 resolutions per user (plain text)
- Conversational Check-ins: Natural language progress updates
- AI Coach: Claude-powered responses with context, memory, and sentiment awareness
- User Dashboard: Goals, check-in history, progress visualization
- Authentication: Passwordless magic links via Supabase Auth
- Notion Integration: OAuth-based export to user's Notion database
- Zapier Integration: Outbound webhooks on key events

**Non-Functional Requirements:**
- Natural, non-robotic conversational feel
- Context-aware AI responses demonstrating memory
- Reliable auth flow with good UX
- Clean integration patterns for third-party services
- No guilt mechanics (no streaks, no passive-aggressive notifications)

**Scale & Complexity:**
- Primary domain: Full-stack web application with AI integration
- Complexity level: Low (focused MVP scope)
- Estimated architectural components: 6-8 (auth, goals, check-ins, AI service, dashboard, integrations)

### Technical Constraints & Dependencies

- **Claude API**: Primary AI dependency - requires context management strategy
- **Supabase**: Database and auth provider - constrains auth patterns
- **Vercel**: Deployment platform - serverless function constraints
- **Notion API**: OAuth 2.0 flow required for export feature
- **No real-time requirements**: Simplifies architecture (no WebSockets needed)

### Cross-Cutting Concerns Identified

1. **AI Context Management**: Strategy for feeding relevant history to Claude without token overflow
2. **User Data Isolation**: Multi-tenant data security
3. **External API Error Handling**: Graceful degradation for Claude/Notion/Zapier failures
4. **Rate Limiting**: Protect against AI API cost overruns
5. **Session/Auth State**: Consistent handling across all routes

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application with AI integration, based on project requirements analysis.

### Starter Options Considered

1. **Official Supabase Starter** (`with-supabase`) - Official template with App Router, TypeScript, Tailwind, and cookie-based auth
2. **Clean Next.js** - Vanilla create-next-app with manual Supabase integration

### Selected Starter: Official Supabase Starter

**Rationale for Selection:**
- Officially maintained by Supabase team
- Handles SSR auth complexity correctly (cookie-based sessions, client/server separation)
- Includes shadcn/ui for rapid UI development
- App Router patterns established from day one
- Minimal but complete - not overloaded with unused features

**Initialization Command:**

```bash
npx create-next-app -e with-supabase resolution-tracker
```

**Architectural Decisions Provided by Starter:**

| Category | Decision |
|----------|----------|
| Language & Runtime | TypeScript with strict mode |
| Styling Solution | Tailwind CSS + shadcn/ui components |
| Build Tooling | Turbopack (Next.js 16 default) |
| Auth Architecture | Cookie-based SSR auth via `supabase-ssr` |
| Code Organization | App Router file-based routing |
| Development Experience | Hot reload, TypeScript checking, ESLint |

**Note:** Project initialization using this command should be the first implementation task.

## Core Architectural Decisions

### Decision 1: AI Context Management Strategy

**Decision:** Sliding Window + Periodic Summary

**Approach:**
- Send last 10-15 check-ins to Claude with each request
- Maintain a stored JSON "user summary" capturing patterns and history
- Claude formats the summary as needed at runtime
- Update summary periodically or on significant events

**Rationale:** Balances the "knows me" conversational feel with practical token limits. Simple to implement, scales reasonably for MVP.

### Decision 2: Data Model Architecture

**Core Entities:**

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `users` | Managed by Supabase Auth | id, email, created_at |
| `profiles` | Links auth.users to public schema | id (matches auth.users.id), email, created_at |
| `goals` | User's resolutions | id, user_id (FK to profiles), title, status, created_at |
| `check_ins` | Conversation entries | id, user_id (FK to profiles), goal_id (nullable), content, ai_response, created_at |
| `user_summaries` | AI context memory | id, user_id (FK to profiles), summary_json, updated_at |
| `integrations` | Notion/Zapier configs | id, user_id (FK to profiles), type, access_token, config_json |

**Key Decisions:**
- **Goal reference on check-ins:** Optional (supports general check-ins like "feeling motivated")
- **Sentiment storage:** None - derive on-demand via Claude when needed
- **User summary format:** JSON only - Claude formats human-readable summaries at runtime

### Decision 3: Project Structure (DDD + Vertical Slice)

**Architecture Pattern:** Domain-Driven Design with Vertical Slice Architecture

```
src/
├── app/                          # Next.js App Router (UI layer)
│   ├── (auth)/                   # Auth route group
│   ├── (dashboard)/              # Protected routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── goals/page.tsx
│   │   ├── check-in/page.tsx
│   │   └── settings/page.tsx
│   ├── api/                      # Thin API routes → delegate to features
│   └── layout.tsx
│
├── features/                     # Business logic (domain layer)
│   ├── goals/
│   │   ├── actions.ts            # Server actions
│   │   ├── queries.ts            # Data fetching
│   │   ├── repository.ts         # Supabase queries
│   │   ├── types.ts
│   │   └── components/
│   ├── check-ins/
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   ├── repository.ts
│   │   ├── types.ts
│   │   └── components/
│   ├── ai-coach/
│   │   ├── context-builder.ts
│   │   ├── prompts.ts
│   │   ├── client.ts
│   │   ├── summary-repository.ts
│   │   └── types.ts
│   └── integrations/
│       ├── notion/
│       └── zapier/
│
├── shared/                       # Cross-cutting concerns
│   ├── db/                       # Supabase clients
│   ├── auth/                     # Auth utilities
│   └── ui/                       # Shared UI components
│
└── lib/                          # Pure utilities
```

**Key Principles:**
- Feature isolation: Each domain owns types, logic, data access
- Thin API routes: Validate + delegate to feature services
- Dependencies flow inward: UI → features → shared
- Co-located components: Feature-specific UI lives with feature

### Decision 4: Authentication

**Decision:** Keep it simple - standard Supabase magic link flow

**Flow:**
1. User enters email → Supabase sends magic link
2. User clicks link → `/auth/callback` processes token
3. Cookie-based session set → redirect to dashboard

**Session Handling:**
- Cookie-based sessions via `supabase-ssr`
- Proxy (`lib/supabase/proxy.ts`) protects `/protected/*` routes (Next.js 16 pattern)
- No special timeout or remember-me logic for MVP

### Decision 5: Integration Architecture

**Notion Export:**
- OAuth 2.0 flow to get user's access token
- Store token in `integrations` table
- User selects target database during setup
- Export goals + check-in summaries on-demand (button click)

**Zapier Webhooks:**
- Generate unique webhook URL per user
- Fire webhooks on events: `check_in.created`, `goal.completed`
- Simple POST with event payload - Zapier handles the rest

### Decision 6: Error Handling Strategy

| Layer | Strategy |
|-------|----------|
| **API Routes** | Return consistent `{ error, code }` format, appropriate HTTP status |
| **Claude API** | Graceful fallback - show friendly message if AI unavailable, never lose user's check-in |
| **Notion/Zapier** | Fail silently for webhooks, show user-friendly error for Notion sync failures |
| **Forms/UI** | React Hook Form + Zod validation, inline error messages |

**Key Principle:** Never lose user data. If Claude fails, still save the check-in and note AI response pending.

### Decision 7: Infrastructure & Deployment

| Aspect | Decision |
|--------|----------|
| **Hosting** | Vercel (auto-deploy on push to main) |
| **Database** | Supabase managed Postgres (production) |
| **Environments** | `development` (local), `preview` (PR branches), `production` |
| **Environment Variables** | Vercel env vars + `.env.local` for development |
| **Monitoring** | Vercel Analytics + basic error logging for MVP |

### Decision 8: Local Development & Database Strategy

**Database Access Layer:** Drizzle ORM
- Type-safe queries with schema types flowing through code
- Lightweight, SQL-like syntax
- Official Supabase support with RLS compatibility

**Environment Configuration:**
```
# .env.local (local development - devcontainer)
DATABASE_URL=postgresql://postgres:postgres@db:5432/ResolutionTracker

# Vercel/Production
DATABASE_URL=postgresql://...@db.xxxx.supabase.co:5432/postgres
```

**Project Structure:**
```
src/
└── db/
    ├── schema.ts           # Drizzle schema definitions
    ├── index.ts            # DB client export
    └── seed.ts             # Seed script

drizzle/
└── migrations/             # Generated SQL migrations
    ├── 0000_initial.sql
    └── meta/
```

**Migration Workflow (Always Use Migrations - Never Push):**

| Command | Purpose |
|---------|---------|
| `npm run db:generate` | Generate SQL migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to DATABASE_URL |
| `npm run db:seed` | Run seed script for test data |
| `npm run db:reset` | Migrate + seed (full reset) |

**Package.json Scripts:**
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:seed": "npx tsx src/db/seed.ts",
  "db:reset": "npm run db:migrate && npm run db:seed"
}
```

**Local vs Production:**

| Aspect | Local (devcontainer) | Production (Supabase) |
|--------|---------------------|----------------------|
| Database | Postgres 16 container | Supabase managed Postgres |
| Auth | Mocked/bypassed | Supabase Auth |
| Migrations | Drizzle migrations | Same Drizzle migrations |
| RLS | Disabled | Enabled |

### Decision 9: Chat UI Library

**Decision:** Vercel AI SDK + AI Elements

**Packages:**
```bash
npm install ai @ai-sdk/anthropic
```

**Why This Choice:**
- Native Anthropic/Claude support as first-class provider
- AI Elements components built on shadcn/ui (already in stack)
- `useChat` hook handles conversation state, streaming, loading
- Handles markdown rendering and streaming UI automatically
- Production-ready, used by Vercel's own chat products

**Key Components:**

| Component | Purpose |
|-----------|---------|
| `useChat` hook | Manages conversation state, handles streaming |
| AI Elements | Pre-built chat UI components (message thread, input, etc.) |
| `@ai-sdk/anthropic` | Claude API provider with streaming support |

**Architecture Integration:**

```
features/ai-coach/
├── client.ts              # Use @ai-sdk/anthropic provider
├── context-builder.ts     # Builds prompt context (unchanged)
├── prompts.ts             # System prompts (unchanged)
└── types.ts

features/check-ins/
└── components/
    └── check-in-form.tsx  # Uses useChat for conversational input
```

**Key Pattern:**
- Replace direct Claude API calls with Vercel AI SDK's Anthropic provider
- Use `useChat` hook in check-in components for streaming responses
- Leverage AI Elements for consistent chat UI (messages, input, loading states)

**API Route Pattern:**
```typescript
// app/api/check-ins/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages, context } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: buildSystemPrompt(context),
    messages,
  });

  return result.toDataStreamResponse();
}
```

## Implementation Patterns & Consistency Rules

These patterns ensure all AI agents and developers produce compatible, consistent code.

### Naming Conventions

**Database (Drizzle Schema):**

| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `goals`, `check_ins`, `user_summaries` |
| Columns | snake_case | `user_id`, `created_at`, `goal_id` |
| Foreign keys | `{table}_id` | `user_id`, `goal_id` |
| Indexes | `idx_{table}_{column}` | `idx_goals_user_id` |

**API Endpoints:**

| Element | Convention | Example |
|---------|------------|---------|
| Routes | kebab-case, plural nouns | `/api/check-ins`, `/api/goals` |
| Route params | `[id]` (Next.js convention) | `/api/goals/[id]` |
| Query params | camelCase | `?userId=123&includeCompleted=true` |

**Code (TypeScript):**

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `goal-card.tsx`, `context-builder.ts` |
| Components | PascalCase | `GoalCard`, `CheckInForm` |
| Functions | camelCase | `createGoal`, `buildContext` |
| Types/Interfaces | PascalCase | `Goal`, `CheckIn`, `UserSummary` |
| Constants | SCREAMING_SNAKE | `MAX_GOALS`, `API_TIMEOUT` |

### API Response Formats

**Success Response:**
```typescript
// Direct data return (Next.js App Router convention)
return Response.json(data)

// Example
return Response.json({ id: "123", title: "Exercise", status: "active" })
```

**Error Response:**
```typescript
// Consistent error structure
return Response.json(
  { error: "Goal not found", code: "NOT_FOUND" },
  { status: 404 }
)

// Validation errors include field details
return Response.json(
  { error: "Validation failed", code: "VALIDATION_ERROR", details: { title: "Required" } },
  { status: 400 }
)
```

**Standard HTTP Status Codes:**

| Status | Usage |
|--------|-------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | No content (DELETE) |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Not found |
| 500 | Server error |

### Data Format Patterns

| Format | Convention |
|--------|------------|
| JSON fields | camelCase in API responses (transform from snake_case DB) |
| Dates | ISO 8601 strings (`2026-01-13T10:30:00Z`) |
| IDs | UUIDs (Supabase default) |
| Nulls | Use `null`, not `undefined` in JSON |

### Test Organization

| Pattern | Convention |
|---------|------------|
| Location | Co-located: `*.test.ts` next to source file |
| Naming | `{filename}.test.ts` |
| Structure | `describe` by feature, `it` for behaviors |

Example:
```
features/goals/
├── actions.ts
├── actions.test.ts
├── repository.ts
└── repository.test.ts
```

### Loading & Error UI Patterns

| Pattern | Convention |
|---------|------------|
| Loading states | React Suspense + `loading.tsx` files |
| Error boundaries | `error.tsx` files per route segment |
| Form errors | Inline under fields via React Hook Form |
| Notifications | shadcn/ui toast for async success/failure |

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow naming conventions exactly as specified
- Use the standard API response format for all endpoints
- Co-locate tests with source files
- Transform snake_case DB fields to camelCase in API responses
- Use ISO 8601 for all date/time values

## Project Structure & Boundaries

### Complete Project Directory Structure

```
resolution-tracker/
├── .devcontainer/
│   ├── devcontainer.json
│   └── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .env.local                    # Local dev (gitignored)
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── components.json               # shadcn/ui config
│
├── drizzle/
│   └── migrations/               # Generated SQL migrations
│       └── meta/
│
├── public/
│   └── favicon.ico
│
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx              # Landing page
    │   │
    │   ├── (auth)/
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   └── auth/
    │   │       └── callback/
    │   │           └── route.ts  # Magic link callback
    │   │
    │   ├── (dashboard)/
    │   │   ├── layout.tsx        # Protected layout w/ nav
    │   │   ├── page.tsx          # Dashboard home
    │   │   ├── loading.tsx
    │   │   ├── error.tsx
    │   │   ├── goals/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/
    │   │   │       └── page.tsx
    │   │   ├── check-in/
    │   │   │   └── page.tsx      # Conversational check-in
    │   │   └── settings/
    │   │       └── page.tsx      # Integrations config
    │   │
    │   └── api/
    │       ├── goals/
    │       │   ├── route.ts      # GET (list), POST (create)
    │       │   └── [id]/
    │       │       └── route.ts  # GET, PATCH, DELETE
    │       ├── check-ins/
    │       │   └── route.ts      # GET (history), POST (new + AI response)
    │       ├── user/
    │       │   └── summary/
    │       │       └── route.ts  # GET/POST user context
    │       └── integrations/
    │           ├── notion/
    │           │   ├── auth/
    │           │   │   └── route.ts
    │           │   └── sync/
    │           │       └── route.ts
    │           └── zapier/
    │               └── webhook/
    │                   └── route.ts
    │
    ├── features/
    │   ├── goals/
    │   │   ├── actions.ts
    │   │   ├── actions.test.ts
    │   │   ├── queries.ts
    │   │   ├── repository.ts
    │   │   ├── repository.test.ts
    │   │   ├── types.ts
    │   │   └── components/
    │   │       ├── goal-card.tsx
    │   │       ├── goal-form.tsx
    │   │       └── goal-list.tsx
    │   │
    │   ├── check-ins/
    │   │   ├── actions.ts
    │   │   ├── actions.test.ts
    │   │   ├── queries.ts
    │   │   ├── repository.ts
    │   │   ├── types.ts
    │   │   └── components/
    │   │       ├── check-in-form.tsx
    │   │       ├── check-in-history.tsx
    │   │       └── ai-response.tsx
    │   │
    │   ├── ai-coach/
    │   │   ├── client.ts             # Claude API wrapper
    │   │   ├── client.test.ts
    │   │   ├── context-builder.ts    # Builds prompt context
    │   │   ├── context-builder.test.ts
    │   │   ├── prompts.ts            # System prompts
    │   │   ├── summary-repository.ts
    │   │   └── types.ts
    │   │
    │   └── integrations/
    │       ├── notion/
    │       │   ├── auth.ts
    │       │   ├── sync.ts
    │       │   ├── repository.ts
    │       │   └── types.ts
    │       └── zapier/
    │           ├── webhooks.ts
    │           └── types.ts
    │
    ├── shared/
    │   ├── db/
    │   │   ├── client.ts             # Server-side Supabase
    │   │   ├── browser-client.ts     # Client-side Supabase
    │   │   └── index.ts              # Drizzle client export
    │   ├── auth/
    │   │   └── middleware.ts
    │   └── ui/
    │       └── (shadcn components)
    │
    ├── db/
    │   ├── schema.ts                 # Drizzle schema definitions
    │   └── seed.ts                   # Seed script
    │
    ├── lib/
    │   ├── utils.ts                  # cn() and generic helpers
    │   └── constants.ts
    │
    └── middleware.ts                 # Next.js middleware (auth)
```

### Feature to Structure Mapping

| Feature | Location |
|---------|----------|
| **Goal Management** | `features/goals/` + `app/protected/goals/` + `app/api/goals/` |
| **Check-ins & AI** | `features/check-ins/` + `features/ai-coach/` + `app/protected/check-in/` |
| **Notion Integration** | `features/integrations/notion/` + `app/api/integrations/notion/` |
| **Zapier Webhooks** | `features/integrations/zapier/` + `app/api/integrations/zapier/` |
| **Auth** | `app/auth/` + `lib/supabase/proxy.ts` |
| **Database** | `db/schema.ts` + `drizzle/migrations/` + `profiles` table |

### Architectural Boundaries

**API Layer** (`app/api/`)
- Thin route handlers - validate input, call feature services, return responses
- No business logic here

**Feature Layer** (`features/`)
- All business logic lives here
- Each feature owns its types, repository, actions, and components
- Features don't import from each other (use shared/ for common needs)

**Shared Layer** (`shared/`)
- Cross-cutting utilities only
- DB clients, auth helpers, shared UI components
- Keep this small

**Data Layer** (`db/`)
- Schema definitions (single source of truth)
- Migrations generated from schema
- Seed scripts for development

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All 9 decisions work together without conflicts
- Next.js 16 + Supabase + Drizzle + Vercel AI SDK form a cohesive stack
- All technologies are modern, actively maintained, and well-documented

**Pattern Consistency:** Implementation patterns support all architectural decisions
- Naming conventions align with Next.js and Drizzle conventions
- API patterns work with Vercel AI SDK streaming

**Structure Alignment:** Project structure supports all decisions
- Vertical slice architecture accommodates all features
- Clear boundaries between layers

### Requirements Coverage ✅

| Requirement | Architectural Support |
|-------------|----------------------|
| Goal Management | `features/goals/` + API routes + Drizzle schema |
| Conversational Check-ins | `features/check-ins/` + Vercel AI SDK `useChat` |
| AI Coach with Memory | `features/ai-coach/` + sliding window + summary JSON |
| Magic Link Auth | Supabase Auth + middleware |
| Notion Export | `features/integrations/notion/` + OAuth |
| Zapier Webhooks | `features/integrations/zapier/` |

### Implementation Readiness ✅

**Decision Completeness:** All critical decisions documented with versions and rationale
**Structure Completeness:** Full project tree with all files and directories
**Pattern Completeness:** Naming, API, data, and test patterns defined

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context analyzed
- [x] Scale/complexity assessed (Low)
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions (9 Total)**
- [x] AI Context Management (sliding window + summary)
- [x] Data Model Architecture
- [x] Project Structure (DDD + vertical slice)
- [x] Authentication (Supabase magic links)
- [x] Integration Architecture (Notion OAuth, Zapier webhooks)
- [x] Error Handling Strategy
- [x] Infrastructure & Deployment
- [x] Local Development & Database Strategy
- [x] Chat UI Library (Vercel AI SDK + AI Elements)

**✅ Implementation Patterns**
- [x] Naming conventions (DB, API, code)
- [x] API response formats
- [x] Data format patterns
- [x] Test organization (co-located)
- [x] Loading & error UI patterns

**✅ Project Structure**
- [x] Complete directory tree
- [x] Feature boundaries defined
- [x] Requirements mapped to structure

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clean separation of concerns with vertical slice architecture
- Simple, proven tech stack (boring technology that works)
- Vercel AI SDK handles chat complexity (streaming, state, UI)
- Clear patterns prevent AI agent conflicts
- Local development environment ready with Postgres container

**First Implementation Steps:**
```bash
npx create-next-app -e with-supabase resolution-tracker
cd resolution-tracker
npm install ai @ai-sdk/anthropic drizzle-orm drizzle-kit
```

### AI Agent Implementation Guidelines

When implementing this architecture, AI agents MUST:
1. Follow all naming conventions exactly as specified
2. Place code in the correct feature directory
3. Use Vercel AI SDK for all Claude interactions
4. Use Drizzle for all database operations
5. Generate migrations for any schema changes (never use push)
6. Co-locate tests with source files
7. Use the standard API response format

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-13
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**Complete Architecture Document**
- 9 architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**Implementation Ready Foundation**
- 9 architectural decisions made
- 5 implementation pattern categories defined
- 4 feature domains specified (goals, check-ins, ai-coach, integrations)
- All 7 PRD requirements fully supported

### Development Sequence

1. Initialize project: `npx create-next-app -e with-supabase resolution-tracker`
2. Install dependencies: `npm install ai @ai-sdk/anthropic drizzle-orm drizzle-kit`
3. Set up Drizzle schema and generate initial migration
4. Configure environment variables
5. Implement features following architectural patterns

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

