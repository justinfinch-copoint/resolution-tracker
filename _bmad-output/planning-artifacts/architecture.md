---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - prd.md
  - product-brief-week1-2026-01-08.md
  - research/domain-goal-setting-effectiveness-research-2026-01-16.md
workflowType: 'architecture'
project_name: 'Resolution Tracker'
user_name: 'Justin'
date: '2026-01-13'
lastUpdated: '2026-01-19'
status: 'complete'
completedAt: '2026-01-13'
revisionHistory:
  - date: '2026-01-19'
    change: 'Major revision: Multi-Agent Roundtable Architecture (Decision 10), Three-Tier Memory (Decision 1), updated data model and project structure'
    reason: 'PRD evolved to embrace multi-agent team approach vs single AI coach'
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

**Decision:** Three-Tier Memory Architecture with Scoped Context Assembly

> **Update (2026-01):** Revised from "Sliding Window + Periodic Summary" to support multi-agent architecture. Based on Google ADK context engineering patterns and research on memory engineering for multi-agent systems.

**The Problem with Simple Sliding Window:**
- Single-agent approach could dump recent history into context
- Multi-agent requires **scoped context** — each agent needs different information
- Context pollution degrades agent performance (Google ADK research: "context distraction")
- Full history dump wastes tokens and introduces irrelevant information

**Three-Tier Memory Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1: WORKING CONTEXT (Ephemeral, per-invocation)             │
│                                                                  │
│ Assembled fresh for each AI call. Agent-specific.               │
│ • Active agent's system prompt + personality                    │
│ • Agent's available tools                                       │
│ • Scoped messages (last 5-10 relevant to current task)          │
│ • Injected expertise modules for this agent                     │
│                                                                  │
│ Lifecycle: Created → Used → Discarded                           │
│ Storage: None (assembled in memory)                             │
└─────────────────────────────────────────────────────────────────┘
                              ↑ Pulls from
┌─────────────────────────────────────────────────────────────────┐
│ TIER 2: SESSION STATE (Durable for conversation session)        │
│                                                                  │
│ Persists for the duration of a user's session/conversation.     │
│ • Full message history with agent attribution                   │
│ • Agent transition log (who handed off to whom, why)            │
│ • Current active agent                                          │
│ • In-progress goal context (if mid-setup)                       │
│                                                                  │
│ Lifecycle: Session start → Session end                          │
│ Storage: In-memory or Redis (for scaling)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↑ Pulls from
┌─────────────────────────────────────────────────────────────────┐
│ TIER 3: LONG-TERM MEMORY (Persists across sessions)             │
│                                                                  │
│ Durable user knowledge that spans all conversations.            │
│ • User profile (name, preferences, communication style)         │
│ • Goals with full structured data                               │
│ • Check-in history (retrieved via semantic search, not dumped)  │
│ • User summary JSON (AI-consolidated patterns and insights)     │
│ • Agent preferences (which agents user connects with)           │
│                                                                  │
│ Lifecycle: Account creation → Account deletion                  │
│ Storage: Postgres (Drizzle)                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Scoped Context Assembly (Key Pattern):**

Each agent receives **only what it needs**, not the full history:

| Agent | Working Context Includes |
|-------|-------------------------|
| **Coach** | User profile, active goals (summary), last 5-10 messages, user summary, days since last check-in |
| **Goal Architect** | User profile, goal being discussed (full detail), implementation intention research, recent goal-related messages only |
| **Pattern Analyst** | User profile, all goals (summary), check-in statistics, trend data (not raw check-ins) |
| **Motivator** | User profile, recent achievement/struggle context, relevant goal progress |
| **Accountability Partner** | User profile, commitments made, follow-up status, relevant goal details |

**Context Assembly Implementation:**

