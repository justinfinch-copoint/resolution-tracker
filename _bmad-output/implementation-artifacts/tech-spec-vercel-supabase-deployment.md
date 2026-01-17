---
title: 'Vercel and Supabase Deployment Setup'
slug: 'vercel-supabase-deployment'
created: '2026-01-17'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Vercel (hosting)
  - Supabase (database + auth)
  - GitHub Actions (CI/CD)
  - Drizzle ORM (migrations)
  - Next.js 16 (App Router)
  - Node.js 20
files_to_modify:
  - .github/workflows/ci.yml
related_docs:
  - deployment-runbook-vercel-supabase.md
code_patterns:
  - Nested project structure (app in resolution-tracker/ subdirectory)
  - Drizzle migrations via npm run db:migrate
  - DATABASE_URL env var required for migrations
  - Magic link auth with window.location.origin redirect
test_patterns: []
---

# Tech-Spec: Vercel and Supabase Deployment Setup

**Created:** 2026-01-17

## Overview

### Problem Statement

The Resolution Tracker application is fully developed locally but has no production deployment, CI/CD pipeline, or production database configuration. Users cannot access the app in production.

### Solution

Configure Vercel deployment with Supabase as the production database, create a GitHub Action for automated Drizzle migrations on push to main, and document auth redirect configuration.

### Scope

**In Scope:**
- Vercel project setup and GitHub integration
- Environment variables configuration in Vercel dashboard
- GitHub Action for automated Drizzle migrations on push to main
- `DATABASE_URL` as GitHub repository secret
- Supabase Auth redirect URL configuration (documented steps)
- Deployment verification

**Out of Scope:**
- Custom domain setup (using default `*.vercel.app` for now)
- Preview environment database isolation
- Monitoring/alerting setup
- Rollback procedures

## Context for Development

### Codebase Patterns

- **Project Structure:** Next.js app lives in `resolution-tracker/` subdirectory (not repo root)
- **Database:** Drizzle ORM with migrations in `resolution-tracker/drizzle/migrations/`
- **Migration commands:** `npm run db:migrate` (requires `DATABASE_URL` env var)
- **Auth:** Supabase magic link with redirect to `${origin}/auth/confirm`
- **Existing CI:** `.github/workflows/ci.yml` with build/lint/type-check (no migrations yet)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.github/workflows/ci.yml` | Existing CI workflow - ADD migration step here |
| `deployment-runbook-vercel-supabase.md` | Step-by-step manual configuration guide |
| `resolution-tracker/drizzle.config.ts` | Drizzle config - reads DATABASE_URL, throws if missing |
| `resolution-tracker/package.json` | Contains `db:migrate` script |
| `resolution-tracker/.env.example` | Documents required env vars |

### Technical Decisions

- **Migration strategy:** Drizzle migrations via `npm run db:migrate`
- **CI/CD approach:** Extend existing `ci.yml` with migration step (main branch only)
- **Secrets management:**
  - GitHub Secrets: `DATABASE_URL` (for migrations)
  - Vercel Env Vars: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `DEFAULT_PROTECTED_PAGE`
- **Auth redirect:** Supabase dashboard needs production URL in redirect allowlist

## Implementation Plan

### Deployment Runbook (Manual Steps)

All manual configuration steps are documented in a separate runbook:

**`deployment-runbook-vercel-supabase.md`**

Follow the runbook in order:
1. Get Supabase Connection String
2. Add DATABASE_URL to GitHub Secrets
3. Create Vercel Project
4. Configure Vercel Environment Variables
5. Configure Supabase Auth Redirect URLs
6. Verify Deployment

---

### Code Change Tasks

#### Task 1: Update CI Workflow for Automated Migrations

- **File:** `.github/workflows/ci.yml`
- **Action:** Add a `migrate` job that runs only on push to main (not PRs)
- **Insert after the existing `build` job:**

```yaml
  migrate:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: resolution-tracker/package-lock.json

      - name: Install dependencies
        working-directory: resolution-tracker
        run: npm ci

      - name: Run migrations
        working-directory: resolution-tracker
        run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

- **Key Details:**
  - `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` - Only runs on push to main, not PRs
  - Runs in parallel with `build` job (no `needs:` dependency)
  - Uses `secrets.DATABASE_URL` (configured via runbook Step 2)

---

### Acceptance Criteria

- [ ] **AC1:** Given the CI workflow is updated, when a commit is pushed to main, then the migration job runs and applies pending migrations to Supabase
- [ ] **AC2:** Given the CI workflow is updated, when a PR is opened against main, then the migration job does NOT run (only build/lint/type-check)
- [ ] **AC3:** Given Vercel is configured, when a commit is pushed to main, then Vercel auto-deploys the application
- [ ] **AC4:** Given all env vars are configured, when the app is deployed, then it connects to Supabase database successfully
- [ ] **AC5:** Given Supabase redirect URLs are configured, when a user requests a magic link, then they receive an email with a valid link
- [ ] **AC6:** Given a valid magic link, when the user clicks it, then they are redirected to the production app and authenticated
- [ ] **AC7:** Given the user is authenticated, when the auth flow completes, then they are redirected to `/chat`

---

## Additional Context

### Dependencies

- **Supabase Project:** Existing project with auth enabled (confirmed by user)
- **GitHub Repository:** `resolution-tracker` repo with existing CI workflow
- **Anthropic API Key:** Valid API key for Claude (confirmed by user)
- **Vercel Account:** Account with ability to create new projects

### Testing Strategy

**Manual Verification (no automated tests for infrastructure):**

1. **CI Pipeline Test:**
   - Push to a feature branch → verify migrations do NOT run
   - Merge to main → verify migrations DO run
   - Check GitHub Actions logs for successful migration output

2. **Deployment Test:**
   - Verify Vercel deployment completes without errors
   - Check Vercel function logs for any runtime errors

3. **End-to-End Auth Test:**
   - Visit production URL
   - Enter email on login page
   - Receive magic link email
   - Click link → verify redirect to app
   - Verify authenticated state

4. **Database Connectivity Test:**
   - After login, verify goals/check-ins load (proves DB connection works)

### Notes

- **Sequential Execution:** Migrations run after the build job passes, ensuring code quality gates are met before schema changes. Vercel deployment runs independently but migrations are typically fast (~seconds).
- **No Rollback:** Out of scope for MVP. If a migration fails, manually fix and re-push.
- **Preview Environments:** Vercel preview deployments will use the same production database. Database isolation for previews is out of scope.
- **Connection Pooling:** Use Supabase's Transaction mode connection string for serverless compatibility (avoids connection exhaustion).

---

## Review Notes

- Adversarial review completed
- Findings: 13 total, 3 fixed, 10 skipped (noise/out-of-scope/undecided)
- Resolution approach: auto-fix
- Fixes applied:
  - F1: Added concurrency controls (`group: db-migrations`, `cancel-in-progress: false`)
  - F2: Added `needs: build` dependency (migrations only run after build passes)
  - F4: Added `timeout-minutes: 5` (prevents indefinite hangs)
