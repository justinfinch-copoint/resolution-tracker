---
title: 'AI Coach with Conversational Check-ins'
slug: 'ai-coach-conversational-checkins'
created: '2026-01-14'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Next.js 16 (App Router)
  - TypeScript 5.x (strict mode)
  - Vercel AI SDK (ai v6.0.33, @ai-sdk/anthropic v3.0.12)
  - Drizzle ORM
  - Supabase (Postgres + Auth)
  - shadcn/ui (button, card, input, sheet)
files_to_modify:
  - src/features/check-ins/types.ts (create)
  - src/features/check-ins/repository.ts (create)
  - src/features/check-ins/queries.ts (create)
  - src/features/check-ins/index.ts (create)
  - src/features/ai-coach/types.ts (create)
  - src/features/ai-coach/prompts.ts (create)
  - src/features/ai-coach/tools.ts (create - agent tools)
  - src/features/ai-coach/context-builder.ts (create)
  - src/features/ai-coach/summary-repository.ts (create)
  - src/features/ai-coach/components/chat-bubble.tsx (create)
  - src/features/ai-coach/components/chat-input.tsx (create)
  - src/features/ai-coach/components/chat-thread.tsx (create)
  - src/features/ai-coach/index.ts (create)
  - app/api/chat/route.ts (create)
  - app/(protected)/chat/page.tsx (create - dedicated chat route)
  - components/menu-sheet.tsx (modify - add Chat nav link)
  - lib/utils.ts (modify - change DEFAULT_PROTECTED_PAGE_FALLBACK to /chat)
code_patterns:
  - DDD + Vertical Slice architecture
  - Business logic in features/, thin API routes
  - useChat hook for conversation state (Vercel AI SDK)
  - streamText with tools for agentic responses
  - tool() function with Zod schemas for agent actions
  - snake_case DB to camelCase API transformation
test_patterns:
  - Co-located tests (*.test.ts next to source)
  - describe by feature, it for behaviors
---

# Tech-Spec: AI Coach with Conversational Check-ins

**Created:** 2026-01-14

## Overview

### Problem Statement

Users need a way to track progress on their goals without the friction of traditional check-in forms. Current goal-tracking apps feel like chores - passive checkbox lists that users abandon by February. Resolution Tracker's core value proposition is a conversational AI coach that feels like texting a supportive friend who remembers your story.

### Solution

Build a chat-first interface where users converse naturally with an AI coach. The AI:
- Maintains context through a sliding window of recent messages + a stored user summary
- Detects goal progress from natural conversation and automatically creates check-in records
- Responds with warmth and memory, referencing past patterns and struggles
- Generates and updates user summaries periodically to maintain long-term memory

The chat interface becomes the default landing page for authenticated users, making conversation the primary interaction model.

### Scope

**In Scope:**
- **AI Coach feature:** Chat UI components, context builder, prompts, agent tools, summary repository
- **Check-ins feature:** Data layer only (types, repository, queries for storing progress records)
- API route for chat with streaming responses (`/api/chat`)
- Automatic check-in creation when AI detects goal progress (via agent tools)
- User summary generation and periodic updates
- Dedicated chat page at `/chat` as the default landing for authenticated users

**Out of Scope:**
- Proactive notifications/reminders
- Notion/Zapier integrations (separate feature)
- Advanced analytics or visualizations
- Sentiment analysis visualization
- Goal modification through chat (use Goals page)

## Context for Development

### Codebase Patterns

**Architecture:** DDD + Vertical Slice
- Business logic lives in `src/features/{domain}/`
- API routes are thin: validate input, delegate to feature, return response
- Each feature owns: types, repository, queries, components
- Features don't import from each other - use `shared/` for common needs

**Naming Conventions:**
- Files: `kebab-case.ts` (`chat-bubble.tsx`, `context-builder.ts`)
- Components: `PascalCase` (`ChatBubble`, `ChatInput`)
- Functions: `camelCase` (`buildContext`, `createCheckIn`)
- Types: `PascalCase` (`CheckIn`, `UserSummary`, `ChatContext`)
- DB tables/columns: `snake_case` (`check_ins`, `ai_response`, `summary_json`)

