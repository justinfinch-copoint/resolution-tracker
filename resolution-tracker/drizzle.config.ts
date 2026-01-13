import { defineConfig } from 'drizzle-kit';

// F5: Validate DATABASE_URL at config load time
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL environment variable is required for migrations. ' +
    'Run with: DATABASE_URL=your-connection-string npm run db:migrate'
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
