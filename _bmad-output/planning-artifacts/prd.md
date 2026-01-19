---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - product-brief-week1-2026-01-08.md
  - research/domain-goal-setting-effectiveness-research-2026-01-16.md
workflowType: 'prd'
lastStep: 4
documentCounts:
  briefs: 1
  research: 1
  projectDocs: 0
  projectContext: 0
---

# Product Requirements Document - Resolution Tracker

**Author:** Justin
**Date:** 2026-01-09

## Executive Summary

Resolution Tracker is an AI-powered goal achievement platform where a coordinated team of specialized AI agents helps users set, monitor, and achieve their yearly goals. Unlike traditional goal-tracking apps that act as passive checkbox lists, Resolution Tracker maintains context about who you are, remembers your history and patterns, and engages you in natural dialogue — solving the "February problem" where motivation fades and resolutions are forgotten.

The core insight is simple: people don't fail at goals because they lack willpower. They fail because their tools are passive task managers pretending to be coaches. Resolution Tracker flips this with a team of AI agents — a Coach who knows your story, a Goal Architect who structures your intentions, a Pattern Analyst who spots trends, a Motivator who celebrates wins, and an Accountability Partner who asks the hard questions — all working together in a single conversation.

### What Makes This Special

- **Agent team, not solo coach**: A coordinated team of specialized AI agents — Coach, Goal Architect, Pattern Analyst, Motivator, Accountability Partner — each excellent at their role, working together in one conversation
- **Conversational-first**: Users talk to it like a friend ("went to the gym, felt great") rather than filling out forms or checking boxes
- **Memory & context**: The team actually knows your story — your patterns, struggles, wins, and history — not just your task list
- **Proactive engagement**: Agents notice patterns and surface insights, preventing drift before goals slip away
- **Sentiment-aware**: Understands how you're feeling, with the right agent stepping in based on what you need (encouragement from Motivator vs. accountability from the Partner)

## Project Classification

**Technical Type:** web_app
**Domain:** general (productivity/personal development)
**Complexity:** Low
**Project Context:** Greenfield - new project

Built on Next.js with Supabase (Postgres + Auth) and Claude API for the conversational AI layer, deployed on Vercel. The MVP focuses on goal management, conversational check-ins, and an AI coach with memory — keeping scope tight while validating the core value proposition.

## Success Criteria

### User Success

| Metric | Target | What It Proves |
|--------|--------|----------------|
| Check-in frequency | 2+ per week | Users are engaged, not passive |
| 30-day retention | User still active after 30 days | Beat the "February problem" |
| Goal completion rate | At least 1 goal achieved per user | Product delivers real outcomes |

**The "Aha" Moment:** When an agent responds with real context — remembering a user's patterns, struggles, or history — and it feels like talking to a team that actually knows them. Or when the Coach seamlessly brings in the Goal Architect, and the user realizes they have a whole team working for them.

### Business Success

This is a **learning project** with potential to grow. Success means:

- **Primary:** A functional app with working AI integration that the developer actually uses
- **Secondary:** Demonstrated proficiency with Next.js, Supabase, Claude API, and third-party integrations (Notion, Zapier)
- **Tertiary:** A polished portfolio piece that showcases full-stack + AI capabilities

### Technical Success

- Conversational interface that feels natural, not robotic
- AI agent team with seamless handoffs and shared memory
- Agent responses that demonstrate context awareness and specialized expertise
- Reliable auth flow (passwordless magic links)
- Clean integration patterns for Notion export and Zapier webhooks

### Measurable Outcomes

| Timeframe | Outcome |
|-----------|---------|
| MVP Launch | Core goal tracking + conversational check-ins + AI agent team (Coach + Goal Architect minimum) + integrations working end-to-end |
| 30 days post-launch | Developer actively using it for personal goals |

## Product Scope

### MVP - Minimum Viable Product