**API Response Format:**
- Success: `Response.json(data)` with camelCase fields
- Error: `Response.json({ error: string, code: string }, { status: number })`
- Streaming: Use `streamText` from Vercel AI SDK, return `result.toUIMessageStreamResponse()`

**Auth Pattern:**
- Server: `const supabase = await createClient()` then `supabase.auth.getUser()`
- User ID comes from `user.id` (UUID matching profiles.id)

**Vercel AI SDK v6 Pattern (Agent with Tools):**
- Client: `useChat` hook from `@ai-sdk/react` - manages conversation state via `sendMessage`, `status`, and `messages`
- Server: `streamText` with `anthropic` provider and `tools` for agent actions
- Tools: Defined with `tool()` function using `inputSchema` with Zod schemas for type-safe execution
- Model: `claude-sonnet-4-20250514` (per architecture doc)
- Loop Control: Use `stopWhen: stepCountIs(5)` to limit agent steps (default is 20)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts` | `checkIns`, `userSummaries` tables already defined |
| `src/db/index.ts` | Drizzle client export (`db`) |
| `src/features/goals/repository.ts` | Pattern for repository layer |
| `src/features/goals/queries.ts` | Pattern for query/transform layer |
| `src/features/goals/types.ts` | Pattern for types/constants |
| `src/features/goals/components/goal-list.tsx` | Pattern for client components with fetch |
| `app/api/goals/route.ts` | Pattern for thin API routes |
| `lib/supabase/server.ts` | Server-side Supabase client |
| `lib/supabase/proxy.ts` | Auth middleware with DEFAULT_PROTECTED_PAGE redirect |
| `lib/utils.ts` | DEFAULT_PROTECTED_PAGE_FALLBACK constant |
| `components/menu-sheet.tsx` | Navigation menu (needs Chat link) |
| `_bmad-output/planning-artifacts/architecture.md` | AI context management decisions |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | Chat UI specs |

### Technical Decisions

**1. Chat API Route Location:** `/api/chat` (not `/api/check-ins`)
- The chat endpoint handles the conversation flow
- Check-ins are created as a side effect when AI detects progress
- Follows Vercel AI SDK conventions

**2. AI Context Strategy (from architecture doc):**
- Sliding window: Last 10-15 check-ins sent with each request
- User summary: Stored JSON in `user_summaries` table with patterns, wins, struggles
- Goals: Include user's active goals for context

**3. Check-in Creation Flow:**
- User sends message → AI processes with context → AI responds
- AI response includes tool call or structured output indicating if goal progress detected
- If progress detected, create check-in record with goalId, content, aiResponse

**4. User Summary Updates:**
- Update summary after every N check-ins (e.g., every 5)
- Or when significant event detected (goal completed, long absence return)
- Summary is JSON that Claude formats at runtime

**5. Default Page Change:**
- Create dedicated chat route at `/(protected)/chat/page.tsx`
- Change `DEFAULT_PROTECTED_PAGE_FALLBACK` in `lib/utils.ts` from `/goals` to `/chat`
- Keeps `/(protected)/page.tsx` available for future dashboard

**6. Agent Architecture with Tools (Vercel AI SDK v6):**
The AI coach is designed as an agent with tools (per Vercel AI SDK v6 agent pattern):

```typescript
import { tool } from 'ai';
import { z } from 'zod';

