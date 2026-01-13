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
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `ANTHROPIC_API_KEY` - Claude API key

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