| Feature | Description |
|---------|-------------|
| Goal Management | Create, edit, archive goals with structured data (title, type, success criteria, why it matters, implementation intention) extracted through conversation |
| Conversational Check-ins | Natural language input for progress updates |
| AI Agent Team | Coordinated team of specialized agents (Coach, Goal Architect, Pattern Analyst, Motivator, Accountability Partner) with shared memory |
| User Dashboard | View goals, check-in history, and progress |
| Multi-user Auth | Passwordless via Supabase Auth (magic links) |
| Notion Export | Sync goals and progress to a Notion database (OAuth flow) |
| Zapier Webhooks | Outbound webhooks on key events (check-in logged, goal completed) |

### Vision (Future)

- Proactive check-in reminders via email/SMS
- Pattern detection and insights ("you always skip Tuesdays")
- Mobile app (React Native or PWA)
- Team/accountability partner features
- Bi-directional Notion sync
- Full Zapier app marketplace listing

### Out of Scope for MVP

- Push notifications / proactive reminders
- Native mobile apps (responsive web only)
- Bi-directional Notion sync (export only for MVP)
- Full Zapier app marketplace listing (webhooks only)
- Advanced analytics or charts
- Sentiment analysis visualization
- Social features / sharing

## Goal System Design

> **Research Foundation:** This section is informed by domain research on goal-setting effectiveness, including Locke & Latham's goal-setting theory, implementation intentions (Gollwitzer), and competitive analysis of habit/goal tracking apps. Full research document: `_bmad-output/planning-artifacts/research/domain-goal-setting-effectiveness-research-2026-01-16.md`

### The Problem We're Solving

**92% of goals fail.** Research shows they fail not because people lack willpower, but because:

- Goals are vague ("get healthier") instead of specific
- Missing implementation plans (when/where/how to act)
- Disconnected from personal values (why it matters)
- Lacking feedback mechanisms
- Punitive when users slip (streaks that break destroy motivation)

Our conversational approach already addresses tone and guilt-free design. But we need **structured goal capture** to help users set goals that are actually achievable.

### Research-Backed Goal Attributes

Based on 40+ years of goal-setting research, effective goals need:

| Attribute | Why It Matters | How We Capture It |
|-----------|---------------|-------------------|
| **Specificity** | Vague goals fail; specific goals succeed 90% more often | AI extracts specific intent from conversation |
| **Measurability** | "How will you know you succeeded?" | Success criteria field |
| **Implementation Intention** | "If X, then Y" bridges the intention-behavior gap | AI prompts for when/where/how during setup |
| **Why It Matters** | Values-connected goals have higher completion | AI asks what's driving the goal |
| **Appropriate Challenge** | Too easy = boring; too hard = discouraging | AI helps calibrate based on current baseline |
| **Feedback Loop** | Progress visibility maintains motivation | Check-in history + progress indicators |
| **Recovery Plan** | Pre-planned responses to setbacks prevent "what-the-hell effect" | AI helps define fallback actions |

### Goal Data Model (MVP)

Goals in Resolution Tracker are **not just text** — they're structured data extracted through conversation:

#### Core Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | string | Clear, specific goal statement | "Go to the gym 3x per week" |
| `goal_type` | enum | Habit / Target / Project | "Habit" |
| `success_criteria` | string | How user knows they've achieved it | "Complete 12 gym sessions this month" |
| `target_date` | date | When goal should be achieved (optional for habits) | "2026-03-31" |
| `status` | enum | Active / Paused / Completed / Archived | "Active" |

#### Enhanced Fields (Differentiators)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `why_it_matters` | string | Personal motivation/values connection | "I want to have energy to play with my kids" |
| `implementation_intention` | string | If-then plan for when/where/how | "If it's 6:30am on Mon/Wed/Fri, then I put on gym clothes and go" |
| `current_baseline` | string | Where user is starting from | "Haven't been to gym in 3 months" |
| `recovery_plan` | string | What to do when setbacks happen | "If I miss a session, I'll do 20 pushups at home instead" |

#### Progress Fields