// Tool definitions using tool() with inputSchema (v6 API)
const coachTools = {
  recordCheckIn: tool({
    description: 'Record a check-in when user reports progress on a goal',
    inputSchema: z.object({
      goalId: z.string().nullable().describe('The goal ID if specific, null if general'),
      content: z.string().describe('Summary of what the user shared'),
      sentiment: z.enum(['positive', 'neutral', 'struggling']),
    }),
    execute: async ({ goalId, content, sentiment }) => { /* create check-in */ },
  }),

  updateUserSummary: tool({
    description: 'Update user summary with new patterns, wins, or struggles',
    inputSchema: z.object({
      patterns: z.array(z.string()).optional(),
      wins: z.array(z.string()).optional(),
      struggles: z.array(z.string()).optional(),
    }),
    execute: async (updates) => { /* merge into user_summaries */ },
  }),

  markGoalComplete: tool({
    description: 'Mark a goal as completed when user achieves it',
    inputSchema: z.object({
      goalId: z.string(),
      celebrationNote: z.string().optional(),
    }),
    execute: async ({ goalId }) => { /* update goal status */ },
  }),
};
```

**Note:** In v6, `inputSchema` replaces the v3/v4 `parameters` property. Zod schemas work directly without a wrapper.

**Why Agent Architecture:**
- Tools let the AI take real actions (record check-ins, update summaries)
- Structured tool calls are more reliable than parsing unstructured text
- The agent loop handles multi-step reasoning naturally
- Tool results can inform the AI's response (e.g., confirming a goal was marked complete)

## Implementation Plan

### Tasks

#### Phase 1: Check-ins Data Layer (Records Only)

- [x] **Task 1:** Create check-ins types
  - File: `src/features/check-ins/types.ts`
  - Action: Define `CheckInResponse`, `CreateCheckInInput` types
  - Export constants: `MAX_CHECK_IN_LENGTH = 2000`
  - Re-export `CheckIn`, `NewCheckIn` from `@/src/db/schema`

- [x] **Task 2:** Create check-ins repository
  - File: `src/features/check-ins/repository.ts`
  - Action: Implement CRUD functions following goals/repository.ts pattern
  - Functions: `createCheckIn(userId, input)`, `getCheckInsByUserId(userId, limit)`, `getRecentCheckIns(userId, limit = 15)`
  - Use Drizzle with `desc(checkIns.createdAt)` ordering

- [x] **Task 3:** Create check-ins queries
  - File: `src/features/check-ins/queries.ts`
  - Action: Transform functions and query helpers
  - Functions: `transformCheckInToResponse(checkIn)`, `getUserCheckIns(userId, limit)`

- [x] **Task 4:** Create check-ins index
  - File: `src/features/check-ins/index.ts`
  - Action: Barrel export for types, queries, and (later) components

#### Phase 2: AI Coach Feature - Core

- [x] **Task 5:** Create AI coach types
  - File: `src/features/ai-coach/types.ts`
  - Action: Define context types for AI
  - Types: `ChatContext`, `UserSummaryData` (re-export from schema), `CoachMessage`
  - Define sentiment enum: `'positive' | 'neutral' | 'struggling'`
  - Include helper type imports from `@ai-sdk/react` for v6 message handling:
    ```typescript
    import type { UIMessage, UIMessagePart } from '@ai-sdk/react';
    export type { UIMessage, UIMessagePart };
    ```

- [x] **Task 6:** Create summary repository
  - File: `src/features/ai-coach/summary-repository.ts`
  - Action: CRUD for user_summaries table
  - Functions: `getUserSummary(userId)`, `upsertUserSummary(userId, data)`, `mergeUserSummary(userId, updates)`
  - Use Drizzle `onConflictDoUpdate` for upsert pattern

- [x] **Task 7:** Create context builder
  - File: `src/features/ai-coach/context-builder.ts`
  - Action: Build context object for AI prompts
  - Function: `buildChatContext(userId): Promise<ChatContext>`
  - Fetches: recent check-ins (15), user summary, active goals
  - Returns structured context for system prompt

- [x] **Task 8:** Create system prompts
  - File: `src/features/ai-coach/prompts.ts`
  - Action: Define system prompt for coach persona
  - Function: `buildSystemPrompt(context: ChatContext): string`
  - Include: persona instructions, user context, goals, patterns/wins/struggles from summary
  - Tone: warm, supportive, no guilt, "better than nothing" philosophy
  - Include tool usage instructions

#### Phase 3: AI Coach Feature - Agent Tools

- [x] **Task 9:** Create agent tools
  - File: `src/features/ai-coach/tools.ts`
  - Action: Define tools using Vercel AI SDK v6 `tool()` function with `inputSchema`
  - Imports: `import { tool } from 'ai'; import { z } from 'zod';`
  - Tools:
    - `recordCheckIn`: Creates check-in record (calls check-ins repository)
    - `updateUserSummary`: Merges new patterns/wins/struggles into summary
    - `markGoalComplete`: Updates goal status to 'completed' (calls goals repository)
  - Each tool has Zod schema via `inputSchema` property and `execute` function
  - Export: `createCoachTools(userId: string)` factory function

- [x] **Task 10:** Create AI coach index
  - File: `src/features/ai-coach/index.ts`
  - Action: Barrel export for all AI coach functionality
  - Exports: types, `buildChatContext`, `buildSystemPrompt`, `createCoachTools`

#### Phase 4: API Route

- [x] **Task 11:** Create chat API route
  - File: `app/api/chat/route.ts`
  - Action: Streaming chat endpoint with agent tools (v6 API)
  - Pattern:
    ```typescript
    import { anthropic } from '@ai-sdk/anthropic';
    import { streamText, stepCountIs } from 'ai';
    import { createClient } from '@/lib/supabase/server';
    import { buildChatContext, buildSystemPrompt, createCoachTools } from '@/src/features/ai-coach';

    export async function POST(req: Request) {
      // 1. Auth check
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Parse messages from request
      const { messages } = await req.json();

      // 3. Build context and system prompt
      const context = await buildChatContext(user.id);
      const systemPrompt = buildSystemPrompt(context);

      // 4. Create tools with userId
      const tools = createCoachTools(user.id);

      // 5. Call streamText with anthropic provider, system prompt, messages, tools
      const result = streamText({
        model: anthropic('claude-sonnet-4-20250514'),
        system: systemPrompt,
        messages,
        tools,
        stopWhen: stepCountIs(5), // v6: replaces maxSteps
      });

      // 6. Return streaming response (v6 API)
      return result.toUIMessageStreamResponse();
    }
    ```
  - v6: Use `stopWhen: stepCountIs(5)` instead of `maxSteps: 5`
  - v6: Use `toUIMessageStreamResponse()` instead of `toDataStreamResponse()`
  - Handle auth errors with 401 response

#### Phase 5: AI Coach UI Components

- [x] **Task 12:** Create ChatBubble component
  - File: `src/features/ai-coach/components/chat-bubble.tsx`
  - Action: Message bubble component for chat thread
  - Props: `variant: 'user' | 'ai'`, `content: string`, `timestamp?: string`
  - Note: Parent component extracts text from v6 `message.parts` array and passes as `content` string
  - Styling per UX spec:
    - User: amber (#E59500) background, white text, right-aligned, rounded-2xl
    - AI: warm gray (#FAF8F5) background, dark text, left-aligned with small icon
  - Support markdown rendering in AI messages (bold, italic)
  - Max-width 85% of container

- [x] **Task 13:** Create ChatInput component
  - File: `src/features/ai-coach/components/chat-input.tsx`
  - Action: Bottom-anchored message input (controlled component for v6 compatibility)
  - Props: `value: string`, `onChange: (value: string) => void`, `onSend: () => void`, `isLoading?: boolean`
  - Features:
    - Text input with send button (controlled via value/onChange)
    - Send on Enter key or button click
    - Disable send when empty or loading
    - 56px min height, thumb-friendly
    - Show loading indicator when AI is responding
  - Note: v6 useChat doesn't manage input state, so parent owns the state

- [x] **Task 14:** Create ChatThread component
  - File: `src/features/ai-coach/components/chat-thread.tsx`
  - Action: Main chat interface using `useChat` hook (v6 API)
  - Implementation:
    ```typescript
    'use client';
    import { useChat } from '@ai-sdk/react';
    import { DefaultChatTransport } from 'ai';
    import { useState } from 'react';

    export function ChatThread() {
      // v6: useChat no longer manages input state - you manage it yourself
      const [input, setInput] = useState('');

      const { messages, sendMessage, status, error } = useChat({
        transport: new DefaultChatTransport({
          api: '/api/chat',
        }),
      });

      const isLoading = status === 'streaming' || status === 'submitted';

      const handleSend = () => {
        if (!input.trim() || isLoading) return;
        sendMessage({ text: input });
        setInput('');
      };

      // Render messages with ChatBubble
      // Render ChatInput at bottom with input, setInput, handleSend, isLoading
    }
    ```
  - v6 API: `sendMessage({ text })` replaces `handleSubmit`, `status` replaces `isLoading`
  - `messages` structure uses `parts` array instead of `content` string
  - Auto-scroll to bottom on new messages
  - Show streaming text as it arrives
  - Handle empty state with welcoming first message from AI

- [x] **Task 15:** Export components from ai-coach index
  - File: `src/features/ai-coach/index.ts`
  - Action: Add component exports alongside existing exports
  - Export: `ChatThread`, `ChatBubble`, `ChatInput`

#### Phase 6: Page Integration

- [x] **Task 16:** Create dedicated chat page
  - File: `app/(protected)/chat/page.tsx`
  - Action: Create new page with ChatThread component
  - Layout: Full height chat interface
  - Import `ChatThread` from `@/src/features/ai-coach`
  - No header text needed - chat fills the space

- [x] **Task 17:** Update navigation menu
  - File: `components/menu-sheet.tsx`
  - Action: Add Chat link as first nav item
  - Add: `<Link href="/chat">` with chat/message icon (use `MessageCircle` from lucide-react)
  - Position: Above Goals link
  - Label: "Chat" or "Coach"

- [x] **Task 18:** Update default protected page
  - File: `lib/utils.ts`
  - Action: Change `DEFAULT_PROTECTED_PAGE_FALLBACK` from `/goals` to `/chat`
  - This makes the chat page the landing page for authenticated users

#### Phase 7: Environment & Verification

- [x] **Task 19:** Verify environment variables
  - File: `.env.local` (and `.env.example`)
  - Action: Ensure `ANTHROPIC_API_KEY` is set
  - Add to `.env.example` if not present: `ANTHROPIC_API_KEY=your_key_here`

- [x] **Task 20:** Manual integration test
  - Action: Test the full flow end-to-end
  - Steps:
    1. Login and verify redirect to `/chat`
    2. Send a message and verify streaming response
    3. Mention goal progress and verify check-in is created (check DB)
    4. Verify user summary updates after multiple check-ins
    5. Test navigation between `/chat` and `/goals` pages

### Acceptance Criteria

#### Core Chat Functionality

- [ ] **AC1:** Given an authenticated user, when they navigate to the app, then they are redirected to `/chat` and land on the chat interface

- [ ] **AC2:** Given a user on the chat page, when they type a message and press send, then the message appears immediately in the chat thread with user bubble styling

- [ ] **AC3:** Given a user sends a message, when the AI processes it, then the response streams in character-by-character with AI bubble styling

- [ ] **AC4:** Given a user mentions progress on a goal (e.g., "went to the gym today"), when the AI responds, then a check-in record is created in the database with the relevant goalId

- [ ] **AC5:** Given a user with existing check-in history, when they start a new chat session, then the AI references past context (patterns, previous check-ins) in its responses

#### Agent Tools

- [ ] **AC6:** Given the AI detects goal progress in user's message, when it calls `recordCheckIn` tool, then a new row is inserted in `check_ins` table with userId, goalId (if applicable), content, and aiResponse

- [ ] **AC7:** Given the AI identifies a new pattern or struggle, when it calls `updateUserSummary` tool, then the `user_summaries` table is updated with merged data

- [ ] **AC8:** Given a user explicitly indicates they completed a goal, when the AI calls `markGoalComplete` tool, then the goal's status changes to 'completed' in the database

#### UI/UX

- [ ] **AC9:** Given a mobile user, when they view the chat interface, then the input is anchored to the bottom within thumb reach and the keyboard doesn't obscure it

- [ ] **AC10:** Given the AI is generating a response, when streaming is in progress, then a loading indicator is shown and the send button is disabled

- [ ] **AC11:** Given a user returns after several days away, when they open the chat, then the AI greets them warmly without mentioning how long they've been gone

#### Error Handling

- [ ] **AC12:** Given the AI API fails, when the user sends a message, then an error message is shown and the user can retry

- [ ] **AC13:** Given an unauthenticated request to `/api/chat`, when the endpoint is called, then it returns 401 Unauthorized

## Additional Context

### Dependencies

**Already Installed:**
- `ai` v6.0.33 - Vercel AI SDK core
- `@ai-sdk/anthropic` v3.0.12 - Anthropic/Claude provider
- `@ai-sdk/react` - React hooks for AI SDK (included with `ai` package)
- shadcn/ui components: button, card, input, sheet

**Available (transitive dependency):**
- `zod` - Schema validation for tool definitions (installed via ai sdk)

### Vercel AI SDK v6 Migration Notes

**IMPORTANT:** This spec uses Vercel AI SDK v6 patterns. Key differences from older versions:

| Old Pattern (v3/v4) | New Pattern (v6) |
| ------------------- | ---------------- |
| `import { useChat } from 'ai/react'` | `import { useChat } from '@ai-sdk/react'` |
| `const { input, handleInputChange, handleSubmit, isLoading } = useChat()` | `const { sendMessage, status, messages } = useChat()` + manage input state yourself |
| `isLoading` boolean | `status: 'submitted' \| 'streaming' \| 'ready' \| 'error'` |
| `handleSubmit(e)` with form | `sendMessage({ text: input })` |
| `message.content` string | `message.parts` array (use `getTextFromParts(message.parts)` helper) |
| `result.toDataStreamResponse()` | `result.toUIMessageStreamResponse()` |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` |
| `parameters: z.object({...})` in tools | `inputSchema: z.object({...})` in tools |

