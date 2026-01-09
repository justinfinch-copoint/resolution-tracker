---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
date: 2026-01-08
author: Justin
---

# Product Brief: week1

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Initial Context

**Starting Idea:** Personal Resolution Tracker using AI

**Core Concept:**
A system that helps users set, monitor, and achieve their goals throughout the year using natural language processing to log updates and get intelligent feedback on progress.

**Initial Tips Captured:**
- Start with 3-5 specific, measurable resolutions
- Use AI to categorize and prioritize goals
- Set up automated check-in prompts
- Include sentiment analysis on progress updates

**Potential Tools/Integrations:**
- ChatGPT or Claude for natural language interaction
- Notion AI for structured tracking
- Zapier for automation workflows

## Executive Summary

Resolution Tracker is a personal goal management system powered by AI that acts as a conversational coach rather than a passive task list. It helps users set, monitor, and achieve their yearly goals by maintaining context about who they are, remembering their history, and engaging them in natural dialogue - solving the "February problem" where motivation fades and goals are forgotten.

---

## Core Vision

### Problem Statement

People set ambitious goals at the start of each year but abandon them within weeks. Traditional goal-tracking apps fail because they're passive task trackers that wait to be checked rather than actively engaging users.

### Problem Impact

Without meaningful accountability and engagement, the vast majority of resolutions fail. Users lose confidence in their ability to change, and the cycle repeats year after year. The gap isn't willpower - it's the lack of a system that *knows* them and keeps them connected to their goals.

### Why Existing Solutions Fall Short

Current tools treat goals like checkboxes. They don't remember context, notice patterns, or adapt their approach. They nag without nuance. They're task managers pretending to be coaches.

### Proposed Solution

An AI-powered conversational coach that:
- Accepts natural language updates ("went to the gym, felt great")
- Remembers your history, patterns, and context
- Provides intelligent, personalized feedback
- Engages proactively rather than waiting passively
- Adapts tone based on what you need (encouragement vs. accountability)

### Key Differentiators

- **Conversational-first**: Talk to it like a friend, not a form
- **Memory & context**: Actually knows your story, not just your tasks
- **Proactive engagement**: Reaches out, notices patterns, prevents drift
- **Sentiment-aware**: Understands how you're feeling, not just what you did

---

## Target Users

### Primary User: The Busy Builder

**Persona: Alex** - A software developer with ambitious personal goals outside of work

**Context:**
- Spends most mental energy on code, PRs, and meetings
- Has 2-4 side goals they genuinely care about (fitness, learning, side projects, habits)
- By end of day, willpower is depleted - traditional tracking feels like more work

**Pain Points:**
- Goals slip through the cracks when work gets intense
- Existing apps feel like chores, not support
- No one's keeping them accountable in a way that feels natural

**What Success Looks Like:**
- Actually sticking with resolutions past February
- Feeling like someone "has their back" on personal goals
- Low-friction check-ins that fit into a busy schedule

### User Journey

1. **Discovery**: Finds the app through dev communities or word of mouth
2. **Onboarding**: Sets 2-3 goals in plain language (~5 min)
3. **Daily Use**: Quick conversational check-ins when time allows
4. **Aha Moment**: AI notices a pattern and responds with real context
5. **Retention**: Becomes a trusted part of their personal growth routine

---

## Success Metrics

### User Success Metrics

| Metric | Target | What It Proves |
|--------|--------|----------------|
| Check-in frequency | 2+ per week | Users are engaged, not passive |
| 30-day retention | User still active | Beat the "February problem" |
| Goal completion rate | At least 1 goal achieved | Product delivers real outcomes |

### Product Success Metrics

- **Engagement**: Users interact conversationally, not just checking boxes
- **Retention**: Users stick around past the typical resolution drop-off point
- **Satisfaction**: Users would recommend it to a friend (qualitative)

### Learning Project Success

- Functional app with working AI integration
- Conversational interface that feels natural
- Something the developer would actually use themselves

---

## MVP Scope

### Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (passwordless magic links) |
| AI | Claude API |
| Hosting | Vercel |

### Core Features (v1)

| Feature | Description |
|---------|-------------|
| Goal Management | Create, edit, delete 2-5 resolutions in plain text |
| Conversational Check-ins | Natural language input for progress updates |
| AI Coach | Claude-powered responses with context and memory |
| User Dashboard | View goals, check-in history, and progress |
| Multi-user Auth | Passwordless via Supabase Auth (magic links) |

### Integrations (Learning Scope)

| Integration | MVP Feature | What You'll Learn |
|-------------|-------------|-------------------|
| Notion | "Export to Notion" - sync goals/progress to a Notion database | OAuth flow, third-party APIs, data formatting |
| Zapier | Outbound webhooks on key events (check-in logged, goal completed) | Event-driven architecture, webhooks |

### Out of Scope for MVP

- Push notifications / proactive reminders
- Native mobile apps (responsive web only)
- Bi-directional Notion sync (export only)
- Full Zapier app marketplace listing (webhooks only)
- Advanced analytics or charts
- Sentiment analysis visualization
- Social features / sharing

### Future Vision

- Proactive check-in reminders via email/SMS
- Full Zapier/Notion marketplace integrations
- Pattern detection and insights ("you always skip Tuesdays")
- Mobile app (React Native or PWA)
- Team/accountability partner features
- Bi-directional sync with external tools

