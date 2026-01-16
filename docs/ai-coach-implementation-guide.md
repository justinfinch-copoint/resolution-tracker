# AI Coach Implementation Guide

This document explains how the AI Coach feature is implemented in the Resolution Tracker app. It's designed for developers new to building AI agents with the Vercel AI SDK.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [The Vercel AI SDK](#the-vercel-ai-sdk)
3. [Data Flow](#data-flow)
4. [Server-Side Implementation](#server-side-implementation)
5. [Client-Side Implementation](#client-side-implementation)
6. [Agent Tools (The "Agentic" Part)](#agent-tools-the-agentic-part)
7. [Key Files Reference](#key-files-reference)

---

## Architecture Overview

Our AI Coach is a **conversational agent** that can:
1. Chat with users about their goals
2. **Take actions** on behalf of users (record check-ins, update summaries, mark goals complete)
3. Maintain context about user history and patterns

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
├─────────────────────────────────────────────────────────────────┤
│  ChatThread Component                                           │
│  ├── useChat() hook ──────────────┐                             │
│  ├── ChatBubble (renders messages)│                             │
│  └── ChatInput (user types here)  │                             │
│                                   │                             │
│         sends messages via        │                             │
│         DefaultChatTransport      │                             │
└───────────────────────────────────┼─────────────────────────────┘
                                    │ HTTP POST (streaming)
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER (Next.js API Route)              │
├─────────────────────────────────────────────────────────────────┤
│  /api/chat/route.ts                                             │
│  1. Auth check (Supabase)                                       │
│  2. Convert UI messages → Model messages                        │
│  3. Build context (goals, check-ins, user summary)              │
│  4. Build system prompt (personality + context)                 │
│  5. Call streamText() with Claude + tools                       │
│  6. Return streaming response                                   │
└───────────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLAUDE (Anthropic API)                  │
├─────────────────────────────────────────────────────────────────┤
│  Receives:                                                      │
│  - System prompt (coach persona + user context)                 │
│  - Message history                                              │
│  - Tool definitions                                             │
│                                                                 │
│  Can respond with:                                              │
│  - Text messages                                                │
│  - Tool calls (recordCheckIn, updateUserSummary, etc.)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Vercel AI SDK

The Vercel AI SDK (v6) provides utilities to build AI-powered apps. Here are the key concepts we use:

### Core Concepts

| Concept | What It Does | Where We Use It |
|---------|--------------|-----------------|
| `streamText()` | Calls an LLM and streams the response | `app/api/chat/route.ts` |
| `useChat()` | React hook that manages chat state | `chat-thread.tsx` |
| `tool()` | Defines actions the AI can take | `tools.ts` |
| `UIMessage` | Message format for the frontend | Client components |
| `ModelMessage` | Message format for the LLM | Server API route |

### Why Streaming?

Instead of waiting for Claude to generate the entire response, we **stream** it token-by-token:
- User sees text appear as it's generated
- Feels more responsive and natural
- Better UX for longer responses

### Message Format Conversion

This is a common gotcha! The client and server use different message formats:

```typescript
// CLIENT (UIMessage) - has "parts" array for rich content
{
  id: "msg_123",
  role: "user",
  parts: [{ type: "text", text: "Hello!" }]
}

// SERVER (ModelMessage) - simpler format for the LLM
{
  role: "user",
  content: "Hello!"
}
```

We use `convertToModelMessages()` to bridge them:

```typescript
// In route.ts
import { convertToModelMessages } from 'ai';

const modelMessages = await convertToModelMessages(uiMessages);
```

---

## Data Flow

Here's what happens when a user sends a message:

### Step 1: User Types Message

```typescript
// chat-thread.tsx
const handleSend = () => {
  sendMessage({ text: trimmedInput });  // From useChat hook
  setInput('');
};
```

### Step 2: Message Sent to API

The `useChat` hook uses `DefaultChatTransport` to POST to `/api/chat`:

```typescript
const chatTransport = new DefaultChatTransport({
  api: '/api/chat',
});

const { messages, sendMessage, status } = useChat({
  transport: chatTransport,
});
```

### Step 3: Server Processes Request

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  // 1. Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Parse incoming messages
  const { messages } = await req.json();

  // 3. Convert to format Claude understands
  const modelMessages = await convertToModelMessages(messages);

  // 4. Build context about the user
  const context = await buildChatContext(user.id);

  // 5. Build system prompt with context
  const systemPrompt = buildSystemPrompt(context);

  // 6. Call Claude with streaming
  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages: modelMessages,
    tools,  // Agent tools!
  });

  // 7. Return streaming response
  return result.toUIMessageStreamResponse();
}
```

### Step 4: Claude Responds (Maybe With Tool Calls)

Claude can either:
- **Just respond** with text: "Great job on your run today!"
- **Call a tool** then respond: *calls recordCheckIn()* → "I've logged your check-in. Keep it up!"

### Step 5: Client Receives Streamed Response

The `useChat` hook automatically:
- Updates `messages` array as tokens arrive
- Sets `status` to `'streaming'` while in progress
- Handles tool call results transparently

---

## Server-Side Implementation

### The API Route (`app/api/chat/route.ts`)

This is the brain of our agent. Key parts:

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  // Auth check first - never skip this!
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse and convert messages
  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  // Build context and prompt
  const context = await buildChatContext(user.id);
  const systemPrompt = buildSystemPrompt(context);

  // Create tools bound to this user
  const tools = createCoachTools(user.id);

  // Call Claude
  const result = streamText({
    model: anthropic(ANTHROPIC_MODEL),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),  // Safety limit on tool loops
  });

  return result.toUIMessageStreamResponse();
}
```

### Building Context (`context-builder.ts`)

Before each message, we fetch fresh context about the user:

```typescript
export async function buildChatContext(userId: string): Promise<ChatContext> {
  // Fetch all data in parallel for performance
  const [recentCheckIns, goals, summaryData] = await Promise.all([
    getRecentUserCheckIns(userId, 15),  // Last 15 check-ins
    getUserGoals(userId),                // All user goals
    getUserSummaryData(userId),          // Patterns/wins/struggles
  ]);

  return {
    userId,
    goals: activeGoals,
    recentCheckIns,
    userSummary,
  };
}
```

### The System Prompt (`prompts.ts`)

This is where we define the AI's personality and inject user context:

```typescript
export function buildSystemPrompt(context: ChatContext): string {
  return `You are a warm, supportive AI coach helping someone
track their New Year's resolutions...

## Your Personality
- Warm and encouraging - Celebrate wins, big and small
- Non-judgmental - Life happens, no guilt trips
- Practical - Offer suggestions when they struggle

## User's Active Goals
${context.goals.map(g => `- "${g.title}" (ID: ${g.id})`).join('\n')}

## What You Know About This User
Patterns: ${context.userSummary?.patterns.join('; ')}
Past wins: ${context.userSummary?.wins.join('; ')}
Challenges: ${context.userSummary?.struggles.join('; ')}

## Your Tools
You have tools to take action:
1. recordCheckIn - Record progress updates
2. updateUserSummary - Remember patterns/wins/struggles
3. markGoalComplete - Mark goals as achieved
...`;
}
```

---

## Client-Side Implementation

### ChatThread Component (`chat-thread.tsx`)

The main chat interface:

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

// Create transport OUTSIDE component (important for performance)
const chatTransport = new DefaultChatTransport({
  api: '/api/chat',
});

export function ChatThread() {
  const [input, setInput] = useState('');

  // The magic hook that handles everything
  const { messages, sendMessage, status, error } = useChat({
    transport: chatTransport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput('');
  };

  return (
    <div>
      {/* Render messages */}
      {messages.map((message) => (
        <ChatBubble
          key={message.id}
          variant={message.role === 'user' ? 'user' : 'ai'}
          content={getTextFromParts(message.parts)}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && <span>Thinking...</span>}

      {/* Input */}
      <ChatInput value={input} onChange={setInput} onSend={handleSend} />
    </div>
  );
}
```

### Extracting Text from Messages

V6 messages use a `parts` array for rich content. We extract text like this:

```typescript
// types.ts
import { isTextUIPart } from 'ai';

export function getTextFromParts(parts: UIMessage['parts']): string {
  return parts
    .filter(isTextUIPart)    // Only text parts, not tool calls
    .map((part) => part.text)
    .join('');
}
```

---

## Agent Tools (The "Agentic" Part)

This is what makes our coach an **agent** rather than just a chatbot. Tools let the AI take actions!

### How Tools Work

1. We **define** tools with schemas (what inputs they accept)
2. We **tell Claude** about the tools in the prompt
3. Claude **decides** when to use them based on conversation
4. The SDK **executes** the tool and gives Claude the result
5. Claude **continues** the conversation with the result

### Our Tools (`tools.ts`)

```typescript
import { tool } from 'ai';
import { z } from 'zod';  // For schema validation

export function createCoachTools(userId: string) {
  return {
    // Tool 1: Record a check-in
    recordCheckIn: tool({
      description: 'Record a check-in when user reports progress',
      inputSchema: z.object({
        goalId: z.string().nullable(),
        content: z.string(),
      }),
      execute: async ({ goalId, content }) => {
        const checkIn = await createCheckIn(userId, { goalId, content });
        return { success: true, checkInId: checkIn.id };
      },
    }),

    // Tool 2: Update user summary (memory)
    updateUserSummary: tool({
      description: 'Update patterns, wins, or struggles observed',
      inputSchema: z.object({
        patterns: z.array(z.string()).optional(),
        wins: z.array(z.string()).optional(),
        struggles: z.array(z.string()).optional(),
      }),
      execute: async ({ patterns, wins, struggles }) => {
        await mergeUserSummary(userId, { patterns, wins, struggles });
        return { success: true };
      },
    }),

    // Tool 3: Mark goal complete
    markGoalComplete: tool({
      description: 'Mark a goal as completed',
      inputSchema: z.object({
        goalId: z.string(),
        celebrationNote: z.string().optional(),
      }),
      execute: async ({ goalId, celebrationNote }) => {
        await updateGoal(goalId, userId, { status: 'completed' });
        return { success: true, goalId };
      },
    }),
  };
}
```

### Tool Anatomy

Each tool has three parts:

```typescript
tool({
  // 1. DESCRIPTION - Tells Claude when to use this tool
  description: 'Record a check-in when user reports progress',

  // 2. INPUT SCHEMA - Validates inputs using Zod
  inputSchema: z.object({
    goalId: z.string().nullable(),
    content: z.string(),
  }),

  // 3. EXECUTE - The actual function that runs
  execute: async ({ goalId, content }) => {
    // Do the thing!
    return { success: true };
  },
})
```

### Why Factory Function?

Notice `createCoachTools(userId)` is a function, not an object. This is because:

```typescript
// We need to bind userId for security
const tools = createCoachTools(user.id);

// Now tools can only operate on THIS user's data
// The userId is "baked in" to each tool
```

### Tool Execution Flow

```
User: "I ran 5k today!"
          │
          ▼
┌─────────────────────────────────────┐
│ Claude thinks: "They're reporting   │
│ progress on exercise. I should      │
│ record this as a check-in."         │
└─────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ Claude calls: recordCheckIn({       │
│   goalId: "goal_abc123",            │
│   content: "Ran 5k today"           │
│ })                                  │
└─────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ SDK executes our function:          │
│ → Inserts row into check_ins table  │
│ → Returns { success: true }         │
└─────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ Claude receives result, continues:  │
│ "That's awesome! 5k is a solid      │
│ distance. How did it feel?"         │
└─────────────────────────────────────┘
```

### Safety: `stopWhen: stepCountIs(5)`

This prevents infinite tool loops:

```typescript
streamText({
  // ...
  stopWhen: stepCountIs(5),  // Max 5 tool call rounds
});
```

Without this, Claude could theoretically call tools forever!

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/api/chat/route.ts` | API endpoint - orchestrates everything |
| `src/features/ai-coach/tools.ts` | Defines agent tools |
| `src/features/ai-coach/prompts.ts` | System prompt builder |
| `src/features/ai-coach/context-builder.ts` | Fetches user context |
| `src/features/ai-coach/types.ts` | TypeScript types |
| `src/features/ai-coach/components/chat-thread.tsx` | Main chat UI |
| `src/features/ai-coach/components/chat-bubble.tsx` | Message bubbles |
| `src/features/ai-coach/components/chat-input.tsx` | Text input |
| `src/features/check-ins/repository.ts` | Database operations |

---

## Common Patterns & Tips

### 1. Always Authenticate First

```typescript
// ALWAYS do this before accessing user data
const { data: { user } } = await supabase.auth.getUser();
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
```

### 2. Bind User Context to Tools

```typescript
// DON'T pass userId as a tool parameter (users could fake it)
// DO bind it when creating tools
const tools = createCoachTools(user.id);
```

### 3. Keep System Prompts Focused

The system prompt should include:
- Personality/behavior instructions
- Relevant user context (not everything!)
- Tool usage guidelines
- What NOT to do

### 4. Handle Errors Gracefully

```typescript
execute: async ({ goalId }) => {
  try {
    await updateGoal(goalId, userId, { status: 'completed' });
    return { success: true };
  } catch (error) {
    console.error('Failed:', error);
    return { success: false, message: 'Failed to complete' };
  }
}
```

### 5. Message Format Conversion

Always convert messages on the server:

```typescript
// Client sends UIMessage[]
// Server needs ModelMessage[]
const modelMessages = await convertToModelMessages(uiMessages);
```

---

## Further Reading

- [Vercel AI SDK Docs](https://ai-sdk.dev)
- [AI SDK Tools Guide](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Anthropic API Docs](https://docs.anthropic.com)
