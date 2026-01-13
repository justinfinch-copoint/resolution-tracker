---
title: 'Authentication - Magic Link Implementation'
slug: 'auth-magic-link'
created: '2026-01-13'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
implementedAt: '2026-01-13'
tech_stack:
  - Next.js 16.x (App Router)
  - Supabase Auth (@supabase/ssr for SSR)
  - TypeScript 5.x (strict mode)
  - Tailwind CSS + shadcn/ui
  - Drizzle ORM
files_to_modify:
  - 'MODIFY: components/login-form.tsx → magic link form'
  - 'MODIFY: components/auth-button.tsx → remove sign-up button'
  - 'MODIFY: src/db/schema.ts → add profiles table and FK constraints'
  - 'MODIFY: app/auth/confirm/route.ts → add profile upsert on auth'
  - 'KEEP: app/auth/error/page.tsx → error display'
  - 'KEEP: app/protected/layout.tsx → protected layout'
  - 'KEEP: app/protected/page.tsx → dashboard page'
  - 'KEEP: components/logout-button.tsx → logout functionality'
  - 'DELETE: app/auth/sign-up/page.tsx'
  - 'DELETE: app/auth/sign-up-success/page.tsx'
  - 'DELETE: app/auth/forgot-password/page.tsx'
  - 'DELETE: app/auth/update-password/page.tsx'
  - 'DELETE: components/sign-up-form.tsx'
  - 'DELETE: components/forgot-password-form.tsx'
  - 'DELETE: components/update-password-form.tsx'
  - 'UPDATE: lib/supabase/proxy.ts → route protection (Next.js 16 uses proxy.ts not middleware.ts)'
  - 'CREATE: app/auth/check-email/page.tsx → magic link sent confirmation'
  - 'UPDATE: _bmad-output/planning-artifacts/architecture.md'
  - 'UPDATE: _bmad-output/project-context.md'
code_patterns:
  - 'Client components use "use client" directive'
  - 'Supabase client created fresh per request (SSR pattern)'
  - 'Form state managed with useState hooks'
  - 'Error display inline below form fields'
  - 'Loading states with disabled button + text change'
  - 'Card component wraps auth forms'
  - 'useRouter for navigation after auth actions'
  - 'Profiles table links auth.users to public schema'
  - 'App-level profile upsert on auth confirm (works locally + production)'
test_patterns:
  - 'Co-located tests: *.test.ts next to source'
  - 'No existing auth tests in starter'
---

# Tech-Spec: Authentication - Magic Link Implementation

**Created:** 2026-01-13

## Overview

### Problem Statement

The current auth setup uses password-based login from the Supabase starter template, but the product requires magic link (passwordless) authentication only. There's no middleware for route protection, the architecture doc references a `(dashboard)/` route group that doesn't match the existing `/protected` structure, and the database schema lacks a profiles table to properly link Supabase Auth users to application data with foreign key constraints.

### Solution

Convert to magic link only authentication by removing password flows, implementing a streamlined email-based sign-in, adding Next.js middleware for route protection, creating a profiles table with app-level auto-creation on auth confirm for proper FK relationships (works both locally and in production), and updating the architecture documentation to use `/protected` as the canonical protected route group.

### Scope

**In Scope:**
- Magic link sign-in flow (email → link → authenticated)
- Remove password-based auth (login form, sign-up form, forgot/update password pages)
- Next.js middleware for protecting `/protected/*` routes
- Create profiles table with FK constraints from other tables
- App-level profile upsert in auth confirm route (no database trigger)
- Update `/protected` route structure
- Update architecture.md to use `/protected` instead of `(dashboard)/`
- Update project-context.md to remove "auth is mocked/bypassed" for local dev
- Local development using real Supabase auth

**Out of Scope:**
- Notion/Zapier OAuth integration (separate spec)
- User profile management UI (just the table, no UI)
- Session timeout or remember-me customization
- Email template customization in Supabase
- Production Supabase project setup (assumed configured separately)

## Context for Development

### Codebase Patterns

**Existing Auth Implementation (from investigation):**