| Field | Type | Description |
|-------|------|-------------|
| `check_in_count` | int | Number of check-ins for this goal |
| `last_check_in` | timestamp | Most recent interaction |
| `progress_sentiment` | enum | Behind / On Track / Ahead (AI-assessed) |

### Goal Types

Different goals need different tracking approaches:

| Type | Use Case | Tracking Method | Example |
|------|----------|-----------------|---------|
| **Habit** | Regular recurring actions | Frequency / streak (non-punitive) | "Meditate daily" |
| **Target** | Reach specific value by date | Progress toward number | "Save $1000 by June" |
| **Project** | Multi-step achievement | Milestone completion | "Ship my side project" |

**Goal Architect Behavior:** During conversational goal setup, the Goal Architect identifies the appropriate goal type and prompts for relevant fields. Users don't see "goal types" — they just talk, and the Goal Architect structures it.

### Conversational Goal Setup Flow

Instead of forms, goals are created through dialogue with the Goal Architect:

**Step 1: What** — "What do you want to work on?"
- User describes goal in natural language
- Goal Architect extracts title, infers goal type

**Step 2: Why** — "What's driving this for you?"
- Goal Architect prompts for motivation
- Captures `why_it_matters`

**Step 3: How** — "When and where will you make this happen?"
- Goal Architect prompts for implementation intention
- "If [trigger], then I will [action]"

**Step 4: Measure** — "How will you know you're succeeding?"
- Goal Architect helps define success criteria
- Sets target date if applicable

**Step 5: Recovery** — "What's your plan B when life gets in the way?"
- Goal Architect helps define recovery plan
- Prevents the "what-the-hell effect"

> **Note:** This flow happens conversationally, not as a wizard. The Goal Architect weaves these questions naturally into dialogue, and users can skip or revisit any element. Coach hands off to Goal Architect when a new goal is being created, and Goal Architect returns to Coach when setup is complete.

### Non-Punitive Progress Design

Research shows that punitive mechanics (broken streaks, guilt notifications) cause abandonment spirals. Our design principles:

| Traditional Apps | Resolution Tracker |
|-----------------|-------------------|
| Streak breaks = failure | Skip days without penalty |
| "You missed 5 days!" | "Good to see you. How are you doing?" |
| Binary success/failure | Partial credit counts |
| Rigid schedules | Flexible check-ins |
| Guilt-driven re-engagement | Warm, curious return |

### Key Differentiators from Competitors

Based on competitive analysis (Habitica, Strides, Streaks, Finch, etc.):

| Gap in Market | Our Approach |
|--------------|--------------|
| No app captures implementation intentions | AI prompts "If X, then Y" during setup |
| No app captures "why it matters" | AI asks what's driving the goal |
| Most apps punish failure | Non-punitive design throughout |
| Goal setup is forms, not conversation | Natural dialogue extracts structured data |
| Progress is binary (done/not done) | Sentiment-aware progress assessment |

### MVP Implementation Notes

For MVP, the conversational goal setup should:

1. **Extract structured data** from natural language (title, type, success criteria)
2. **Prompt for key fields** (why it matters, implementation intention) without feeling like a form
3. **Store enhanced goal model** in database (not just plain text)
4. **Display progress context** in dashboard (last check-in, progress sentiment)
5. **Support goal modification** (pause, reduce scope, archive) without judgment

The AI agent team already has context about goals — this enhancement ensures that context is **structured and actionable**, not just conversational history. The Goal Architect specializes in this structured extraction, while all agents benefit from the resulting goal data.

## AI Agent Team Architecture

> **Research Foundation:** This architecture is informed by industry best practices on multi-agent AI systems, including Google's ADK context engineering principles, memory engineering patterns from MongoDB's research, and Microsoft's multi-agent intelligence design guidance. Key sources: [Google Developers Blog](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/), [MongoDB Memory Engineering](https://www.mongodb.com/company/blog/technical/why-multi-agent-systems-need-memory-engineering), [Microsoft Multi-Agent Design](https://developer.microsoft.com/blog/designing-multi-agent-intelligence).

### The Problem with a Single AI Coach

