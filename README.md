# Resolution Tracker

An AI-powered goal tracking app that helps users stay accountable to their New Year's resolutions through conversational check-ins.

## Project Structure

```
resolution-tracker/
├── resolution-tracker/     # Next.js application
│   ├── app/                # Routes and pages
│   ├── components/         # UI components (shadcn/ui)
│   ├── src/
│   │   ├── db/             # Drizzle schema and migrations
│   │   ├── features/       # Domain logic (goals, check-ins, ai-coach)
│   │   ├── shared/         # Cross-cutting concerns
│   │   └── lib/            # Pure utilities
│   └── drizzle/            # Database migrations
├── _bmad-output/           # Planning artifacts and tech specs
└── .github/workflows/      # CI/CD configuration
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL via Supabase
- **ORM:** Drizzle
- **Auth:** Supabase Auth (magic links)
- **AI:** Vercel AI SDK with Claude
- **Styling:** Tailwind CSS + shadcn/ui

## Getting Started

```bash
cd resolution-tracker
npm install
```

### Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure your environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable/anon key
- `ANTHROPIC_API_KEY` - Claude API key

### Supabase Authentication Setup

This app uses **magic link (passwordless) authentication** via Supabase. Follow these steps to configure it:

#### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project" and fill in:
   - Project name: `resolution-tracker` (or your preference)
   - Database password: Generate a strong password (save this)
   - Region: Choose closest to your users
3. Wait for the project to finish provisioning (~2 minutes)

#### 2. Get Your API Keys

1. In your Supabase dashboard, go to **Settings > API**
2. Copy these values to your `.env.local`:

```bash
# From "Project URL"
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# From "anon public" or "publishable" key (safe to expose in browser)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Enable Magic Link Authentication

1. Go to **Authentication > Providers**
2. Under **Email**, ensure it's enabled
3. Verify these settings:
   - **Enable Email provider**: ON
   - **Confirm email**: ON (recommended) or OFF for faster dev testing
   - **Secure email change**: ON

#### 4. Configure Redirect URLs

1. Go to **Authentication > URL Configuration**
2. Add these to **Redirect URLs**:

```
# Local development
http://localhost:3000/auth/confirm

# Production (add when deploying)
https://your-domain.com/auth/confirm
```

#### 5. (Optional) Customize Email Templates

1. Go to **Authentication > Email Templates**
2. Select "Magic Link" template
3. Customize the email content and branding as needed

#### Environment Variables Summary

| Variable | Where to Find | Description |
|----------|---------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings > API > Project URL | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Settings > API > anon/publishable | Public key for browser client |
| `DATABASE_URL` | Settings > Database > Connection string | For Drizzle ORM (use "URI" format) |

**Note:** For local development with the devcontainer, `DATABASE_URL` points to the local Postgres container (`postgresql://postgres:postgres@db:5432/ResolutionTracker`). The Supabase URL/key are still needed for authentication.

#### Testing Authentication

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/auth/login`
3. Enter your email and click "Send magic link"
4. Check your email (or Supabase dashboard > Authentication > Users for the link)
5. Click the magic link to authenticate
6. You should be redirected to `/chat`

### Anthropic API Setup

The AI coach feature uses Claude via the Anthropic API. Follow these steps to get your API key:

#### 1. Create an Anthropic Account

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up for an account (or sign in if you already have one)
3. Complete any required verification steps

#### 2. Get Your API Key

1. In the Anthropic Console, go to **API Keys** (or click "Get API Keys")
2. Click **Create Key**
3. Give your key a name (e.g., "resolution-tracker-dev")
4. Copy the key immediately - it won't be shown again!
5. Add it to your `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

#### 3. (Optional) Configure Model

By default, the app uses `claude-sonnet-4-20250514`. You can override this:

```bash
# Optional: Use a different Claude model
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

#### API Key Security

- **Never commit your API key** - It's already in `.gitignore` via `.env.local`
- **Set usage limits** - In the Anthropic Console, set spend limits to avoid unexpected charges
- **Rotate keys periodically** - Create new keys and delete old ones regularly

#### Pricing Note

Anthropic charges based on token usage. For development and light usage, costs are typically minimal. Check [anthropic.com/pricing](https://www.anthropic.com/pricing) for current rates.

### Database

```bash
npm run db:migrate    # Run migrations
npm run db:seed       # Seed test data (dev only)
npm run db:studio     # Open Drizzle Studio
```

### Development

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # Run ESLint
```

## Architecture

The app follows **DDD + Vertical Slice** architecture:

- **Features own their logic** - Each feature (goals, check-ins, ai-coach) contains its own types, actions, queries, and components
- **Thin API routes** - Routes validate input, delegate to features, return responses
- **No cross-feature imports** - Shared code lives in `shared/`

See `_bmad-output/planning-artifacts/architecture.md` for full details.

## License

Private project.
