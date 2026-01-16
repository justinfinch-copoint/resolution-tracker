---
title: 'AI Coach Probing Questions Enhancement'
slug: 'ai-coach-probing-questions'
created: '2026-01-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Next.js 16 (App Router)
  - TypeScript 5.x (strict mode)
  - Vercel AI SDK v6 (ai, @ai-sdk/anthropic, @ai-sdk/react)
  - Drizzle ORM
  - Supabase (Postgres + Auth)
files_to_modify:
  - src/features/ai-coach/prompts.ts (modify - add greeting + probing instructions)
  - src/features/ai-coach/components/chat-thread.tsx (modify - fetch dynamic greeting)
  - src/features/ai-coach/index.ts (modify - export new function)
  - app/api/chat/greeting/route.ts (create - new endpoint)
code_patterns:
  - DDD + Vertical Slice architecture
  - Business logic in features/, thin API routes
  - Context built via buildChatContext(userId)
  - System prompt generated via buildSystemPrompt(context)
  - Chat uses useChat hook with DefaultChatTransport
test_patterns:
  - Co-located tests (*.test.ts next to source)
  - No existing tests in ai-coach feature
---

# Tech-Spec: AI Coach Probing Questions Enhancement

**Created:** 2026-01-16

## Overview

### Problem Statement

The AI Coach currently opens with a generic "What's on your mind?" and waits passively for users to share. It has rich context (goals, check-in history, patterns, wins, struggles) but doesn't use it to ask specific, goal-relevant questions that help extract progress information.

### Solution

