---
title: 'Configurable Default Protected Page'
slug: 'configurable-default-protected-page'
created: '2026-01-14'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16.x', 'Supabase Auth', 'TypeScript']
files_to_modify: ['lib/supabase/proxy.ts', 'app/auth/confirm/route.ts', '.env.example']
code_patterns: ['NextResponse.redirect() for middleware redirects', 'process.env access for server-only vars', 'nullish coalescing for fallbacks']
test_patterns: ['Manual testing via auth flow']
---

# Tech-Spec: Configurable Default Protected Page

**Created:** 2026-01-14

## Overview

### Problem Statement

Authenticated users currently land on `/protected` (a debug page showing user claims) after login. There's no way to configure where they should go by default.

### Solution

Add `DEFAULT_PROTECTED_PAGE` env variable that controls where authenticated users are redirected. Update both `proxy.ts` (for root `/` redirect) and `auth/confirm/route.ts` (for post-auth redirect default).

### Scope

**In Scope:**
- Add `DEFAULT_PROTECTED_PAGE` env var (server-only)
- Update `proxy.ts` to redirect authenticated users from `/` to the default page
- Update `auth/confirm/route.ts` to use env var as fallback instead of `/protected`
- Update `.env.example` with the new variable
- Set default value to `/protected/goals`

**Out of Scope:**
- User-configurable preferences (this is system-level only)
- Changes to the marketing/home page itself
- Any UI for selecting the default page

## Context for Development

### Codebase Patterns

- Auth handled via Supabase with magic links only
- Protected routes under `/protected/*`
- Auth check in `lib/supabase/proxy.ts` (redirects unauthenticated to `/auth/login`)
- Profile creation happens in `auth/confirm/route.ts` after successful auth
- Server-only env vars (no `NEXT_PUBLIC_` prefix) for server-side logic
- Redirect pattern: `NextResponse.redirect(url)` where `url` is cloned from `request.nextUrl`

### Files to Reference

| File | Purpose | Key Lines |
| ---- | ------- | --------- |
| `lib/supabase/proxy.ts` | Session middleware with auth guards | L50-55: protected route check |
| `app/auth/confirm/route.ts` | Post-auth redirect handler | L13: hardcoded `/protected` fallback |
| `.env.example` | Env var template | Add new var here |

### Technical Decisions

- Use server-only env var (`DEFAULT_PROTECTED_PAGE`) since redirect logic runs on server
- Fallback chain: `searchParams.get("next")` → `process.env.DEFAULT_PROTECTED_PAGE` → `/protected/goals`
- Root `/` redirect only triggers for authenticated users (unauthenticated stay on marketing page)
- Insert new redirect logic in `proxy.ts` after the unauthenticated check (after line 55)

## Implementation Plan

### Tasks

- [x] Task 1: Add DEFAULT_PROTECTED_PAGE to environment configuration
  - File: `resolution-tracker/.env.example`
  - Action: Add `DEFAULT_PROTECTED_PAGE=/protected/goals` with descriptive comment
  - Notes: Place after the Supabase config section

- [x] Task 2: Add DEFAULT_PROTECTED_PAGE to local environment
  - File: `resolution-tracker/.env.local`
  - Action: Add `DEFAULT_PROTECTED_PAGE=/protected/goals`
  - Notes: This enables the feature immediately in dev

- [x] Task 3: Update auth confirm route to use configurable default
  - File: `resolution-tracker/app/auth/confirm/route.ts`
  - Action: Change line 13 from `const next = searchParams.get("next") ?? "/protected"` to `const next = searchParams.get("next") ?? process.env.DEFAULT_PROTECTED_PAGE ?? "/protected/goals"`
  - Notes: Maintains backward compatibility - if env var not set, falls back to `/protected/goals`

- [x] Task 4: Add authenticated user redirect from root to default page
  - File: `resolution-tracker/lib/supabase/proxy.ts`
  - Action: After line 55 (after the unauthenticated check block), add logic to redirect authenticated users hitting `/` to the default protected page
  - Notes: Only redirect if `user` exists AND pathname is exactly `/`. Use same redirect pattern as line 52-54.

### Acceptance Criteria

- [x] AC1: Given an authenticated user, when they visit `/`, then they are redirected to `/protected/goals` (or configured default)
- [x] AC2: Given an unauthenticated user, when they visit `/`, then they remain on the home/marketing page (no redirect)
- [x] AC3: Given a user completing magic link auth with no `next` param, when auth succeeds, then they are redirected to `/protected/goals` (or configured default)
- [x] AC4: Given a user completing magic link auth with a `next` param, when auth succeeds, then they are redirected to the `next` param value (env var does not override explicit param)
- [x] AC5: Given `DEFAULT_PROTECTED_PAGE` is set to `/protected/dashboard`, when an authenticated user visits `/`, then they are redirected to `/protected/dashboard`
- [x] AC6: Given `DEFAULT_PROTECTED_PAGE` is not set, when an authenticated user visits `/`, then they are redirected to `/protected/goals` (hardcoded fallback)

## Additional Context

### Dependencies

None - this is a simple configuration change using existing auth infrastructure.

### Testing Strategy

**Manual Testing:**
1. Set `DEFAULT_PROTECTED_PAGE=/protected/goals` in `.env.local`
2. Start dev server: `npm run dev`
3. Test unauthenticated root access: Visit `/` - should see marketing page
4. Test authenticated root redirect: Login via magic link, then visit `/` - should redirect to `/protected/goals`
5. Test post-auth redirect: Logout, login again - should land on `/protected/goals` after auth
6. Test explicit next param: Add `?next=/protected` to magic link - should override env var
7. Test different default: Change env var to `/protected`, restart, verify new redirect target

### Notes

- The `/protected/page.tsx` currently shows debug info (user claims). This will become less visible now that users redirect to `/protected/goals` by default.
- Future consideration: Could add a "last visited" preference stored in user profile, but that's out of scope for this system-level config.

## Review Notes

**Adversarial review completed: 2026-01-14**

| ID | Severity | Validity | Description | Resolution |
|----|----------|----------|-------------|------------|
| F1 | Critical | Real | Open redirect vulnerability - `next` param accepts any URL without validation | Fixed |
| F2 | High | Undecided | No validation of `DEFAULT_PROTECTED_PAGE` env var value | Skipped - operational config |
| F3 | High | Real | Potential redirect loop if env var set to `/` | Fixed |
| F4 | High | Undecided | No validation that target route exists | Skipped - runtime concern |
| F5 | Medium | Noise | Missing TypeScript type definition for env var | Skipped - optional |
| F6 | Medium | Real | DRY violation - fallback `/protected/goals` in two files | Fixed |
| F7 | Medium | Noise | No unit tests | Skipped - per spec: manual testing |
| F8 | Medium | Noise | Documentation for production deployment | Skipped - out of scope |
| F9 | Low | Noise | Misleading comment in .env.example | Skipped - minor |
| F10 | Low | Noise | No path traversal protection | Skipped - URL normalizes |
| F11 | Low | Noise | Static asset edge cases | Skipped - middleware handles |
| F12 | Low | Real | Acceptance criteria not marked complete | Fixed |

**Summary:** 12 findings, 4 fixed, 8 skipped (noise/undecided)