A single AI agent trying to handle everything — goal setup, daily check-ins, pattern analysis, motivation, accountability — faces fundamental limitations:

- **Context overload**: One agent can't hold deep expertise in goal science AND motivational psychology AND behavioral pattern analysis while also maintaining conversational warmth
- **Jack of all trades**: The agent becomes mediocre at everything instead of excellent at anything
- **Muddled personality**: Switching between cheerleader, analyst, and accountability partner in the same breath feels inconsistent

### The Solution: A Coordinated Agent Team

Resolution Tracker uses a **round table model** — a team of specialized AI agents working together in a single conversation, with the Coach as facilitator and home base. Users talk to one interface, but specialized agents step in when their expertise is needed.

**This is differentiated.** No goal app does this. Habitica has gamification, Finch has a pet, but nobody has a *team* working for you.

### The Team

| Agent | Role | Personality | When They Step In |
|-------|------|-------------|-------------------|
| **Coach** | Primary interface, daily check-ins, warm presence, orchestrates handoffs | Supportive friend who remembers everything | Default — always "home base" |
| **Goal Architect** | Structured goal setup, implementation intentions, goal refinement | Thoughtful strategist, asks clarifying questions | New goals, goal restructuring, when goals feel vague |
| **Pattern Analyst** | Spots trends, weekly/monthly insights, data-driven observations | Curious observer, presents insights without judgment | Periodic insights, when user asks "how am I doing overall?" |
| **Motivator** | Celebrates wins, picks user up when down, energy and encouragement | Enthusiastic cheerleader, genuine not performative | Achievements, low moments, milestones |
| **Accountability Partner** | Follows up on commitments, gentle pressure, asks the hard questions | Direct but caring, doesn't let things slide | Missed check-ins, commitment follow-through |

### User Experience Principles

**Single chat thread** — All agents appear in the same conversation. No context switching, no separate chat windows. The user talks to Resolution Tracker; agents are the personalities behind it.

**Coach is home base** — Every conversation starts with Coach. User can always say "back to Coach" or similar to return. Coach is the "primary care physician" who coordinates the team.

**Seamless handoffs** — Coach introduces specialists naturally:
- *"Let me bring in the Goal Architect to help structure this..."*
- *"The Pattern Analyst noticed something interesting about your check-ins..."*
- *"I think the Motivator wants to say something about what you just accomplished..."*

**Agent identity** — Each agent has a distinct voice and personality, but all share knowledge of the user. Alex shouldn't have to re-explain his situation to each agent.

**User control** — Users can request specific agents ("can I talk to the Accountability Partner?") or return to Coach anytime. They cannot "fire" agents, but they can express preferences that Coach will remember.

### Memory Architecture

The team shares a common understanding of the user while maintaining specialized expertise:

| Memory Layer | What It Contains | Who Accesses |
|--------------|------------------|--------------|
| **User Profile** | Name, preferences, communication style, key life context | All agents |
| **Goal State** | Current goals, status, implementation intentions, why it matters, recovery plans | All agents |
| **Check-in History** | Past conversations, progress notes, sentiment trends | All agents (retrieved on-demand via RAG, not all in context) |
| **Agent Expertise** | Domain knowledge — goal science, psychology, motivation patterns, behavioral analysis | Specific to each agent |

**Design Principles (from research):**

- **Avoid context dumping** — Don't give every agent everything. Each agent pulls only what's needed for the current turn.
- **Two-tier memory** — Shared memory (user profile, goals) + private memory (agent-specific expertise and working context)
- **Memory consolidation** — When new information arrives, intelligently merge with existing context rather than just appending
- **Structured handoffs** — Agents communicate via structured data, not free-form text, to prevent context pollution

### Example Interaction Flow

