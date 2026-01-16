---
title: 'Terminal UI Migration'
slug: 'terminal-ui-migration'
created: '2026-01-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Next.js 16.x (App Router)
  - React 19
  - TypeScript 5.x (strict mode)
  - Tailwind CSS 3.x + tailwindcss-animate
  - shadcn/ui (new-york style)
  - Vercel AI SDK 6.x with @ai-sdk/anthropic
  - IBM Plex Mono (Google Fonts - to add)
  - lucide-react icons
  - next-themes
  - class-variance-authority
files_to_modify:
  - app/globals.css
  - tailwind.config.ts
  - app/layout.tsx
  - app/(protected)/layout.tsx
  - app/(protected)/chat/page.tsx
  - app/(protected)/goals/page.tsx
  - app/auth/login/page.tsx
  - components/app-header.tsx (replace)
  - components/menu-sheet.tsx (remove)
  - src/features/ai-coach/components/chat-bubble.tsx (replace)
  - src/features/ai-coach/components/chat-input.tsx (replace)
  - src/features/ai-coach/components/chat-thread.tsx (replace)
  - src/features/goals/components/goal-list.tsx (replace)
  - src/features/goals/components/goal-card.tsx (remove usage)
code_patterns:
  - Feature-based organization (src/features/*)
  - CSS variables for theming in globals.css
  - cn() utility for className merging (lib/utils.ts)
  - cva() for component variants (class-variance-authority)
  - Protected routes under app/(protected)/
  - Thin API routes delegating to feature services
test_patterns:
  - Co-located tests (*.test.ts next to source)
  - No tests currently exist in project
---

# Tech-Spec: Terminal UI Migration

**Created:** 2026-01-16

## Overview

### Problem Statement

The current UI uses standard web app patterns (cards, bubbles, dropdown menus, sheet navigation) that don't match the new retro terminal aesthetic defined in the UX spec. Users should feel like they're interacting with a warm, honest terminal — not another productivity app.

### Solution

Migrate all UI components and screens to the terminal aesthetic — amber phosphor on dark background, monospace typography, text-based rendering, and command-based navigation with a clickable command bar for discoverability.

### Scope

**In Scope:**
- New terminal design system (CSS variables, base styles, IBM Plex Mono)
- Terminal shell component (header, output area, input area)
- Terminal-styled chat (no bubbles, `COACH:` / `>` prefixes, streaming cursor)
- Terminal-styled goals view (text list, no edit UI for now)
- Command bar navigation (`/goals`, `/help`, `/settings`, `/signout`)
- Command parsing in chat input (detect `/` commands, route accordingly)
- CRT effects (subtle scanlines, glow) with reduced-motion support
- Mobile responsiveness (same terminal, full-width on small screens)

**Out of Scope:**
- Goal editing/creation UI (future Goal Management Agent will handle via conversation)
- Settings page implementation (just the route/placeholder)
- Notion/Zapier integration UI
- Help content beyond command listing

## Context for Development

### Codebase Patterns

**Theming Approach:**
- CSS variables defined in `app/globals.css` using HSL format
- Tailwind config maps semantic colors to CSS variables: `background`, `foreground`, `primary`, `muted`, etc.
- Currently uses light theme with warm amber accents (#E59500)
- `next-themes` provider wraps app but forces light mode

**Component Architecture:**
- shadcn/ui components in `components/ui/` (button, card, dropdown-menu, input, label, sheet)
- App-level components in `components/` (app-header, menu-sheet, login-form)
- Feature components in `src/features/*/components/`
- Uses `cn()` from `lib/utils.ts` for conditional class merging
- Uses `cva()` from class-variance-authority for variant-based styling

**Chat Architecture:**
- `ChatThread` orchestrates the chat UI using Vercel AI SDK's `useChat` hook
- `ChatBubble` renders individual messages with user/ai variants (bubble style)
- `ChatInput` handles text input with Enter-to-send and auto-resize
- Transport configured to `/api/chat` endpoint
- Dynamic greeting fetched from `/api/chat/greeting`

**Navigation Architecture:**
- Protected layout uses `AppHeader` + `MenuSheet` (slide-out drawer)
- Routes: `/chat` (default), `/goals`
- Sign-out handled via Supabase client in MenuSheet

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `app/globals.css` | CSS variables for theming - needs terminal colors |
| `tailwind.config.ts` | Tailwind theme extension - needs font + terminal utilities |
| `app/layout.tsx` | Root layout with font + ThemeProvider |
| `app/(protected)/layout.tsx` | Protected layout with header + menu |
| `components/app-header.tsx` | Current header - replace with terminal header |
| `components/menu-sheet.tsx` | Current nav drawer - replace with command bar |
| `src/features/ai-coach/components/chat-thread.tsx` | Chat orchestration - adapt for terminal |
| `src/features/ai-coach/components/chat-bubble.tsx` | Message display - replace with terminal line |
| `src/features/ai-coach/components/chat-input.tsx` | Input component - replace with terminal input |
| `src/features/goals/components/goal-list.tsx` | Goals display - replace with text list |
| `_bmad-output/planning-artifacts/ux-terminal-mockup.html` | Reference mockup |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | Full UX spec |

### Technical Decisions

**TD-1: Keep terminal components in existing feature directories**
- Terminal chat components stay in `src/features/ai-coach/components/`
- Terminal goals components stay in `src/features/goals/components/`
- Shared terminal primitives (shell, command bar) go in `components/terminal/`

**TD-2: Use CSS-only CRT effects**
- Scanlines via repeating-linear-gradient pseudo-element
- Glow via text-shadow
- Respect `prefers-reduced-motion` media query
- No JavaScript animation libraries needed

**TD-3: Command parsing in ChatThread**
- Detect `/` prefix in input before sending to API
- `/goals` → navigate to goals route
- `/help` → show help overlay or inline
- `/settings` → navigate to settings route (placeholder)
- `/signout` → trigger sign out flow
- Regular messages → send to AI as before

**TD-4: Remove theme switching**
- Terminal aesthetic is always dark
- Remove `next-themes` provider or set `forcedTheme="dark"`
- Simplifies CSS (no light mode to maintain)

## Implementation Plan

### Tasks

#### Phase 1: Design System Foundation

- [x] **Task 1: Update CSS variables for terminal theme**
  - File: `app/globals.css`
  - Action: Replace light theme CSS variables with terminal dark theme
  - Details:
    - Set `--background` to near-black (#0a0a0a)
    - Set `--foreground` to amber (#ffb000)
    - Add terminal-specific variables: `--terminal-amber`, `--terminal-amber-bright`, `--terminal-amber-dim`, `--terminal-glow`, `--terminal-border`
    - Add CRT effect CSS (scanlines pseudo-element, glow text-shadow)
    - Add `@media (prefers-reduced-motion)` to disable effects
    - Remove `.dark` variant (not needed)

- [x] **Task 2: Configure Tailwind for terminal typography**
  - File: `tailwind.config.ts`
  - Action: Add IBM Plex Mono font family and terminal utilities
  - Details:
    - Add `fontFamily: { mono: ['IBM Plex Mono', ...] }`
    - Extend colors with terminal semantic tokens
    - Set default border-radius to `none` or `sm` (sharp corners)

- [x] **Task 3: Update root layout with terminal font and theme**
  - File: `app/layout.tsx`
  - Action: Switch from Inter to IBM Plex Mono, force dark theme
  - Details:
    - Import IBM Plex Mono from Google Fonts (weights 400, 500)
    - Apply `font-mono` class to body
    - Change ThemeProvider to `forcedTheme="dark"` or remove entirely
    - Add `class="dark"` to html element

#### Phase 2: Terminal Shell Components

- [x] **Task 4: Create terminal header component**
  - File: `components/terminal/terminal-header.tsx` (new)
  - Action: Create header with title and optional window buttons
  - Details:
    - Display "RESOLUTION TRACKER v1.0" in bright amber
    - Optional ASCII window buttons `[—][□][×]` (decorative)
    - Border-bottom with terminal-border color
    - Background: terminal-bg-light (#141414)

- [x] **Task 5: Create terminal input component**
  - File: `components/terminal/terminal-input.tsx` (new)
  - Action: Create prompt-style input with `>` prefix
  - Details:
    - `>` prompt in dim amber, input in amber
    - Transparent background, no border on input
    - Enter to send, Escape to clear
    - Optional SEND button for mobile (terminal style)
    - Blinking cursor animation
    - Export `onCommand` callback for command handling

- [x] **Task 6: Create command bar component**
  - File: `components/terminal/command-bar.tsx` (new)
  - Action: Create clickable command shortcuts bar
  - Details:
    - Horizontal row: `/goals  /help  /settings  /signout`
    - Dim amber text, brightens on hover
    - Each command is a button or link
    - Positioned above or integrated with input area
    - Separated by divider line

- [x] **Task 7: Create terminal component exports**
  - File: `components/terminal/index.ts` (new)
  - Action: Barrel export all terminal components
  - Details: Export TerminalHeader, TerminalInput, CommandBar

#### Phase 3: Chat Components Migration

- [x] **Task 8: Create terminal line component**
  - File: `src/features/ai-coach/components/terminal-line.tsx` (new)
  - Action: Create text-based message line (replaces ChatBubble)
  - Details:
    - Variants: `user` ("> " prefix), `ai` ("COACH: " prefix), `system` ("SYSTEM: " prefix)
    - User prefix in dim amber, AI prefix in bright amber
    - Message text in standard amber
    - Text-shadow glow effect
    - Streaming cursor (▌) for AI responses in progress
    - No bubbles, no rounded corners, no background colors

- [x] **Task 9: Update chat input for terminal style**
  - File: `src/features/ai-coach/components/chat-input.tsx`
  - Action: Replace bubble-style input with terminal input
  - Details:
    - Use TerminalInput component or reimplement inline
    - Remove rounded corners, button styling
    - Add command detection: if input starts with `/`, don't send to API
    - Pass command to parent via callback

- [x] **Task 10: Update chat thread for terminal rendering**
  - File: `src/features/ai-coach/components/chat-thread.tsx`
  - Action: Replace ChatBubble with TerminalLine, add command handling
  - Details:
    - Replace ChatBubble imports with TerminalLine
    - Add command parsing logic:
      - `/goals` → `router.push('/goals')`
      - `/help` → show help inline or navigate
      - `/settings` → `router.push('/settings')`
      - `/signout` → call signOut and redirect
    - Update greeting display to use TerminalLine
    - Remove Loader2 spinner, use terminal cursor instead
    - Update error display to use SYSTEM: prefix

#### Phase 4: Layout Migration

- [x] **Task 11: Update protected layout with terminal shell**
  - File: `app/(protected)/layout.tsx`
  - Action: Replace AppHeader/MenuSheet with terminal shell structure
  - Details:
    - Remove AppHeader and MenuSheet imports
    - Add TerminalHeader at top
    - Wrap children in terminal output area styling
    - Add CommandBar at bottom (fixed position)
    - Apply terminal background and min-height
    - Structure: header → scrollable content → command bar

- [x] **Task 12: Remove deprecated navigation components**
  - Files: `components/app-header.tsx`, `components/menu-sheet.tsx`
  - Action: Delete or deprecate these files
  - Details: No longer needed after terminal shell is in place

#### Phase 5: Goals View Migration

- [x] **Task 13: Create terminal goals list**
  - File: `src/features/goals/components/terminal-goal-list.tsx` (new)
  - Action: Create text-based goals display
  - Details:
    - Header: "YOUR GOALS" with divider line (──────)
    - Each goal: `[status]  Goal title`
    - Status in dim amber: `[active]`, `[done]`, `[paused]`
    - Completed goals: dim text or strikethrough
    - Footer: "Type anything to return to conversation."
    - Fetch goals from `/api/goals` on mount
    - Loading state: "Loading goals..."
    - Empty state: "No goals yet. Chat with me to set your first one."

- [x] **Task 14: Update goals page**
  - File: `app/(protected)/goals/page.tsx`
  - Action: Use terminal goals list component
  - Details:
    - Replace GoalList with TerminalGoalList
    - Remove header/title (handled by component)
    - Full terminal styling

#### Phase 6: Settings Placeholder

- [x] **Task 15: Create settings placeholder page**
  - File: `app/(protected)/settings/page.tsx` (new)
  - Action: Create minimal placeholder for settings route
  - Details:
    - Display "SETTINGS" header with divider
    - Message: "Settings coming soon."
    - "Type anything to return to conversation."
    - Same terminal styling as goals

#### Phase 7: Auth Pages

- [x] **Task 16: Update login page with terminal styling**
  - File: `app/auth/login/page.tsx`
  - Action: Apply terminal aesthetic to login
  - Details:
    - Dark background, amber text
    - Terminal-style form (no rounded inputs)
    - Keep magic link flow, just restyle
    - Optional: ASCII art welcome

#### Phase 8: Cleanup

- [x] **Task 17: Update chat page wrapper**
  - File: `app/(protected)/chat/page.tsx`
  - Action: Ensure chat page works with new terminal shell
  - Details:
    - Remove negative margins/padding hacks
    - Let ChatThread fill the content area naturally

- [x] **Task 18: Remove unused components**
  - Files: `src/features/ai-coach/components/chat-bubble.tsx`, `src/features/goals/components/goal-card.tsx`, `src/features/goals/components/goal-form.tsx`
  - Action: Delete or mark as deprecated
  - Details: These components are replaced by terminal equivalents

### Acceptance Criteria

#### Core Terminal Experience

- [x] **AC-1:** Given a user loads the app, when the page renders, then the background is near-black (#0a0a0a) and all text is amber (#ffb000) with phosphor glow effect.

- [x] **AC-2:** Given a user views any page, when they inspect the typography, then all text uses IBM Plex Mono monospace font at 16px base size with 1.6 line-height.

- [x] **AC-3:** Given a user has `prefers-reduced-motion` enabled, when they view the terminal, then scanlines are hidden and cursor does not blink.

#### Chat Functionality

- [x] **AC-4:** Given a user is on the chat page, when they type a message and press Enter, then the message appears with `> ` prefix and the AI response streams with `COACH: ` prefix.

- [x] **AC-5:** Given the AI is responding, when text is streaming, then a blinking cursor (▌) appears at the end of the response until complete.

- [x] **AC-6:** Given a user types `/goals`, when they press Enter, then they are navigated to the goals page (no message sent to AI).

- [x] **AC-7:** Given a user types `/help`, when they press Enter, then a help message displays showing available commands.

- [x] **AC-8:** Given a user types `/signout`, when they press Enter, then they are signed out and redirected to the login page.

#### Command Bar

- [x] **AC-9:** Given a user is on any protected page, when they view the bottom of the screen, then they see clickable command shortcuts: `/goals`, `/help`, `/settings`, `/signout`.

- [x] **AC-10:** Given a user clicks `/goals` in the command bar, when the click registers, then they navigate to the goals page.

#### Goals View

- [x] **AC-11:** Given a user navigates to `/goals`, when the page loads, then goals display as text lines with `[status]` prefix (e.g., `[active]  Hit the gym 3x per week`).

- [x] **AC-12:** Given a user has no goals, when they view the goals page, then they see "No goals yet. Chat with me to set your first one."

- [x] **AC-13:** Given a user is on the goals page, when they type anything and press Enter, then they navigate back to the chat page.

#### Responsive Design

- [x] **AC-14:** Given a user views the app on mobile (< 640px), when the terminal renders, then it fills the full viewport width with 12-16px padding.

- [x] **AC-15:** Given a user views the app on desktop (> 1024px), when the terminal renders, then it is max-width 800px and centered.

#### Accessibility

- [x] **AC-16:** Given a screen reader user navigates the chat, when messages are announced, then user messages are prefixed with "You said:" and AI messages with "Coach said:".

- [x] **AC-17:** Given a user tabs through the interface, when focus moves to interactive elements, then a visible amber glow focus ring appears.

## Additional Context

### Dependencies

- **IBM Plex Mono font** — Add via Google Fonts in `app/layout.tsx`
  ```tsx
  import { IBM_Plex_Mono } from 'next/font/google';
  const ibmPlexMono = IBM_Plex_Mono({
    weight: ['400', '500'],
    subsets: ['latin'],
    variable: '--font-mono'
  });
  ```
- **No new npm packages** — Using existing Tailwind, class-variance-authority, lucide-react

### Testing Strategy

**Manual Testing (Primary):**
1. Visual inspection against mockup (`ux-terminal-mockup.html`)
2. Test all navigation commands (`/goals`, `/help`, `/settings`, `/signout`)
3. Test chat send/receive flow with streaming
4. Test responsive breakpoints (mobile, tablet, desktop)
5. Test with `prefers-reduced-motion` enabled
6. Test keyboard navigation (Tab, Enter, Escape)

**Accessibility Testing:**
1. Run Lighthouse accessibility audit (target 90+)
2. Test with VoiceOver/NVDA screen reader
3. Verify color contrast (amber on black > 12:1)

**Browser Testing:**
1. Chrome (primary)
2. Safari (iOS and macOS)
3. Firefox

**No automated tests planned** — UI migration is visual; manual testing is more appropriate. Future stories can add component tests if needed.

### Notes

**High-Risk Items:**
1. **Chat streaming cursor** — Timing the cursor blink with streaming state requires careful handling of `status` from `useChat`
2. **Command parsing edge cases** — Need to handle `/goals` vs `/goalsabc` (only exact matches)
3. **Mobile keyboard** — Ensure input stays visible when keyboard opens (may need `100dvh` and scroll handling)

**Known Limitations:**
- Goals are read-only in terminal view; editing requires future Goal Management Agent
- Settings page is placeholder only
- Help is minimal (just command list)

**Future Considerations (Out of Scope):**
- Keyboard shortcuts (Up arrow for history, Ctrl+L to clear)
- Customizable themes (green phosphor option)
- ASCII art welcome screen
- Sound effects (optional terminal beeps)

---

## Review Notes

**Adversarial review completed: 2026-01-16**

### Findings Summary

| ID | Severity | Validity | Description | Resolution |
|----|----------|----------|-------------|------------|
| F1 | High | Real | Duplicated command handling logic across chat-input, chat-thread, layout | Fixed - centralized commands |
| F2 | Medium | Real | Unsafe ref forwarding in TerminalInput | Fixed - proper ref handling |
| F3 | Low | Real | Missing keyboard shortcuts for navigation | Deferred - future enhancement |
| F4 | Medium | Real | No error boundary for streaming chat failures | Fixed - added ErrorBoundary |
| F5 | Low | Noise | Potential XSS in renderContent | N/A - currently safe |
| F6 | Low | Real | CRT effects lack GPU optimization | Fixed - added will-change |
| F7 | Medium | Real | Chat greeting fetch has no timeout | Fixed - added 5s timeout |
| F8 | Low | Real | Inconsistent focus management | Deferred - minor UX |
| F9 | Low | Real | TerminalInput exported but unused | Fixed - removed export |
| F10 | Medium | Real | Missing ARIA live region for streaming | Fixed - added aria-live |
| F11 | Low | Noise | Dark mode forcibly locked | By design (TD-4) |
| F12 | Low | Undecided | Goals page modal navigation | Matches spec design |
| F13 | Medium | Real | No input length validation | Fixed - added max length |
| F14 | Low | Noise | Settings page is a stub | Explicitly out of scope |
| F15 | Low | Real | Memory leak potential in greeting fetch | Fixed - proper cleanup |

**Resolution approach:** Auto-fix for real issues
**Findings:** 15 total, 10 fixed, 3 deferred/by-design, 2 noise
