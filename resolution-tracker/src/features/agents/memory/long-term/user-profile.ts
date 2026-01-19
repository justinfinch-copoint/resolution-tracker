import { db, profiles } from '@/src/db';
import { eq } from 'drizzle-orm';
import type { UserProfile } from '../types';

/**
 * Fetch user profile for context injection
 * Returns basic profile data (id, email, createdAt)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const [profile] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.id, userId));

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    createdAt: profile.createdAt.toISOString(),
  };
}