```
User: "I want to start meditating but I don't know where to begin"

Coach: "That's a great intention. Let me bring in the Goal Architect —
they're really good at helping turn 'I want to' into 'here's exactly how.'"

Goal Architect: "Hey! Meditation is one of those goals that sounds simple
but trips people up because it's vague. Let's make it concrete.
When you picture yourself meditating successfully, what does that look like?
5 minutes in the morning? 20 minutes before bed? Guided or silent?"

User: "Maybe 10 minutes in the morning? I've tried apps before but never stuck with it"

Goal Architect: "10 minutes, morning. Good. Now the key question: what's your
trigger going to be? The most successful meditators attach it to something
they already do. What's your morning routine look like?"

[...conversation continues, goal gets structured...]

Goal Architect: "Alright, you're set up. I'm handing you back to Coach —
they'll check in with you tomorrow to see how the first session went."

Coach: "Thanks, Goal Architect. Okay Alex, you've got a plan: 10 minutes
right after your coffee, using Headspace. I'll ask you about it tomorrow.
Anything else on your mind?"
```

### MVP Implementation Notes

For MVP, the agent team should:

1. **Implement Coach + Goal Architect first** — These cover the critical paths (check-ins and goal setup)
2. **Add Pattern Analyst and Motivator in iteration** — Once check-in data exists
3. **Accountability Partner last** — Requires enough history to follow up on
4. **Build shared memory layer** — User profile and goal state accessible to all agents
5. **Design handoff protocol** — How Coach introduces agents, how agents return to Coach
6. **Maintain single conversation thread** — All agents write to the same chat history

### Future Enhancements

- **Agent preferences** — User can indicate which agents they connect with most
- **Proactive agent suggestions** — Agents can request to step in ("Pattern Analyst has an insight...")
- **Custom agent personalities** — User can adjust tone (more direct, more gentle, etc.)
- **Agent memory of past interactions** — "Last time we worked on a goal together, you mentioned..."

## User Journeys

### Journey 1: Alex Chen - Fresh Start, Real This Time

Alex is a senior developer at a fintech startup. It's January 3rd, 11pm. He just saw a tweet about an AI goal tracker and clicked through, still riding the New Year momentum but carrying a familiar knot of guilt — he's been meaning to get back to the gym since October, and his Spanish learning app has sent 47 unopened reminder notifications.

He signs up with a magic link (no password to forget), and the Coach greets him: *"Hey Alex. I'm your Coach — I'll be your main point of contact here. What do you want to work on this year?"*

Alex types: "Get back to the gym 3x a week. Actually stick with it this time."

The Coach responds warmly: *"Getting back to something you care about. Let me bring in the Goal Architect — they're great at turning good intentions into plans that actually stick."*

The Goal Architect steps in: *"Hey Alex. 'Get back to the gym' — I hear that a lot. What's been getting in the way?"*

He pauses. Types: "Work gets crazy. By evening I'm too drained to go."

*"Morning workouts? Or is that asking too much of pre-coffee Alex?"*

He laughs. The Goal Architect walks him through implementation intentions for the gym goal, then does the same for learning Spanish and shipping his side project. Five minutes in, he has three structured goals, and the team already feels like they *get* him.

The Goal Architect wraps up: *"Alright, you're set. I'm handing you back to Coach."*

The Coach returns: *"Three goals, no pressure to be perfect. Check in whenever — I'll be here. The whole team will be. What matters is we keep talking."*

No streak counters. No guilt mechanics. Just... a team waiting to help.

---

### Journey 2: Alex Chen - The Mixed Day

It's Tuesday, 9:47pm. Alex is on the couch, laptop closed, doom-scrolling. The gym didn't happen — a P0 bug took his entire morning and by the time he looked up it was 2pm and he was three coffees deep. The familiar guilt creeps in.

He opens Resolution Tracker and types: "skipped gym. production fire. feel like crap about it."

The Coach doesn't flinch: *"Production fires happen. You didn't skip because you didn't care — you skipped because work needed you. That's not failure, that's life."*

Then the nudge: *"You're not getting to the gym tonight. But what about 3 sets of 10 pushups before bed? Not the goal. Not perfection. Just... better than nothing."*

Alex almost rolls his eyes — but then actually does the pushups. Thirty reps. Takes two minutes.