Enhance the AI Coach to proactively probe for goal progress through:
1. **Smart initial greetings** that reference specific goals and past context
2. **Conversational follow-up questions** that dig deeper when users give vague responses
3. **Adaptive questioning style** that adjusts based on check-in recency and past sentiment (direct for engaged users, softer for those who've been away or struggling)

### Scope

**In Scope:**
- Update system prompt with probing question instructions
- Add dynamic welcome message generation based on user context
- Add questioning strategy guidance (when to probe, when to back off)
- Adapt tone based on user's recent engagement and sentiment history

**Out of Scope:**
- Quantitative/metric-based questions (keeping it qualitative)
- Scheduled reminders or notifications
- New tools or database changes
- UI component changes (beyond dynamic welcome message)

## Context for Development

### Codebase Patterns

**Architecture:** DDD + Vertical Slice
- Business logic in `src/features/ai-coach/`
- API routes are thin wrappers in `app/api/`
- Context building separated from prompt generation

**Context Flow:**
```
buildChatContext(userId) → ChatContext
    ↓
buildSystemPrompt(context) → system prompt string
    ↓
streamText({ system, messages, tools }) → streaming response
```

**ChatContext Structure (from types.ts):**
```typescript
type ChatContext = {
  userId: string;
  goals: Array<{ id: string; title: string; status: string }>;
  recentCheckIns: Array<{
    id: string;
    goalId: string | null;
    content: string;
    aiResponse: string | null;
    createdAt: string;
  }>;
  userSummary: {
    patterns: string[];
    wins: string[];
    struggles: string[];
    lastUpdated: string | null;
  } | null;
};
```

**Welcome Message Challenge:**
- Currently static in `chat-thread.tsx:11`: `"Hey! I'm your resolution coach. What's on your mind today?"`
- Client-side only, no access to user context
- Solution: New API endpoint to generate context-aware greeting

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/ai-coach/prompts.ts` | System prompt generation - PRIMARY modification target |
| `src/features/ai-coach/context-builder.ts` | Builds ChatContext with goals, check-ins, summary |
| `src/features/ai-coach/components/chat-thread.tsx` | Chat UI with static welcome message |
| `src/features/ai-coach/types.ts` | ChatContext type definition |
| `src/features/ai-coach/index.ts` | Barrel exports for feature |
| `app/api/chat/route.ts` | Chat API endpoint pattern to follow |

### Technical Decisions

**1. Dynamic Greeting Approach:**
- Create new function `buildInitialGreeting(context: ChatContext): string` in prompts.ts
- Create new endpoint `GET /api/chat/greeting` that returns `{ greeting: string }`
- `chat-thread.tsx` fetches greeting on mount with loading state
- Fallback to generic message if fetch fails

**2. System Prompt Enhancement Strategy:**
- Add new sections to `buildSystemPrompt()`:
  - "Probing Questions Strategy" - how to ask about specific goals
  - "Adaptive Tone" - adjust based on engagement patterns
  - "Follow-up Techniques" - dig deeper on vague responses
- Keep existing persona and philosophy sections intact

**3. Engagement Detection Logic:**
- Calculate `daysSinceLastCheckIn` from `recentCheckIns[0].createdAt`
- Recent (≤3 days): More direct, goal-specific questions
- Away (>3 days): Softer, curious approach without guilt
- Use `userSummary.struggles` to be gentler on known pain points

## Implementation Plan

### Tasks

#### Phase 1: Greeting Generation

- [x] **Task 1:** Create `buildInitialGreeting` function
  - File: `src/features/ai-coach/prompts.ts`
  - Action: Add new exported function that generates context-aware greeting
  - Logic:
    - New user (no check-ins, no goals): Warm welcome, ask about their goals
    - New user with goals: Reference their goals, ask how things are going
    - Returning user (recent): Direct question about specific goal
    - Returning user (away): Warm re-entry, curious about what's been happening
  - Example outputs:
    - "Hey! How's the gym routine going? Last time we talked, you mentioned finding mornings tough."
    - "Welcome back! What's been on your mind lately?"
    - "Hey! I see you're working on 'Read more books' - how's that going?"

- [x] **Task 2:** Export `buildInitialGreeting` from index
  - File: `src/features/ai-coach/index.ts`
  - Action: Add export for `buildInitialGreeting`

- [x] **Task 3:** Create greeting API endpoint
  - File: `app/api/chat/greeting/route.ts` (create)
  - Action: Implement GET endpoint following existing route.ts pattern
  - Pattern:
    ```typescript
    export async function GET() {
      // 1. Auth check (same as chat route)
      // 2. Build context: await buildChatContext(user.id)
      // 3. Generate greeting: buildInitialGreeting(context)
      // 4. Return: Response.json({ greeting })
    }
    ```
  - Handle auth errors with 401

- [x] **Task 4:** Update ChatThread to fetch dynamic greeting
  - File: `src/features/ai-coach/components/chat-thread.tsx`
  - Action: Replace static `WELCOME_MESSAGE` with fetched greeting
  - Changes:
    - Add `useState` for greeting and loading state
    - Add `useEffect` to fetch `/api/chat/greeting` on mount
    - Show subtle loading state (use existing message or skeleton)
    - Fallback to generic message on error
  - Keep UX smooth - don't block chat interaction while loading

#### Phase 2: System Prompt Enhancement

- [x] **Task 5:** Add probing questions section to system prompt
  - File: `src/features/ai-coach/prompts.ts`
  - Action: Add new section to `buildSystemPrompt()` after "Your Tools"
  - Content:
    ```
    ## Probing for Progress

    Your primary job is to help users reflect on their goals. Don't wait for them to volunteer information - ask directly but warmly.

    **Goal-Specific Questions:**
    - Reference their actual goals by name: "How's [goal title] going?"
    - Connect to past context: "Last time you mentioned [pattern/struggle] - any updates?"
    - Ask about specific aspects: "What's one thing you did toward [goal] this week?"

    **When Users Give Vague Responses:**
    If they say things like "fine", "okay", "not much", dig deeper:
    - "Tell me more - what does 'okay' look like for [goal]?"
    - "What's been the biggest challenge lately?"
    - "Any small wins, even tiny ones?"

    **One Goal Per Exchange:**
    Focus on one goal at a time. Don't overwhelm with questions about everything.
    ```

- [x] **Task 6:** Add adaptive tone section to system prompt
  - File: `src/features/ai-coach/prompts.ts`
  - Action: Add section that instructs AI to adapt based on engagement
  - Content:
    ```
    ## Adaptive Tone

    Adjust your approach based on the user's engagement pattern:

    **Engaged Users (checked in recently):**
    - Be direct: "How did [specific goal] go this week?"
    - Reference recent conversations naturally
    - Celebrate momentum

    **Returning After Absence:**
    - Be warm and curious, NOT guilt-inducing
    - DON'T say: "It's been a while!" or "Where have you been?"
    - DO say: "Good to see you! What's been on your mind?"
    - Let them set the pace

    **Users with Known Struggles:**
    When their summary shows struggles with a goal:
    - Approach gently: "How are you feeling about [goal]?"
    - Acknowledge difficulty: "I know [goal] has been tough..."
    - Offer micro-steps: "What's the smallest thing you could do?"
    ```

- [x] **Task 7:** Add engagement context to prompt generation
  - File: `src/features/ai-coach/prompts.ts`
  - Action: Calculate and include engagement status in the prompt
  - Add helper function:
    ```typescript
    function getEngagementStatus(context: ChatContext): 'new' | 'engaged' | 'returning' {
      if (context.recentCheckIns.length === 0) return 'new';
      const lastCheckIn = new Date(context.recentCheckIns[0].createdAt);
      const daysSince = (Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 3 ? 'engaged' : 'returning';
    }
    ```
  - Include in prompt: "User engagement status: {status}"

### Acceptance Criteria

#### Dynamic Greeting

- [x] **AC1:** Given a new user with no check-ins or goals, when they open the chat, then they see a warm welcome that gently asks about their goals

- [x] **AC2:** Given a user with goals but no recent check-ins, when they open the chat, then the greeting references one of their specific goals by name

- [x] **AC3:** Given a user who checked in within the last 3 days, when they open the chat, then the greeting asks directly about a specific goal with context from their last conversation

- [x] **AC4:** Given a user returning after more than 3 days, when they open the chat, then the greeting is warm and curious without mentioning how long they've been away

- [x] **AC5:** Given the greeting API fails, when the user opens the chat, then a generic fallback greeting is shown and chat functionality still works

#### Probing Questions

- [x] **AC6:** Given a user responds with "things are okay", when the AI responds, then it asks a follow-up question probing for specifics about a goal

- [x] **AC7:** Given a user has multiple active goals, when the AI asks about progress, then it focuses on one goal at a time rather than asking about all goals at once

- [x] **AC8:** Given a user has a known struggle in their summary, when the AI asks about that goal, then it uses gentler language and acknowledges the difficulty

#### Adaptive Tone

- [x] **AC9:** Given a recently engaged user (≤3 days), when the AI initiates conversation, then it uses direct goal-specific questions

- [x] **AC10:** Given a returning user (>3 days), when the AI initiates conversation, then it uses softer, curious language without guilt mechanics

## Additional Context

### Dependencies

**Already Available:**
- `buildChatContext(userId)` - returns ChatContext with all needed data
- Supabase auth pattern from existing routes
- Goals, check-ins, and user summary data

**No New Dependencies Required**

### Testing Strategy

**Manual Testing:**
1. New user flow: Create account → Open chat → Verify personalized greeting
2. Returning user flow: Don't use app for 4+ days → Open chat → Verify warm re-entry
3. Engaged user flow: Check in → Return same day → Verify direct greeting
4. Vague response flow: Say "things are okay" → Verify follow-up probing question
5. Error handling: Block `/api/chat/greeting` → Verify fallback message

**Unit Tests (Optional Enhancement):**
- `prompts.test.ts`: Test `buildInitialGreeting` with various context scenarios
- `prompts.test.ts`: Test `getEngagementStatus` helper function

### Notes

**User Preferences:**
- Both proactive opening AND conversational probing
- Adaptive question style based on recency/sentiment
- Qualitative questions only (no metrics for now)
- Maintain "no guilt mechanics" philosophy

**High-Risk Items:**
- Prompt quality is subjective - may need iteration based on actual AI responses
- Engagement threshold (3 days) is arbitrary - may need tuning
- Greeting fetch adds latency to initial load - keep fallback snappy

**Future Considerations (Out of Scope):**
- Goal-specific probing templates (different questions for fitness vs reading goals)
- Sentiment-aware probing (detect frustration and adjust)
- Time-of-day aware greetings

---

## Review Notes

**Adversarial review completed: 2026-01-16**

| ID | Severity | Validity | Description | Resolution |
|----|----------|----------|-------------|------------|
| F1 | Critical | Real | Missing AbortController in greeting fetch useEffect - memory leak risk | Fixed |
| F2 | High | Noise | No unit tests for buildInitialGreeting - tech-spec marked tests as optional | Skipped |
| F3 | Medium | Real | Race condition between greeting fetch and user interaction | Fixed |
| F4 | Medium | Noise | No rate limiting on greeting endpoint - infrastructure concern | Skipped |
| F5 | Low | Real | Missing cache headers on greeting response | Fixed |
| F6 | Low | Noise | lastCheckIn variable allocation - negligible performance impact | Skipped |
| F7 | Low | Real | Inconsistent error handling - silent catch block | Fixed |
| F8 | Medium | Noise | XSS concern - React auto-escapes strings in JSX | Skipped |
| F9 | Low | Real | Magic number "3 days" should be named constant | Fixed |
| F10 | Low | Noise | Engagement status consistency - both use same context object | Skipped |
| F11 | Low | Noise | Method validation - Next.js handles automatically | Skipped |
| F12 | Low | Undecided | Loading shows '...' instead of skeleton - UX preference | Skipped |
| F13 | Low | Undecided | EngagementStatus type not exported - internal detail | Skipped |

**Summary:** 13 findings total, 5 fixed, 8 skipped
**Resolution approach:** Auto-fix real findings
