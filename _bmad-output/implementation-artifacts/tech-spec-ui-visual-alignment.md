---
title: 'UI Visual Alignment to UX Design Spec'
slug: 'ui-visual-alignment'
created: '2026-01-14'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Next.js 16.x (App Router)
  - TypeScript 5.x (strict mode)
  - Tailwind CSS 3.x
  - shadcn/ui + Radix UI primitives
  - Supabase Auth (magic links)
  - next-themes (ThemeProvider)
files_to_modify:
  - app/layout.tsx
  - app/page.tsx
  - app/protected/layout.tsx
  - app/protected/goals/page.tsx
  - app/auth/login/page.tsx
  - components/ui/button.tsx
  - components/ui/card.tsx
  - components/ui/input.tsx
  - components/login-form.tsx
  - components/auth-button.tsx
  - src/features/goals/components/goal-card.tsx
  - src/features/goals/components/goal-form.tsx
  - src/features/goals/components/goal-list.tsx
files_to_create:
  - components/ui/sheet.tsx
  - components/menu-sheet.tsx
  - components/app-header.tsx
code_patterns:
  - shadcn/ui components use cn() utility for class merging
  - Components use cva (class-variance-authority) for variant styling
  - Files are kebab-case, components PascalCase
  - Business logic in features/, UI in components/
test_patterns:
  - Co-located tests next to source files
  - No separate test directories
---

# Tech-Spec: UI Visual Alignment to UX Design Spec

**Created:** 2026-01-14

## Overview

### Problem Statement

The current UI has generic boilerplate styling that doesn't match the "Confident Warmth" design direction defined in the UX specification. The app looks like a standard CRUD web app instead of the warm, mobile-first, app-like experience the UX spec describes. This needs to be fixed before implementing chat/AI features to establish a solid visual foundation.

### Solution

Apply the UX spec's design language across all existing pages and restructure navigation/layout to match the app-like pattern (hamburger menu + slide-out MenuSheet, minimal chrome, mobile-first container).

### Scope

**In Scope:**
- Restructure navigation to hamburger menu + MenuSheet pattern (slide from right)
- Remove footer, create app-like minimal chrome
- Mobile-first centered container (600px max on desktop)
- Apply "Confident Warmth" styling to all shadcn/ui components (buttons, cards, inputs)
- Apply proper typography scale and spacing per UX spec
- Goals page visual polish (warm cards, generous spacing, proper layout)
- Login page warm styling
- Home/landing page warm welcome feel
- Protected layout as clean app container

**Out of Scope:**
- Chat functionality / ChatBubble / ChatInput components
- Onboarding flow / WelcomeScreen component
- Settings page
- AI integration
- Any new features or pages beyond visual alignment

## Context for Development

### Codebase Patterns

**Component Structure:**
- shadcn/ui components live in `components/ui/` and are copy-pasted (not npm deps)
- Use `cn()` from `@/lib/utils` for class merging
- Use `cva` from `class-variance-authority` for variant definitions
- Radix UI primitives provide accessibility (keyboard nav, focus management)

**Styling Approach:**
- Tailwind CSS with CSS variables for theming
- Color tokens defined in `globals.css` using HSL format
- Dark mode supported via `next-themes` and `.dark` class
- Current warm palette is correct; components need styling updates

**Layout Patterns:**
- App Router with nested layouts
- `app/layout.tsx` = root (font, theme provider)
- `app/protected/layout.tsx` = authenticated shell (nav, content area)
- Pages are thin wrappers rendering feature components

**Naming Conventions:**
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- CSS variables: `--kebab-case`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | Source of truth for design direction |
| `_bmad-output/planning-artifacts/ux-design-mockup.html` | Visual reference with exact colors/spacing |
| `app/globals.css` | CSS variables for warm color palette |
| `tailwind.config.ts` | Extended theme tokens |
| `components/ui/button.tsx` | Reference for shadcn/ui component structure |

### Technical Decisions

1. **Font Change:** Replace Geist with Inter (per UX spec). Inter is available via Google Fonts, same import pattern.