```typescript
// features/memory/working-context.ts
export function assembleWorkingContext(
  agent: AgentConfig,
  session: SessionState,
  longTermMemory: LongTermMemory,
): WorkingContext {
  // Start with agent's base system prompt
  let systemPrompt = agent.systemPrompt;

  // Inject shared context (all agents get this)
  systemPrompt += buildUserProfileContext(longTermMemory.userProfile);
  systemPrompt += buildGoalsSummaryContext(longTermMemory.goals);

  // Inject agent-specific expertise
  for (const module of agent.expertise) {
    systemPrompt += getExpertiseModule(module);
  }

  // Scope messages — not full history
  const scopedMessages = selectRelevantMessages(
    session.messages,
    agent.id,
    { maxMessages: 10, relevanceFilter: agent.messageFilter }
  );

  return {
    systemPrompt,
    messages: scopedMessages,
    tools: agent.tools,
  };
}
```

**Rationale for Three-Tier:**
- **Separation of concerns:** Each tier has clear lifecycle and storage strategy
- **Scoped context:** Prevents context pollution identified in Google ADK research
- **Multi-agent ready:** Different agents can pull different subsets
- **Token efficiency:** Only relevant information enters working context
- **Debugging:** Clear audit trail of what each agent received

### Decision 2: Data Model Architecture

**Core Entities:**

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `users` | Managed by Supabase Auth | id, email, created_at |
| `profiles` | Links auth.users to public schema | id (matches auth.users.id), email, created_at |
| `goals` | User's resolutions | id, user_id (FK to profiles), title, status, created_at |
| `check_ins` | Conversation entries | id, user_id (FK to profiles), goal_id (nullable), content, ai_response, **agent_id**, created_at |
| `user_summaries` | AI context memory (Tier 3) | id, user_id (FK to profiles), summary_json, updated_at |
| `integrations` | Notion/Zapier configs | id, user_id (FK to profiles), type, access_token, config_json |
| `conversation_sessions` | Session state (Tier 2) | id, user_id, active_agent, messages_json, transitions_json, created_at, updated_at |

**Multi-Agent Additions:**

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `conversation_sessions` | Stores session state between requests | id, user_id, active_agent (enum), messages (jsonb), agent_transitions (jsonb), expires_at |
| `agent_transitions` | Audit log of handoffs | id, session_id, from_agent, to_agent, reason, timestamp |

**Key Decisions:**
- **Goal reference on check-ins:** Optional (supports general check-ins like "feeling motivated")
- **Agent attribution on check-ins:** Track which agent responded (`agent_id` field)
- **Sentiment storage:** None - derive on-demand via Claude when needed
- **User summary format:** JSON only - Claude formats human-readable summaries at runtime
- **Session state storage:** JSONB for flexibility; consider Redis for high-traffic scaling

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

### Decision 10: Multi-Agent Roundtable Architecture

**Decision:** Coordinated team of specialized AI agents using state machine orchestration with visible handoffs

**Context:** The PRD evolved to embrace a multi-agent "roundtable" model where specialized agents collaborate in a single conversation. This is a key differentiator — no goal app has a *team* working for the user. Research from Microsoft Azure AI patterns, Anthropic's agent guidelines, Google ADK context engineering, and Vercel AI SDK patterns informed this architecture.

> **Research Foundation:** Microsoft Azure AI Agent Design Patterns, Anthropic Building Effective Agents, Google ADK Context Engineering, Vercel AI SDK Workflows documentation. See `_bmad-output/planning-artifacts/research/` for full analysis.

**Why Multi-Agent (Revisited Decision):**

The original architecture rejected multi-agent due to concerns about relationship fragmentation, context complexity, and latency. The updated PRD addresses these through:

| Original Concern | How PRD Addresses It |
|------------------|---------------------|
| Relationship fragmentation | Single conversation thread; Coach is always "home base" |
| Context handoff complexity | Three-tier memory architecture with scoped context |
| Latency/cost | Handoffs are infrequent (most interactions stay with Coach) |
| Personality whiplash | Visible handoffs set expectations; each agent has distinct, consistent voice |

**The differentiator:** Users feel they have a *team* working for them, not a single bot switching hats. The "aha moment" is realizing specialized help is available when needed.