The Supabase starter uses password-based auth with these patterns:
- `signInWithPassword()` for login
- `signUp()` with password for registration
- `resetPasswordForEmail()` for forgot password
- `updateUser({ password })` for password change

**Current Database Schema (from investigation):**

The schema has `user_id` columns but NO foreign key constraints to a profiles table:
```typescript
// Current: user_id is just a UUID with no FK
userId: uuid('user_id').notNull(),
```

This is problematic because:
- Can't enforce referential integrity
- Orphan records possible if user deleted
- No clean way to store user profile data

**Key Files Analyzed:**

| File | Current State | Action |
|------|---------------|--------|
| `src/db/schema.ts` | Has user_id columns, no profiles table | Add profiles + FK constraints |
| `components/login-form.tsx` | Password login with `signInWithPassword` | Replace with `signInWithOtp` |
| `components/auth-button.tsx` | Shows "Sign in" + "Sign up" buttons | Remove "Sign up" button |
| `app/auth/confirm/route.ts` | Handles OTP verification via `verifyOtp` | Add profile upsert after auth |
| `app/protected/page.tsx` | Checks auth via `getClaims()`, redirects | Keep - good pattern |
| `lib/supabase/server.ts` | SSR client with cookie handling | Keep - required for middleware |
| `lib/supabase/client.ts` | Browser client | Keep - used by login form |

**Supabase Client Pattern (MUST follow):**
```typescript
// Server-side: Always create fresh client
const supabase = await createClient(); // from lib/supabase/server

// Browser-side: Create in event handler
const supabase = createClient(); // from lib/supabase/client
```

**Form Component Pattern (MUST follow):**
```typescript
"use client";
// useState for email, error, isLoading
// Form with onSubmit handler
// Error display: {error && <p className="text-sm text-red-500">{error}</p>}
// Button: disabled={isLoading}, text changes during loading
```

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `resolution-tracker/src/db/schema.ts` | Database schema to modify |
| `resolution-tracker/lib/supabase/server.ts` | Server-side Supabase client (use in middleware) |
| `resolution-tracker/lib/supabase/client.ts` | Browser Supabase client (use in login form) |
| `resolution-tracker/app/auth/confirm/route.ts` | OTP verification + profile upsert |
| `resolution-tracker/components/login-form.tsx` | Form pattern to follow (modify for magic link) |
| `_bmad-output/planning-artifacts/architecture.md` | Architecture to update |
| `_bmad-output/project-context.md` | Project context to update |

### Technical Decisions

**From Discussion:**
1. **Magic link only** - No password authentication, simpler UX, no password storage concerns
2. **Real auth in local dev** - No mocking, ensures parity between dev and production
3. **Use `/protected` route** - Keep existing structure from starter (not route group with parentheses)
4. **Profiles table** - Links auth.users to public schema with proper FK constraints
5. **App-level profile creation** - Create profile in auth confirm route (not database trigger) so it works both locally and in production

**Supabase Magic Link Flow:**
1. User enters email on login page
2. Call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
3. Supabase sends magic link email
4. User clicks link → redirects to `/auth/confirm?token_hash=...&type=magiclink`
5. `confirm/route.ts` calls `verifyOtp({ type, token_hash })` and sets session cookie
6. **App-level profile upsert** - Create profile if not exists
7. Redirect to `/protected`

**Profiles Table Pattern (App-Level Creation):**
```
auth.users (Supabase managed - cloud or local)
    │
    │ verifyOtp succeeds
    ▼
app/auth/confirm/route.ts
    │
    │ upsert profile (onConflictDoNothing)
    ▼
public.profiles (our schema - local or cloud DB)
    │
    │ FK constraints
    ▼
public.goals, public.check_ins, etc.
```

**Why App-Level Instead of Trigger:**
- Database trigger requires auth.users and profiles in same database
- Local dev uses separate Postgres container from Supabase Auth
- App-level approach works in ALL environments
- Simpler to test and debug