2. **Sheet Component:** Add shadcn/ui Sheet component via CLI (`npx shadcn@latest add sheet`). Required for MenuSheet navigation.

3. **Touch Targets:** Increase minimum heights from h-9 (36px) to h-11 (44px) for buttons and inputs per accessibility requirements.

4. **Remove Dark Mode Toggle:** UX spec focuses on light "Confident Warmth" theme. Remove ThemeSwitcher from visible UI. Keep dark mode CSS for potential future use but don't expose toggle.

5. **Container Strategy:** Use `max-w-[600px] mx-auto` for desktop centered content. Full width on mobile.

6. **Navigation Architecture:**
   - Create `AppHeader` component with title + hamburger icon
   - Create `MenuSheet` component that slides from right
   - Menu items: Goals, Settings (future), Sign Out
   - Remove inline nav links and footer

## Implementation Plan

### Tasks

#### Phase 1: Foundation

- [x] **Task 1: Add Sheet component**
  - Action: Run `npx shadcn@latest add sheet` in `resolution-tracker/` directory
  - Creates: `components/ui/sheet.tsx`
  - Notes: Required dependency for MenuSheet navigation

- [x] **Task 2: Update root layout with Inter font**
  - File: `app/layout.tsx`
  - Action: Replace Geist font import with Inter from Google Fonts
  - Action: Update metadata title to "Resolution Tracker"
  - Action: Update metadata description to match product vision
  - Notes: Keep ThemeProvider but we'll hide the toggle

#### Phase 2: Base UI Components

- [x] **Task 3: Update Button component for touch targets**
  - File: `components/ui/button.tsx`
  - Action: Change default size from `h-9` to `h-11` (44px)
  - Action: Change `rounded-md` to `rounded-xl` in base styles
  - Action: Update size variants: `sm` → `h-9`, `default` → `h-11`, `lg` → `h-12`
  - Action: Update icon size to `h-11 w-11`
  - Notes: 44px minimum for touch accessibility

- [x] **Task 4: Update Card component for warm styling**
  - File: `components/ui/card.tsx`
  - Action: Change `rounded-xl` to `rounded-2xl` on Card
  - Action: Remove `shadow` (or use very subtle shadow)
  - Action: Ensure border uses `border-border` token
  - Notes: Per UX spec, cards should be warm and soft

- [x] **Task 5: Update Input component for touch targets**
  - File: `components/ui/input.tsx`
  - Action: Change `h-9` to `h-11` (44px)
  - Action: Change `rounded-md` to `rounded-xl`
  - Action: Ensure focus ring uses warm amber (`ring-ring` token)
  - Notes: Larger inputs are thumb-friendly

#### Phase 3: Navigation Components

- [x] **Task 6: Create AppHeader component**
  - File: `components/app-header.tsx` (create)
  - Action: Create header with title on left, hamburger icon on right
  - Action: Use `h-14` height with `px-4` padding
  - Action: Add bottom border using `border-border`
  - Action: Hamburger icon should trigger MenuSheet (passed as prop or via context)
  - Notes: Per mockup, simple header with minimal chrome

- [x] **Task 7: Create MenuSheet component**
  - File: `components/menu-sheet.tsx` (create)
  - Action: Use shadcn Sheet component, slide from right (`side="right"`)
  - Action: Width: `w-[280px]`
  - Action: Include nav items: Goals link, Sign Out button
  - Action: Style nav items with 48px height, full-width tap targets
  - Action: Add subtle dividers between sections
  - Notes: Per UX spec, menu slides from right with overlay

#### Phase 4: Layouts

- [x] **Task 8: Update protected layout**
  - File: `app/protected/layout.tsx`
  - Action: Remove existing nav bar and footer
  - Action: Add AppHeader component at top
  - Action: Add MenuSheet component
  - Action: Content area: `flex-1 w-full max-w-[600px] mx-auto px-4`
  - Action: Use `min-h-screen` and `flex flex-col` for full-height layout
  - Notes: This is the main app shell for authenticated users