**Message Parts Helper:**
```typescript
// Helper to extract text from v6 message parts
function getTextFromParts(parts: UIMessagePart[]): string {
  return parts
    .filter((part): part is TextPart => part.type === 'text')
    .map((part) => part.text)
    .join('');
}
```

**Environment Variables Needed:**
- `ANTHROPIC_API_KEY` - Claude API key (verify exists in .env.local)

**Feature Dependencies:**
- Goals feature must be implemented (it is)
- Database schema with `check_ins` and `user_summaries` tables (exists)
- Auth flow working (it is)

### Testing Strategy

**Unit Tests (Co-located):**
- `src/features/check-ins/repository.test.ts` - Test check-in CRUD operations with mock DB
- `src/features/ai-coach/context-builder.test.ts` - Test context building with mock data
- `src/features/ai-coach/tools.test.ts` - Test tool execute functions with mock repositories
- `src/features/ai-coach/summary-repository.test.ts` - Test summary upsert/merge logic

**Integration Tests:**
- Test `/api/chat` route with mock Anthropic responses
- Verify tool calls create/update correct database records

**Manual Testing:**
1. Fresh user flow: Sign up → Land on chat → Send first message → Verify response
2. Returning user flow: Login → Verify past context is referenced
3. Goal progress flow: Mention completing a goal → Verify check-in created → Verify goal status updated
4. Error handling: Disable API key → Send message → Verify error UI
5. Mobile testing: Test on iPhone SE viewport → Verify thumb-friendly input