**The Agent Team**

| Agent | Role | Personality | When They Step In |
|-------|------|-------------|-------------------|
| **Coach** | Primary interface, daily check-ins, orchestrates handoffs | Supportive friend who remembers everything | Default — always "home base" |
| **Goal Architect** | Structured goal setup, implementation intentions | Thoughtful strategist, asks clarifying questions | New goals, goal restructuring, vague intentions |
| **Pattern Analyst** | Spots trends, weekly/monthly insights | Curious observer, presents insights without judgment | Periodic insights, "how am I doing overall?" |
| **Motivator** | Celebrates wins, picks user up when down | Enthusiastic cheerleader, genuine not performative | Achievements, low moments, milestones |
| **Accountability Partner** | Follows up on commitments, gentle pressure | Direct but caring, doesn't let things slide | Missed check-ins, commitment follow-through |

**MVP Scope:** Implement Coach + Goal Architect first. Design system to support all 5 agents.

**Architecture Pattern: State Machine with Tool-Based Handoffs**

Based on research (Microsoft Handoff pattern + AI Orchestra library pattern), we use a state machine where:
- Each agent is a "state" with its own system prompt, tools, and expertise
- Transitions happen via tool calls (explicit handoff decisions)
- Coach acts as the router/triage agent
- All agents share access to the same memory layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATION LAYER                              │
│                                                                          │
│  ┌─────────────┐    State Machine    ┌─────────────────────────────┐    │
│  │   useChat   │◄──────────────────►│     AgentOrchestrator        │    │
│  │   (client)  │                     │                              │    │
│  └─────────────┘                     │  • Manages active agent      │    │
│                                      │  • Processes handoff tools   │    │
│                                      │  • Assembles agent context   │    │
│                                      │  • Routes to Claude API      │    │
│                                      └─────────────────────────────┘    │
│                                                    │                     │
│                              ┌─────────────────────┼─────────────────┐   │
│                              ▼                     ▼                 ▼   │
│                    ┌──────────────┐      ┌──────────────┐    ┌──────────┐│
│                    │    Coach     │      │Goal Architect│    │  (more)  ││
│                    │              │      │              │    │  agents  ││
│                    │ • Base state │      │ • Goal setup │    │          ││
│                    │ • Handoff    │      │ • Structure  │    │          ││
│                    │   tools      │      │ • Return to  │    │          ││
│                    │              │      │   Coach tool │    │          ││
│                    └──────────────┘      └──────────────┘    └──────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         THREE-TIER MEMORY                                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ WORKING CONTEXT (Per-invocation, agent-specific)                 │    │
│  │ • Active agent's system prompt + personality                     │    │
│  │ • Active agent's tools                                           │    │
│  │ • Scoped recent messages (not full history)                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                        ▲                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ SESSION STATE (Durable for conversation)                         │    │
│  │ • Full message history with agent attribution                    │    │
│  │ • Agent transition log                                           │    │
│  │ • Current active agent                                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                        ▲                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ LONG-TERM MEMORY (Persists across sessions)                      │    │
│  │ • User profile (name, preferences, patterns)                     │    │
│  │ • Goals with structured data                                     │    │
│  │ • Check-in history (retrieved via RAG, not full dump)            │    │
│  │ • User summary JSON (consolidated patterns)                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Handoff Mechanism: Tool-Based Transitions**

Agents have explicit handoff tools. When invoked, the orchestrator transitions state:

```typescript
// features/agents/coach/tools.ts
export const coachTools = {
  transferToGoalArchitect: tool({
    description: 'Hand off to Goal Architect when user wants to create a new goal, restructure an existing goal, or when a goal feels vague and needs structure',
    parameters: z.object({
      reason: z.string().describe('Why this handoff is happening'),
      goalContext: z.string().optional().describe('Any goal-related context to pass'),
    }),
    execute: async ({ reason, goalContext }) => {
      return {
        handoff: 'goalArchitect',
        reason,
        context: goalContext,
        announcement: "Let me bring in the Goal Architect — they're great at turning intentions into concrete plans."
      };
    },
  }),

  transferToMotivator: tool({
    description: 'Hand off to Motivator when user achieves something, hits a milestone, or needs encouragement after expressing low mood',
    parameters: z.object({
      reason: z.string(),
      achievement: z.string().optional(),
    }),
    execute: async ({ reason, achievement }) => {
      return {
        handoff: 'motivator',
        reason,
        context: achievement,
        announcement: "The Motivator wants to jump in here..."
      };
    },
  }),

  // Pattern Analyst and Accountability Partner tools follow same pattern
};

// features/agents/goal-architect/tools.ts
export const goalArchitectTools = {
  returnToCoach: tool({
    description: 'Return control to Coach when goal setup is complete or user wants general conversation',
    parameters: z.object({
      summary: z.string().describe('Summary of what was accomplished'),
      goalId: z.string().optional().describe('ID of created/modified goal'),
    }),
    execute: async ({ summary, goalId }) => {
      return {
        handoff: 'coach',
        reason: 'Goal setup complete',
        context: summary,
        announcement: "Great work! Handing you back to Coach."
      };
    },
  }),

  // Goal Architect also has goal creation/modification tools
  createGoal: tool({ /* ... uses services layer */ }),
  updateGoal: tool({ /* ... uses services layer */ }),
};
```

**Orchestrator Implementation**

```typescript
// features/agents/orchestrator.ts
import { generateText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

type AgentId = 'coach' | 'goalArchitect' | 'patternAnalyst' | 'motivator' | 'accountabilityPartner';

interface AgentState {
  activeAgent: AgentId;
  transitionHistory: Array<{ from: AgentId; to: AgentId; reason: string; timestamp: Date }>;
}

interface AgentConfig {
  systemPrompt: string;
  tools: Record<string, ReturnType<typeof tool>>;
  expertise: string[];  // Domain knowledge modules to include
}

const agentConfigs: Record<AgentId, AgentConfig> = {
  coach: {
    systemPrompt: COACH_SYSTEM_PROMPT,
    tools: { ...coachTools, ...sharedTools },
    expertise: ['base-persona', 'check-in-support', 'return-engagement'],
  },
  goalArchitect: {
    systemPrompt: GOAL_ARCHITECT_SYSTEM_PROMPT,
    tools: { ...goalArchitectTools, ...sharedTools },
    expertise: ['base-persona', 'goal-setup', 'implementation-intentions', 'smart-criteria'],
  },
  // ... other agents
};

export async function processMessage(
  userMessage: string,
  sessionState: AgentState,
  memoryContext: MemoryContext,  // From three-tier memory
): Promise<AgentResponse> {
  const config = agentConfigs[sessionState.activeAgent];

  // Assemble working context (scoped, not full history)
  const workingContext = assembleWorkingContext(
    config,
    sessionState,
    memoryContext,
  );

  const result = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: workingContext.systemPrompt,
    messages: workingContext.messages,
    tools: config.tools,
    maxSteps: 5,  // Allow multi-step tool use within single turn
    onStepFinish: async ({ toolCalls, toolResults }) => {
      // Detect handoff tools and update state
      for (const result of toolResults) {
        if (result.result?.handoff) {
          await handleAgentTransition(sessionState, result.result);
        }
      }
    },
  });

  return {
    text: result.text,
    activeAgent: sessionState.activeAgent,
    toolResults: result.toolResults,
  };
}

async function handleAgentTransition(
  state: AgentState,
  handoff: { handoff: AgentId; reason: string; announcement?: string },
) {
  state.transitionHistory.push({
    from: state.activeAgent,
    to: handoff.handoff,
    reason: handoff.reason,
    timestamp: new Date(),
  });
  state.activeAgent = handoff.handoff;
}
```

**Handoff Triggers**