- [x] **Task 9: Update home/landing page**
  - File: `app/page.tsx`
  - Action: Remove nav bar and footer
  - Action: Create centered, warm welcome layout
  - Action: Headline: friendly welcome text (not "Resolution Tracker" as h1)
  - Action: Subtext: brief value proposition
  - Action: CTA button: "Get Started" → `/auth/login`
  - Action: Use generous spacing, vertically centered content
  - Notes: Per UX spec, warm and inviting, not corporate

- [x] **Task 10: Update login page layout**
  - File: `app/auth/login/page.tsx`
  - Action: Ensure full-height centered layout
  - Action: Add subtle back link or logo at top if needed
  - Action: Keep minimal, focused on the form
  - Notes: Clean, warm login experience

#### Phase 5: Form Components

- [x] **Task 11: Update LoginForm styling**
  - File: `components/login-form.tsx`
  - Action: Update Card usage to have warm styling
  - Action: Change error text from `text-red-500` to `text-destructive`
  - Action: Ensure button and input use updated component styles
  - Action: Add generous spacing (`gap-6` → `gap-8` if needed)
  - Notes: Should feel warm and friendly, not clinical

- [x] **Task 12: Update GoalForm styling**
  - File: `src/features/goals/components/goal-form.tsx`
  - Action: Apply same warm Card styling
  - Action: Change error text from `text-red-500` to `text-destructive`
  - Action: Ensure consistent spacing with LoginForm
  - Notes: Consistency across all forms

#### Phase 6: Goal Components

- [x] **Task 13: Update GoalCard to match mockup**
  - File: `src/features/goals/components/goal-card.tsx`
  - Action: Simplify card layout — goal name prominent, minimal metadata
  - Action: Remove or simplify status Badge display (per "no guilt" design)
  - Action: Keep dropdown menu but style the trigger button warmly
  - Action: Add subtle "Last check-in" text in muted color if showing dates
  - Action: Completed goals: `opacity-70`, goal name with `line-through`
  - Notes: Per mockup, cards are simple with just name and optional note

- [x] **Task 14: Update GoalList layout**
  - File: `src/features/goals/components/goal-list.tsx`
  - Action: Update spacing between cards (`space-y-4` → `space-y-3`)
  - Action: Update loading state to use warm skeleton colors
  - Action: Update empty state text to be warmer ("No goals yet" + friendly subtext)
  - Action: Ensure error messages use `text-destructive` not red-500
  - Notes: Matches the "no guilt" design philosophy

#### Phase 7: Goals Page

- [x] **Task 15: Update Goals page header**
  - File: `app/protected/goals/page.tsx`
  - Action: Add back button (left arrow) linking to `/protected` or chat (future)
  - Action: Page title: "Your Goals" centered
  - Action: Add button (+ icon) on right for adding new goal
  - Action: Match the goals screen header from mockup
  - Action: Remove current h1 and description (header replaces them)
  - Notes: Per mockup, goals page has its own header with back/add buttons

### Acceptance Criteria

#### Visual Alignment