### Notes

**UX Requirements (from ux-design-specification.md):**
- Chat is home screen - users land directly in conversation
- Bottom-anchored input (thumb-friendly)
- Streaming responses (character-by-character)
- User bubbles: amber (#E59500), right-aligned
- AI bubbles: warm gray (#FAF8F5), left-aligned with icon
- No guilt mechanics - no "you haven't checked in for X days"
- Warm re-entry when users return after absence

**AI Coach Persona:**
- Supportive friend, not robotic coach
- Remembers user's story (patterns, struggles, wins)
- Offers "better than nothing" micro-suggestions when user misses goals
- Never weaponizes memory for guilt
- Matches user's energy (short input → concise response)

**High-Risk Items:**
- System prompt quality is critical - may need iteration to get the right tone
- Tool invocation reliability - AI may not always call tools when expected
- Streaming UX - ensure no jank or layout shifts during streaming

**Future Considerations (Out of Scope):**
- Conversation persistence across sessions (currently ephemeral via useChat)
- Proactive check-in reminders
- Conversation history view/search
- Export conversation to Notion


## Review Notes

**Adversarial review completed: 2026-01-16**

- Total findings: 10
- Fixed: 7
- Noise/dismissed: 3 (F3 inputSchema correct, F8 negative margins intentional, F10 userId needed)
- Resolution approach: auto-fix

### Fixes Applied

| ID | Severity | Description | Resolution |
|----|----------|-------------|------------|
| F1 | Critical | sentiment field silently discarded | Removed from CreateCheckInInput (not in DB schema) |
| F2 | Critical | getCheckInById post-fetch ownership check | Changed to WHERE filter with and() |
| F4 | High | repository not exported from check-ins index | Added explicit exports |
| F5 | Medium | duplicate isValidUUID helper | Re-export from goals/types |
| F6 | Medium | dead code updateCheckInAiResponse | Removed |
| F7 | Medium | DefaultChatTransport recreated each render | Moved outside component |
| F9 | Low | hardcoded model identifier | Added ANTHROPIC_MODEL env var |

