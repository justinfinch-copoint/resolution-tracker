import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// F5: Validate DATABASE_URL with helpful error message
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Please check your .env.local file or environment configuration.'
  );
}

// F11: Configure connection pool for serverless environments
const client = postgres(connectionString, {
  max: 10, // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
});

export const db = drizzle(client, { schema });
export * from './schema';