- [x] **AC1:** Given the app is loaded, when viewing any page, then the Inter font is used for all text
- [x] **AC2:** Given any button on the app, when measuring its height, then it is at least 44px tall
- [x] **AC3:** Given any text input on the app, when measuring its height, then it is at least 44px tall
- [x] **AC4:** Given any Card component, when viewing it, then it has rounded-2xl (20px) border radius
- [x] **AC5:** Given the color palette, when viewing backgrounds, then they use the warm off-white (#FEFDFB) color

#### Navigation

- [x] **AC6:** Given an authenticated user on /protected/*, when they tap the hamburger icon, then a MenuSheet slides in from the right
- [x] **AC7:** Given the MenuSheet is open, when the user taps "Goals", then they navigate to /protected/goals and the sheet closes
- [x] **AC8:** Given the MenuSheet is open, when the user taps "Sign Out", then they are logged out and redirected to /auth/login
- [x] **AC9:** Given the MenuSheet is open, when the user taps outside (overlay) or presses Escape, then the sheet closes
- [x] **AC10:** Given the protected layout, when viewing on mobile, then there is no visible footer or theme switcher

#### Layout & Responsiveness

- [x] **AC11:** Given a desktop viewport (≥1024px), when viewing protected pages, then content is centered with max-width 600px
- [x] **AC12:** Given a mobile viewport (<640px), when viewing protected pages, then content is full-width with 16px horizontal padding
- [x] **AC13:** Given the Goals page, when viewing the header, then there is a back button (left), title (center), and add button (right)

#### Goals Page Specific

- [x] **AC14:** Given a goal card, when viewing it, then only the goal title and optional "Last check-in" text are visible (no prominent status badges)
- [x] **AC15:** Given a completed goal, when viewing it, then the card has reduced opacity and the title has a line-through style
- [x] **AC16:** Given the empty goals state, when viewing it, then friendly, non-judgmental text is displayed

#### Home/Login Pages

- [x] **AC17:** Given an unauthenticated user on the home page, when viewing it, then they see a warm welcome with a "Get Started" CTA
- [x] **AC18:** Given the login page, when viewing it, then the form is centered and uses warm styling consistent with the app

## Additional Context

### Dependencies

- **shadcn/ui Sheet component:** Must be added via CLI before creating MenuSheet
- **Inter font:** Available via Google Fonts, no npm package needed
- **Existing Radix UI primitives:** Already installed (used by existing shadcn components)
- **lucide-react:** Already installed (used for icons)

### Testing Strategy

**Manual Testing:**
1. Visual inspection against mockup HTML file (`ux-design-mockup.html`)
2. Test all breakpoints: 375px (iPhone SE), 768px (tablet), 1024px+ (desktop)
3. Test MenuSheet open/close behavior on mobile and desktop
4. Verify all touch targets are 44px minimum using browser dev tools
5. Test keyboard navigation (Tab through elements, Escape to close sheet)

**Automated Testing:**
- No new unit tests required (visual changes only)
- Existing component tests should continue to pass
- Consider adding a visual regression test in future

**Browser Testing:**
- Chrome (primary)
- Safari (iOS)
- Firefox

### Notes

**Key UX Spec References:**
- Color palette: warm off-white (#FEFDFB), warm charcoal (#2D2A26), soft amber (#E59500)
- Border radius: 12-20px (rounded-xl to rounded-2xl)
- Typography: Inter, 16px base, generous line-height (1.5-1.6)
- Touch targets: 44px minimum
- Container: 600px max-width centered on desktop, 100% on mobile
- Navigation: Hamburger icon top-right, MenuSheet slides from right

**Risk Areas:**
- Sheet component installation may have peer dependency issues — run in resolution-tracker/ directory
- Font change may cause minor layout shifts — verify all text remains readable
- Removing status badges from GoalCard may require adjusting how completed/paused goals are visually distinguished

**Future Considerations (Out of Scope):**
- Chat view will become the primary landing page for authenticated users
- Settings page will be added to MenuSheet
- Onboarding flow will use WelcomeScreen component
- Dark mode may be re-enabled in future with warm dark palette

---

## Review Notes

- Adversarial review completed
- Findings: 15 total, 6 fixed, 9 skipped (noise/intentional)
- Resolution approach: auto-fix

**Fixes Applied:**
- F1/F13: Converted `/protected` to route group, URLs now `/goals` instead of `/protected/goals`
- F5: Added SheetDescription for accessibility compliance
- F6: Added error handling to sign out function
- F8: Removed back button from goals page (goals is default page)
- F11: Cleaned up button border-radius redundancy in size variants

**Skipped (Intentional/Noise):**
- F2, F7, F12: ThemeSwitcher, EnvVarWarning, shadow removal - all intentional per UX spec
- F3, F9: Font variable, AppHeader prop - valid patterns
- F4, F10, F14, F15: Minor issues, valid as-is or future improvements
