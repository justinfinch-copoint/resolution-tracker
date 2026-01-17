# Deployment Runbook: Vercel + Supabase

**Project:** Resolution Tracker
**Created:** 2026-01-17
**Related Tech-Spec:** `tech-spec-vercel-supabase-deployment.md`

---

## Prerequisites

Before starting, ensure you have:

- [ ] Supabase project created and accessible
- [ ] GitHub repository with the Resolution Tracker code
- [ ] Vercel account
- [ ] Anthropic API key for Claude

---

## Step 1: Get Supabase Connection String

**Goal:** Retrieve the Postgres connection string for migrations and app runtime.

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Select **Mode: Transaction** (important for serverless)
6. Copy the **URI** connection string

**Expected format:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Save this value** - you'll need it for Steps 2 and 4.

---

## Step 2: Add DATABASE_URL to GitHub Secrets

**Goal:** Configure the database connection for GitHub Actions migrations.

1. Go to your GitHub repository: https://github.com/YOUR_USERNAME/resolution-tracker
2. Click **Settings** (top nav)
3. In left sidebar: **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Fill in:
   - **Name:** `DATABASE_URL`
   - **Secret:** [paste connection string from Step 1]
6. Click **Add secret**

**Verification:** You should see `DATABASE_URL` listed under Repository secrets.

---

## Step 3: Create Vercel Project

**Goal:** Set up Vercel deployment connected to your GitHub repo.

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Click **Import Git Repository**
4. Find and select `resolution-tracker` repository
5. **IMPORTANT - Configure these settings:**

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js (auto-detected) |
| **Root Directory** | `resolution-tracker` |
| Build Command | `npm run build` (default) |
| Output Directory | `.next` (default) |

6. **Do NOT click Deploy yet** - we need to add env vars first
7. Click **Environment Variables** to expand that section
8. Continue to Step 4 before deploying

---

## Step 4: Configure Vercel Environment Variables

**Goal:** Add all required environment variables for production.

Still in the Vercel project setup (or go to **Settings** → **Environment Variables** if already created):

Add each variable below. Set **Environment** to `Production` for all:

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `DATABASE_URL` | Connection string from Step 1 | Step 1 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[project-ref].supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your anon/public key | Supabase → Settings → API |
| `ANTHROPIC_API_KEY` | Your Claude API key | https://console.anthropic.com |
| `DEFAULT_PROTECTED_PAGE` | `/chat` | Static value |

**After adding all variables:**
- If setting up new project: Click **Deploy**
- If project exists: Go to **Deployments** → **Redeploy** (with "Use existing build cache" unchecked)

**Note the deployment URL** (e.g., `resolution-tracker-abc123.vercel.app`) - you'll need it for Step 5.

---

## Step 5: Configure Supabase Auth Redirect URLs

**Goal:** Allow Supabase to redirect users back to your production app after magic link auth.

1. Go to Supabase dashboard → your project
2. Navigate to **Authentication** → **URL Configuration**
3. Update **Site URL**:
   ```
   https://[your-vercel-domain].vercel.app
   ```
4. Add to **Redirect URLs** (click Add URL for each):
   ```
   https://[your-vercel-domain].vercel.app/auth/confirm
   ```
   ```
   https://[your-vercel-domain].vercel.app/**
   ```
5. Click **Save**

**Example:** If your Vercel URL is `resolution-tracker-abc123.vercel.app`:
- Site URL: `https://resolution-tracker-abc123.vercel.app`
- Redirect URLs:
  - `https://resolution-tracker-abc123.vercel.app/auth/confirm`
  - `https://resolution-tracker-abc123.vercel.app/**`

---

## Step 6: Verify Deployment

**Goal:** Confirm everything is working end-to-end.

### 6a. Check GitHub Actions

1. Go to your GitHub repo → **Actions** tab
2. Find the most recent workflow run on `main`
3. Verify:
   - [ ] `build` job passed
   - [ ] `migrate` job passed (if code change was pushed)

### 6b. Check Vercel Deployment

1. Go to Vercel dashboard → your project → **Deployments**
2. Verify the latest deployment shows **Ready** (green checkmark)
3. Click the deployment URL to open your app

### 6c. Test Authentication Flow

1. Visit your production URL
2. Click to sign in
3. Enter your email address
4. Click **Send Magic Link**
5. Check your email for the magic link
6. Click the link
7. Verify:
   - [ ] You're redirected to the app (not an error page)
   - [ ] You land on `/chat` after authentication
   - [ ] The app loads without errors

### 6d. Test Database Connectivity

1. While logged in, navigate to Goals
2. Try creating a goal
3. Verify the goal appears (proves DB write works)
4. Refresh the page
5. Verify the goal persists (proves DB read works)

---

## Troubleshooting

### Magic link redirects to localhost
- **Cause:** Supabase redirect URLs not configured
- **Fix:** Complete Step 5, ensure URLs match your Vercel domain exactly

### "Invalid API key" or AI features not working
- **Cause:** `ANTHROPIC_API_KEY` not set or invalid
- **Fix:** Verify the key in Vercel env vars, ensure no extra spaces

### Database connection errors
- **Cause:** `DATABASE_URL` incorrect or using wrong mode
- **Fix:** Ensure you're using Transaction mode (port 6543), not Session mode

### Migrations not running
- **Cause:** `DATABASE_URL` GitHub secret not set
- **Fix:** Complete Step 2, verify secret name is exactly `DATABASE_URL`

### Build fails on Vercel
- **Cause:** Missing env vars or wrong root directory
- **Fix:** Verify Root Directory is `resolution-tracker`, all env vars are set

---

## Quick Reference

| Service | Dashboard URL |
|---------|---------------|
| Supabase | https://supabase.com/dashboard |
| Vercel | https://vercel.com/dashboard |
| GitHub Actions | https://github.com/YOUR_USERNAME/resolution-tracker/actions |
| Anthropic | https://console.anthropic.com |

---

**Runbook complete.** After following all steps, your Resolution Tracker should be live at your Vercel URL.