| Trigger Type | Signal | Target Agent |
|--------------|--------|--------------|
| **Intent: New Goal** | "I want to...", "new goal", "start working on" | Goal Architect |
| **Intent: Restructure** | "this goal isn't working", "need to change my approach" | Goal Architect |
| **Achievement** | Goal completed, milestone hit, positive progress | Motivator |
| **Low Mood** | Sentiment signals: "feel bad", "failed", "giving up" | Motivator |
| **Pattern Request** | "how am I doing overall?", "any patterns?" | Pattern Analyst |
| **Commitment Lapse** | User mentioned doing X, hasn't reported (detected by system) | Accountability Partner |
| **Explicit Request** | "can I talk to [agent name]?" | Requested agent |
| **Return to Coach** | Task complete, general conversation, user request | Coach |

**Visible Handoff Protocol**

Handoffs are **visible to the user** with natural transition language:

```
Coach: "That sounds like a goal worth pursuing. Let me bring in the
       Goal Architect — they're great at turning intentions into
       concrete plans."

Goal Architect: "Hey! Let's make this specific. When you say 'get
                healthier,' what does success look like to you?"

[...goal setup conversation...]

Goal Architect: "Perfect, you're all set with a solid plan. Handing
                you back to Coach."

Coach: "Great work with the Goal Architect. I'll check in with you
       tomorrow to see how day one went."
```