**Middleware Pattern:**
```typescript
// middleware.ts at project root
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Check session, redirect to /auth/login if not authenticated
  // For /protected/* routes only
}

export const config = {
  matcher: ['/protected/:path*'],
};
```

## Implementation Plan

### Tasks

#### Phase 1: Remove Password-Based Auth (Clean Up)

- [x] **Task 1: Delete password-related pages**
  - Files to delete:
    - `resolution-tracker/app/auth/sign-up/page.tsx`
    - `resolution-tracker/app/auth/sign-up-success/page.tsx`
    - `resolution-tracker/app/auth/forgot-password/page.tsx`
    - `resolution-tracker/app/auth/update-password/page.tsx`
  - Action: Delete these files and their parent directories if empty
  - Notes: These pages are for password flows we're removing

- [x] **Task 2: Delete password-related form components**
  - Files to delete:
    - `resolution-tracker/components/sign-up-form.tsx`
    - `resolution-tracker/components/forgot-password-form.tsx`
    - `resolution-tracker/components/update-password-form.tsx`
  - Action: Delete these files entirely
  - Notes: No other files import these components

#### Phase 2: Database Schema - Profiles Table

- [x] **Task 3: Add profiles table to schema**
  - File: `resolution-tracker/src/db/schema.ts`
  - Action: Add profiles table that references auth.users
  - Implementation (add before goals table):
    ```typescript
    // Profiles table - links auth.users to our public schema
    export const profiles = pgTable('profiles', {
      id: uuid('id').primaryKey(), // matches auth.users.id, NOT defaultRandom()
      email: text('email'),
      createdAt: timestamp('created_at').notNull().defaultNow(),
      updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
    });

    // Type exports
    export type Profile = typeof profiles.$inferSelect;
    export type NewProfile = typeof profiles.$inferInsert;
    ```
  - Notes: The `id` field must NOT have `defaultRandom()` - it must match the auth.users.id

- [x] **Task 4: Add FK constraints to existing tables**
  - File: `resolution-tracker/src/db/schema.ts`
  - Action: Update goals, checkIns, userSummaries, integrations to reference profiles
  - Changes for each table's userId field:
    ```typescript
    // Before:
    userId: uuid('user_id').notNull(),

    // After:
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    ```
  - Tables to update:
    - `goals` - add `.references(() => profiles.id, { onDelete: 'cascade' })`
    - `checkIns` - add `.references(() => profiles.id, { onDelete: 'cascade' })`
    - `userSummaries` - add `.references(() => profiles.id, { onDelete: 'cascade' })`
    - `integrations` - add `.references(() => profiles.id, { onDelete: 'cascade' })`
  - Notes: Using `onDelete: 'cascade'` so if profile is deleted, all related data is cleaned up

- [x] **Task 5: Generate and run Drizzle migration**
  - Location: `resolution-tracker/`
  - Commands:
    ```bash
    npm run db:generate
    npm run db:migrate
    ```
  - Action: Generate migration for profiles table and FK constraints
  - Notes: Run AFTER Task 3 and Task 4 are complete

- [x] **Task 6: Update seed script for profiles**
  - File: `resolution-tracker/src/db/seed.ts`
  - Action: Add profile creation before seeding other data
  - Changes:
    ```typescript
    // Add import
    import { profiles } from './schema';

    // Add to seed function, before goals seeding:
    // Clear profiles (after clearing other tables due to FK constraints)
    await db.delete(profiles);

    // Create test profile
    await db.insert(profiles).values({
      id: testUserId,
      email: 'test@example.com',
    });
    console.log('✓ Created test profile');
    ```
  - Notes: The seed must create a profile BEFORE creating goals/check-ins that reference it

#### Phase 3: Implement Magic Link Auth