He checks back in: "did the pushups. felt dumb but also kind of good?"

The Motivator jumps in: *"30 more pushups than yesterday! That's not dumb — that's momentum. You showed up when it would've been easier not to. That counts."*

The Coach adds: *"See you tomorrow, Alex."*

The next morning, he makes it to the gym.

---

### Journey 3: Alex Chen - The Sunday Tinkering Session

It's Sunday afternoon. Alex has his coffee, lo-fi beats playing, and that familiar itch to optimize his setup. His Notion workspace is his command center — work projects, reading list, habit tracking. Resolution Tracker has been great, but the data living in a separate app bothers him.

He spots "Connect Notion" in settings and clicks.

OAuth flow pops up — he authorizes in two clicks. Resolution Tracker asks: *"Which database should I sync your goals to?"* It shows his existing Notion databases. He picks "Life Dashboard" — his personal tracking hub.

Fifteen seconds later: *"Done. Your 3 goals are now in Notion. I'll update progress after each check-in."*

He flips to Notion. There they are — his goals with progress notes, formatted cleanly, fitting right into his existing system. The tinkerer's dopamine hits.

Now Zapier. He wants a celebration ping in his private Slack channel when he completes a goal. He clicks "Webhooks" in settings, copies the webhook URL, and wires it up in Zapier in under a minute.

He marks his Spanish goal as "complete" just to test it. His phone buzzes — Slack notification: "🎉 Goal completed: Learn Spanish basics."

Alex grins. Everything in one place. Exactly how he likes it.

---

### Journey 4: Alex Chen - The Quiet Return

It's February 23rd. Alex hasn't opened Resolution Tracker in 17 days. First it was a work crunch, then a cold that knocked him out, then... he just stopped. The gym streak broke. The Spanish practice died. The familiar shame spiral started: *"I already failed, what's the point?"*

The app hasn't sent a single notification. No passive-aggressive "We miss you!" emails. No streak-lost guilt bombs. Just silence.

One night, Alex is cleaning up his phone's home screen. He sees the Resolution Tracker icon and almost moves it to the junk folder. But something makes him tap it instead.

The Coach doesn't guilt him. Doesn't mention the 17 days. Just:

*"Hey Alex. Good to see you. How are you doing?"*

He types: "fell off. completely. feel like I wasted January."

*"January wasn't wasted. You set intentions. You showed up for a while. Life got in the way — that's not failure, that's being human."*

Then: *"You're here now. That's what matters. Want to pick up where you left off, or start fresh with something smaller?"*

Alex thinks. Types: "smaller. just the gym. forget the rest for now."

*"Done. One goal: gym. I'll pause the others — they'll be here if you want them back. What's one small thing you could do this week?"*

He commits to two gym sessions. Not three. Two.

The Motivator chimes in gently: *"Two sessions is a win. You're back. That's what matters."*

A week later, he's checked in four times. The momentum is back — on his terms.

---

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| Fresh Start (Onboarding) | Magic link auth, Coach greeting, Goal Architect handoff, conversational goal setup, agent personality/tone, no-guilt framing |
| Mixed Day (Check-ins) | Natural language input, Coach context-aware responses, "better than nothing" micro-suggestions, Motivator celebration, memory of goals |
| Sunday Tinkering (Integrations) | Notion OAuth flow, database picker, auto-sync on check-in, Zapier webhook URL, event triggers |
| Quiet Return (Re-engagement) | Coach warm re-entry without guilt, goal modification (reduce/pause), Motivator gentle encouragement, respect for user autonomy |

### Core Product Philosophy (from Journeys)

- **User is the driver** — The agent team is a supportive crew, always available, never nagging
- **No guilt mechanics** — no streaks, no "you missed X days", no passive-aggressive notifications
- **Better than nothing** — small actions beat zero actions; progress over perfection
- **Accountability through encouragement** — self-driven accountability, not surveillance
- **Right agent, right moment** — Coach for daily presence, Goal Architect for structure, Motivator for wins, Accountability Partner for follow-through