**Why visible handoffs:**
- Builds trust through transparency
- Sets expectations for different interaction styles
- Reinforces the "team" value proposition (PRD's key differentiator)
- Enables user agency ("Can I talk to the Accountability Partner?")

**Agent Personality Guidelines**

Each agent has a distinct voice while sharing core values:

| Agent | Voice Characteristics | Example Phrases |
|-------|----------------------|-----------------|
| **Coach** | Warm, curious, supportive | "Good to see you", "How are you feeling about...", "What matters most to you right now?" |
| **Goal Architect** | Thoughtful, clarifying, structured | "Let's make this concrete", "When specifically will you...", "What's your if-then plan?" |
| **Pattern Analyst** | Observational, neutral, data-driven | "I've noticed...", "Looking at your check-ins...", "The data suggests..." |
| **Motivator** | Enthusiastic, celebratory, energizing | "That's huge!", "You showed up when it was hard", "Look how far you've come" |
| **Accountability Partner** | Direct, caring, persistent | "You mentioned you'd...", "What got in the way?", "What's one thing you can commit to?" |

**Shared values across all agents:**
- No guilt mechanics
- "Better than nothing" philosophy
- Respect for user autonomy
- Non-judgmental framing

**Project Structure for Multi-Agent**

```
features/
├── agents/
│   ├── orchestrator.ts           # State machine, routing, handoff processing
│   ├── types.ts                  # Shared agent types
│   ├── context-builder.ts        # Assembles working context per agent
│   ├── shared-tools.ts           # Tools available to all agents
│   │
│   ├── coach/
│   │   ├── system-prompt.ts      # Coach personality + instructions
│   │   ├── tools.ts              # Coach-specific tools (handoffs)
│   │   └── index.ts
│   │
│   ├── goal-architect/
│   │   ├── system-prompt.ts      # Goal Architect personality
│   │   ├── tools.ts              # Goal creation, return-to-coach
│   │   ├── expertise/            # Domain knowledge modules
│   │   │   ├── implementation-intentions.ts
│   │   │   ├── smart-criteria.ts
│   │   │   └── goal-types.ts
│   │   └── index.ts
│   │
│   ├── pattern-analyst/          # Future: MVP+1
│   │   └── ...
│   │
│   ├── motivator/                # Future: MVP+1
│   │   └── ...
│   │
│   └── accountability-partner/   # Future: MVP+2
│       └── ...
│
├── memory/                       # Three-tier memory system
│   ├── working-context.ts        # Per-invocation context assembly
│   ├── session-state.ts          # Conversation-level state
│   ├── long-term/
│   │   ├── user-profile.ts       # User preferences, patterns
│   │   ├── user-summary.ts       # Consolidated AI summary
│   │   └── retrieval.ts          # RAG for check-in history
│   └── types.ts
```

**MVP Implementation Sequence**

1. **Phase 1: Coach + Goal Architect**
   - Implement orchestrator with two-agent state machine
   - Coach handles check-ins, general conversation
   - Goal Architect handles goal creation/modification
   - Handoff tools for transitions
   - Visible handoff announcements

2. **Phase 2: Add Motivator**
   - Triggered by achievements and low mood
   - Coach learns to detect celebration/encouragement moments

3. **Phase 3: Add Pattern Analyst**
   - Requires check-in history for pattern detection
   - Periodic insights surfaced by Coach

4. **Phase 4: Add Accountability Partner**
   - Requires commitment tracking
   - Proactive follow-up on missed commitments

**Key Architectural Principles**

1. **Coach is always home base** — All conversations start with Coach; specialists return to Coach
2. **Scoped context, not full dump** — Each agent gets minimal necessary context
3. **Tools for transitions** — Explicit handoff decisions, not implicit switching
4. **Visible handoffs** — Users see and understand agent transitions
5. **Shared memory, specialized expertise** — All agents access same user data; each has domain knowledge
6. **Design for 5, implement 2** — Architecture supports full team; MVP delivers core pair

### Decision 11: Services Layer Pattern

**Decision:** Extract business logic into a dedicated services layer with consistent result types

**Context:** As the application grew to include AI Coach tools that need to create/modify goals, milestones, and implementation intentions, we needed a way to share business logic between API routes and AI tools without duplication.

**Pattern: ServiceResult<T> Discriminated Union**

```typescript
// Consistent return type for all service functions
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Example service function
export async function createGoalService(
  userId: string,
  input: unknown
): Promise<ServiceResult<Goal>> {
  // 1. Validate input with Zod
  const parsed = createGoalInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    };
  }

  // 2. Execute business logic
  const [goal] = await db.insert(goals).values({...}).returning();

  // 3. Return typed result
  return { success: true, data: goal };
}
```

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    API Routes                                │
│            (Thin handlers - auth + delegation)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│          (Business logic + validation + DB access)           │
│                                                              │
│  • Zod validation at boundary                                │
│  • ServiceResult<T> return type                              │
│  • Ownership verification                                    │
│  • Transaction management                                    │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                    AI Coach Tools                            │
│            (Same services, different consumer)               │
└─────────────────────────────────────────────────────────────┘
```

**Error Code Mapping:**

| Service Error Code | HTTP Status | Usage |
|-------------------|-------------|-------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `NOT_FOUND` | 404 | Resource doesn't exist or not owned by user |
| `INTERNAL_ERROR` | 500 | Database or unexpected errors |

**API Route Pattern:**

```typescript
// app/api/goals/route.ts
function errorCodeToStatus(code: string): number {
  switch (code) {
    case 'NOT_FOUND': return 404;
    case 'VALIDATION_ERROR': return 400;
    default: return 500;
  }
}

export async function POST(request: Request) {
  // Auth check...
  const body = await request.json();

  const result = await createGoalService(user.id, body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: errorCodeToStatus(result.error.code) }
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}
```

**File Organization:**

```
features/
├── goals/
│   ├── services.ts        # createGoalService, updateGoalService, etc.
│   ├── repository.ts      # Raw DB queries (optional, for complex cases)
│   ├── types.ts           # Zod schemas + TypeScript types
│   └── index.ts           # Re-exports services
├── milestones/
│   ├── services.ts
│   └── ...
└── implementation-intentions/
    ├── services.ts
    └── ...
```

**Key Benefits:**
- **Single source of truth** for business logic
- **Type-safe error handling** via discriminated unions
- **Reusability** - same services power API routes and AI tools
- **Testability** - services can be unit tested in isolation
- **Consistency** - all consumers get the same validation and behavior

**Rationale:** This pattern emerged from the need to support AI Coach tools that create and modify user data. Rather than duplicating validation and business logic between API routes and AI tools, we extract it to a services layer that both can consume.

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
    │   ├── agents/                   # Multi-Agent System (Decision 10)
    │   │   ├── orchestrator.ts           # State machine, routing, handoff processing
    │   │   ├── orchestrator.test.ts
    │   │   ├── types.ts                  # Shared agent types (AgentId, AgentState, etc.)
    │   │   ├── shared-tools.ts           # Tools available to all agents
    │   │   │
    │   │   ├── coach/                    # Primary agent - home base
    │   │   │   ├── system-prompt.ts      # Coach personality + instructions
    │   │   │   ├── tools.ts              # Handoff tools (transferToGoalArchitect, etc.)
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── goal-architect/           # Goal setup specialist
    │   │   │   ├── system-prompt.ts      # Goal Architect personality
    │   │   │   ├── tools.ts              # Goal creation, returnToCoach
    │   │   │   ├── expertise/            # Domain knowledge modules
    │   │   │   │   ├── implementation-intentions.ts
    │   │   │   │   ├── smart-criteria.ts
    │   │   │   │   └── goal-types.ts
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── pattern-analyst/          # Future: MVP+1
    │   │   │   └── (placeholder)
    │   │   │
    │   │   ├── motivator/                # Future: MVP+1
    │   │   │   └── (placeholder)
    │   │   │
    │   │   └── accountability-partner/   # Future: MVP+2
    │   │       └── (placeholder)
    │   │
    │   ├── memory/                   # Three-Tier Memory System (Decision 1)
    │   │   ├── working-context.ts        # Per-invocation context assembly
    │   │   ├── working-context.test.ts
    │   │   ├── session-state.ts          # Conversation-level state management
    │   │   ├── long-term/
    │   │   │   ├── user-profile.ts       # User preferences, patterns
    │   │   │   ├── user-summary.ts       # Consolidated AI summary
    │   │   │   └── retrieval.ts          # RAG for check-in history (future)
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
| **Goal Management** | `features/goals/` + `app/(dashboard)/goals/` + `app/api/goals/` |
| **Check-ins & Conversation** | `features/check-ins/` + `app/(dashboard)/check-in/` + `app/api/check-ins/` |
| **Multi-Agent System** | `features/agents/` (orchestrator, coach, goal-architect, etc.) |
| **Memory System** | `features/memory/` (working-context, session-state, long-term/) |
| **Notion Integration** | `features/integrations/notion/` + `app/api/integrations/notion/` |
| **Zapier Webhooks** | `features/integrations/zapier/` + `app/api/integrations/zapier/` |
| **Auth** | `app/(auth)/` + `middleware.ts` |
| **Database** | `db/schema.ts` + `drizzle/migrations/` |

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

**Decision Compatibility:** All 11 decisions work together without conflicts
- Next.js 16 + Supabase + Drizzle + Vercel AI SDK form a cohesive stack
- Multi-Agent Roundtable Architecture (Decision 10) builds on Three-Tier Memory (Decision 1) and Chat UI (Decision 9)
- State machine orchestration integrates cleanly with Vercel AI SDK's tool-based patterns
- All technologies are modern, actively maintained, and well-documented

**Pattern Consistency:** Implementation patterns support all architectural decisions
- Naming conventions align with Next.js and Drizzle conventions
- API patterns work with Vercel AI SDK streaming
- Agent handoff tools follow established tool patterns

**Structure Alignment:** Project structure supports all decisions
- Vertical slice architecture accommodates all features
- Clear boundaries between layers
- `features/agents/` and `features/memory/` provide clear homes for multi-agent code

### Requirements Coverage ✅

| Requirement | Architectural Support |
|-------------|----------------------|
| Goal Management | `features/goals/` + API routes + Drizzle schema |
| Conversational Check-ins | `features/check-ins/` + Vercel AI SDK `useChat` |
| AI Agent Team with Memory | `features/agents/` (orchestrator, coach, goal-architect) + `features/memory/` (three-tier) |
| Visible Agent Handoffs | Tool-based transitions with announcement messages |
| Magic Link Auth | Supabase Auth + middleware |
| Notion Export | `features/integrations/notion/` + OAuth |
| Zapier Webhooks | `features/integrations/zapier/` |

### Implementation Readiness ✅

**Decision Completeness:** All 11 critical decisions documented with versions and rationale
**Structure Completeness:** Full project tree with all files and directories
**Pattern Completeness:** Naming, API, data, and test patterns defined
**Multi-Agent Ready:** State machine, handoff protocol, and memory architecture defined

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context analyzed
- [x] Scale/complexity assessed (Low)
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions (11 Total)**
- [x] AI Context Management (three-tier memory architecture)
- [x] Data Model Architecture (with session state for multi-agent)
- [x] Project Structure (DDD + vertical slice)
- [x] Authentication (Supabase magic links)
- [x] Integration Architecture (Notion OAuth, Zapier webhooks)
- [x] Error Handling Strategy
- [x] Infrastructure & Deployment
- [x] Local Development & Database Strategy
- [x] Chat UI Library (Vercel AI SDK + AI Elements)
- [x] Multi-Agent Roundtable Architecture (state machine + tool-based handoffs)
- [x] Services Layer Pattern (ServiceResult<T> discriminated union)

**✅ Implementation Patterns**
- [x] Naming conventions (DB, API, code)
- [x] API response formats
- [x] Data format patterns
- [x] Test organization (co-located)
- [x] Loading & error UI patterns
- [x] Agent handoff protocol (visible transitions)
- [x] Scoped context assembly per agent

**✅ Project Structure**
- [x] Complete directory tree
- [x] Feature boundaries defined
- [x] Requirements mapped to structure
- [x] Multi-agent folder structure defined

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clean separation of concerns with vertical slice architecture
- Enterprise-grade multi-agent orchestration with state machine pattern
- Three-tier memory prevents context pollution (research-backed)
- Visible handoffs build user trust and enable agent identity
- Vercel AI SDK handles chat complexity (streaming, state, UI)
- Design for 5 agents, implement 2 for MVP (scalable approach)
- Clear patterns prevent AI agent conflicts
- Local development environment ready with Postgres container

**Research Foundation:**
- Microsoft Azure AI Agent Design Patterns (Handoff pattern)
- Anthropic Building Effective Agents (tool-based orchestration)
- Google ADK Context Engineering (three-tier memory)
- Vercel AI SDK Workflows documentation

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
8. Implement agent tools with proper handoff return types
9. Use scoped context assembly (not full history dump)
10. Include visible handoff announcements in agent transitions

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** UPDATED ✅
**Total Steps Completed:** 8 (original) + multi-agent revision
**Date Completed:** 2026-01-13
**Last Updated:** 2026-01-19 (Multi-Agent Roundtable Architecture)
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**Complete Architecture Document**
- 11 architectural decisions documented with specific versions
- Multi-agent roundtable architecture with state machine orchestration
- Three-tier memory system with scoped context assembly
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**Implementation Ready Foundation**
- 11 architectural decisions made
- 5 implementation pattern categories defined
- 5 feature domains specified (goals, check-ins, agents, memory, integrations)
- All PRD requirements fully supported including agent team
- Multi-agent architecture with handoff protocol defined
- MVP scope: Coach + Goal Architect (extensible to 5 agents)

### Development Sequence

1. Initialize project: `npx create-next-app -e with-supabase resolution-tracker`
2. Install dependencies: `npm install ai @ai-sdk/anthropic drizzle-orm drizzle-kit`
3. Set up Drizzle schema and generate initial migration (include session state table)
4. Configure environment variables
5. Implement `features/memory/` (three-tier memory system)
6. Implement `features/agents/orchestrator.ts` (state machine)
7. Implement Coach agent (`features/agents/coach/`)
8. Implement Goal Architect agent (`features/agents/goal-architect/`)
9. Wire up to `useChat` and API routes
10. Add remaining agents incrementally (Motivator, Pattern Analyst, Accountability Partner)

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