- [x] **Task 7: Convert login form to magic link**
  - File: `resolution-tracker/components/login-form.tsx`
  - Action: Replace password-based login with magic link flow
  - Changes:
    - Remove password state and input field
    - Remove "Forgot password?" link
    - Change `signInWithPassword` to `signInWithOtp({ email, options: { emailRedirectTo: '${origin}/auth/confirm' } })`
    - On success, redirect to `/auth/check-email` instead of `/protected`
    - Update card title/description for magic link flow
    - Remove sign-up link at bottom
  - Implementation:
    ```typescript
    "use client";

    import { cn } from "@/lib/utils";
    import { createClient } from "@/lib/supabase/client";
    import { Button } from "@/components/ui/button";
    import {
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
    } from "@/components/ui/card";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
    import { useRouter } from "next/navigation";
    import { useState } from "react";

    export function LoginForm({
      className,
      ...props
    }: React.ComponentPropsWithoutRef<"div">) {
      const [email, setEmail] = useState("");
      const [error, setError] = useState<string | null>(null);
      const [isLoading, setIsLoading] = useState(false);
      const router = useRouter();

      const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const supabase = createClient();
        setIsLoading(true);
        setError(null);

        try {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/confirm`,
            },
          });
          if (error) throw error;
          router.push("/auth/check-email");
        } catch (error: unknown) {
          setError(error instanceof Error ? error.message : "An error occurred");
        } finally {
          setIsLoading(false);
        }
      };

      return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>
                Enter your email to receive a magic link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending link..." : "Send magic link"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }
    ```

- [x] **Task 8: Create check-email confirmation page**
  - File: `resolution-tracker/app/auth/check-email/page.tsx` (NEW)
  - Action: Create a simple confirmation page shown after magic link request
  - Content:
    ```typescript
    import {
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
    } from "@/components/ui/card";

    export default function CheckEmailPage() {
      return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Check your email</CardTitle>
                <CardDescription>
                  We sent you a magic link to sign in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to sign in to your account.
                  The link will expire in 1 hour.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    ```

- [x] **Task 9: Update auth-button component**
  - File: `resolution-tracker/components/auth-button.tsx`
  - Action: Remove "Sign up" button, keep only "Sign in"
  - Change from:
    ```typescript
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
    ```
  - Change to:
    ```typescript
    <Button asChild size="sm" variant={"default"}>
      <Link href="/auth/login">Sign in</Link>
    </Button>
    ```

#### Phase 4: Add Route Protection & Profile Creation

- [x] **Task 10: Create middleware for route protection**
  - File: `resolution-tracker/middleware.ts` (NEW)
  - Action: Create Next.js middleware to protect `/protected/*` routes
  - Implementation:
    ```typescript
    import { createServerClient } from "@supabase/ssr";
    import { NextResponse, type NextRequest } from "next/server";

    export async function middleware(request: NextRequest) {
      let supabaseResponse = NextResponse.next({
        request,
      });

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              supabaseResponse = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user && request.nextUrl.pathname.startsWith("/protected")) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        return NextResponse.redirect(url);
      }

      return supabaseResponse;
    }

    export const config = {
      matcher: ["/protected/:path*"],
    };
    ```

- [x] **Task 11: Update confirm route with profile upsert**
  - File: `resolution-tracker/app/auth/confirm/route.ts`
  - Action: Add profile creation after successful auth verification
  - Full implementation:
    ```typescript
    import { createClient } from "@/lib/supabase/server";
    import { db } from "@/db";
    import { profiles } from "@/db/schema";
    import { type EmailOtpType } from "@supabase/supabase-js";
    import { redirect } from "next/navigation";
    import { type NextRequest } from "next/server";

    export async function GET(request: NextRequest) {
      const { searchParams } = new URL(request.url);
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const next = searchParams.get("next") ?? "/protected";

      if (token_hash && type) {
        const supabase = await createClient();

        const { error } = await supabase.auth.verifyOtp({
          type,
          token_hash,
        });

        if (!error) {
          // Get the authenticated user
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            // Upsert profile - create if not exists, do nothing if exists
            await db
              .insert(profiles)
              .values({
                id: user.id,
                email: user.email,
              })
              .onConflictDoNothing();
          }

          // redirect user to specified redirect URL or protected area
          redirect(next);
        } else {
          // redirect the user to an error page with some instructions
          redirect(`/auth/error?error=${error?.message}`);
        }
      }

      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=No token hash or type`);
    }
    ```
  - Notes:
    - Uses `onConflictDoNothing()` so existing profiles aren't modified
    - Handles both new users and returning users
    - Works with local Postgres and production Supabase

#### Phase 5: Update Documentation

- [x] **Task 12: Update architecture.md**
  - File: `_bmad-output/planning-artifacts/architecture.md`
  - Action: Replace all references to `(dashboard)/` with `/protected` and add profiles table to data model
  - Changes:
    - Decision 2 (Data Model): Add profiles table to entities table
    - Decision 4: Update route group reference
    - Project Structure section: Update directory tree
    - Feature to Structure Mapping: Update Auth row
  - Add to Data Model section:
    ```markdown
    | `profiles` | Links auth.users to public schema | id (matches auth.users.id), email, created_at |
    ```

- [x] **Task 13: Update project-context.md**
  - File: `_bmad-output/project-context.md`
  - Action: Update Auth Rules section and add profiles info
  - Change Auth Rules to:
    ```markdown
    ### Auth Rules

    - Supabase Auth with magic links only (no passwords)
    - Protected routes under `/protected/*`
    - Auth check in `middleware.ts` (redirects to `/auth/login`)
    - Local dev uses real Supabase auth (no mocking)
    - Profiles created via app-level upsert in auth confirm route
    - All user data tables have FK to profiles.id with cascade delete
    ```

#### Phase 6: Verification

- [x] **Task 14: Verify build passes**
  - Command: `npm run build` in `resolution-tracker/`
  - Action: Ensure no TypeScript errors from removed files or schema changes
  - Notes: If imports to deleted files exist, they'll surface here

- [x] **Task 15: Manual auth flow test**
  - Action: Test complete magic link flow with profile creation
  - Steps:
    1. Navigate to `/auth/login`
    2. Enter a NEW email (not previously used), submit
    3. Verify redirect to `/auth/check-email`
    4. Check email for magic link
    5. Click link, verify redirect to `/protected`
    6. Verify user details displayed
    7. **Check database**: Verify profile was created in `profiles` table
    8. Click logout, verify redirect to `/auth/login`
    9. Try accessing `/protected` directly, verify redirect to `/auth/login`
    10. **Test returning user**: Login again with same email, verify no duplicate profile error

### Acceptance Criteria

#### Profiles & Database
- [x] **AC1:** Given the schema is updated, when I inspect the database, then I see a `profiles` table with columns: id, email, created_at, updated_at
- [x] **AC2:** Given the schema is updated, when I inspect the `goals` table, then the `user_id` column has a foreign key constraint to `profiles.id`
- [x] **AC3:** Given a new user signs up via magic link, when the auth completes, then a profile record is automatically created in the `profiles` table with matching id and email
- [x] **AC4:** Given an existing user signs in via magic link, when the auth completes, then no duplicate profile is created (upsert behavior)

#### Magic Link Flow
- [x] **AC5:** Given a user on `/auth/login`, when they enter their email and click "Send magic link", then they are redirected to `/auth/check-email` and receive an email with a login link
- [x] **AC6:** Given a user clicks the magic link in their email, when the link is valid, then they are redirected to `/protected` and see their user details
- [x] **AC7:** Given a user clicks an expired or invalid magic link, when verification fails, then they are redirected to `/auth/error` with an error message

#### Route Protection
- [x] **AC8:** Given an unauthenticated user, when they navigate to `/protected`, then they are redirected to `/auth/login`
- [x] **AC9:** Given an authenticated user, when they navigate to `/protected`, then they see the protected page content

#### Password Auth Removal
- [x] **AC10:** Given the updated codebase, when a user navigates to `/auth/sign-up`, then they receive a 404 error
- [x] **AC11:** Given the updated codebase, when a user navigates to `/auth/forgot-password`, then they receive a 404 error
- [x] **AC12:** Given the login page, when rendered, then there is no password field and no "Sign up" link

#### Logout
- [x] **AC13:** Given an authenticated user on `/protected`, when they click "Logout", then they are signed out and redirected to `/auth/login`

#### Build
- [x] **AC14:** Given all changes are complete, when `npm run build` is run, then the build completes with no errors

## Additional Context

### Dependencies

**External Services:**
- Supabase project with Auth enabled
- Supabase email templates configured (uses defaults for magic link)
- Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `DATABASE_URL` (for Drizzle - local or Supabase)

**NPM Packages (already installed):**
- `@supabase/ssr` - SSR client for Next.js
- `@supabase/supabase-js` - Supabase client
- `drizzle-orm` - Database ORM
- `drizzle-kit` - Migration tooling

**Supabase Dashboard Configuration:**
- Ensure "Magic Link" is enabled in Authentication > Providers > Email
- Add `http://localhost:3000/auth/confirm` to Redirect URLs (for local dev)
- Add production URL to Redirect URLs when deploying

### Testing Strategy

**Manual Testing (Primary for MVP):**
1. Test new user profile creation: new signup → check profiles table has record
2. Test returning user: login again → no duplicate profile error
3. Test happy path: email → magic link → authenticated
4. Test protection: access `/protected` without auth → redirected
5. Test logout: click logout → redirected to login
6. Test error handling: use invalid/expired link → error page
7. Test FK constraints: verify goals.user_id references profiles.id

**Database Verification:**
```sql
-- Check profiles table exists
SELECT * FROM profiles;

-- Check FK constraints exist
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'profiles';
```

**Unit Tests (Optional - can add later):**
- `login-form.test.tsx`: Mock Supabase client, verify `signInWithOtp` called
- `middleware.test.ts`: Mock auth state, verify redirect logic

**Integration Tests (Future):**
- E2E test with Playwright using Supabase test user

### Notes

**App-Level Profile Creation Benefits:**
- Works in ALL environments (local dev, staging, production)
- No database trigger required (simpler setup)
- Easy to test and debug
- Uses `onConflictDoNothing()` for idempotent upserts

**Migration Order:**
1. Run Drizzle migration (creates profiles table + FK constraints)
2. Test with new signup - profile should be created automatically

**Supabase Email Delivery:**
- In development, Supabase may rate-limit emails
- Check Supabase dashboard > Authentication > Users to see if user was created
- Check spam folder for magic link emails
- Consider using Supabase's built-in email testing tools

**Known Limitations:**
- Magic link expires in 1 hour (Supabase default)
- No "remember me" functionality (session lasts until browser close or explicit logout)
- Email template uses Supabase defaults (customization out of scope)
- Deleting user from Supabase Auth doesn't auto-delete profile (manual cleanup required)

**Security Considerations:**
- Magic links are single-use (handled by Supabase)
- Session cookies are httpOnly (handled by @supabase/ssr)
- PKCE flow used automatically by Supabase for magic links
- FK cascade delete ensures no orphan data when profile is deleted

**Future Considerations (Out of Scope):**
- Custom email templates with branding
- Session timeout/refresh logic
- "Remember this device" functionality
- Social auth providers (Google, GitHub)
- Profile management UI (name, avatar, preferences)
- Cleanup job for orphaned profiles when auth user is deleted

---

## Review Notes

**Adversarial Review Completed:** 2026-01-13

**Findings:** 10 total, 4 fixed, 6 deferred

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| F1 | High | Fixed | Added error handling for profile upsert in confirm route |
| F2 | Medium | Verified | Link import removal confirmed clean |
| F3 | High | Fixed | Removed seed data from migration, cleared DB |
| F4 | Medium | Fixed | Seed script delete order corrected |
| F5 | Low | Deferred | Loading feedback on check-email page (future enhancement) |
| F6 | Medium | Deferred | Unit tests for auth logic (separate task) |
| F7 | Low | Fixed | Updated architecture.md proxy.ts reference |
| F8 | Medium | Deferred | Server-side email validation (Supabase handles) |
| F9 | Low | Deferred | Manual test documentation |
| F10 | Medium | Deferred | Rate limiting (Supabase has built-in limits) |

**Resolution Approach:** Selective fix of High/Medium issues
