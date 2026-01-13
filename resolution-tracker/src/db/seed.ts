import { db, goals, checkIns, userSummaries, profiles } from './index';

// F4: Safety check to prevent accidental production data deletion
function validateEnvironment() {
  const dbUrl = process.env.DATABASE_URL || '';
  const nodeEnv = process.env.NODE_ENV;

  // Check if this looks like a production database
  const isProduction = nodeEnv === 'production' ||
    dbUrl.includes('supabase.co') ||
    dbUrl.includes('neon.tech') ||
    dbUrl.includes('railway.app') ||
    (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1') && !dbUrl.includes('@db:'));

  if (isProduction) {
    console.error('ERROR: Seed script cannot run against production database!');
    console.error('DATABASE_URL appears to point to a production environment.');
    console.error('If you really want to seed production, set SEED_PRODUCTION=true');

    if (process.env.SEED_PRODUCTION !== 'true') {
      process.exit(1);
    }

    console.warn('WARNING: SEED_PRODUCTION=true is set. Proceeding with caution...');
  }
}

async function seed() {
  validateEnvironment();

  console.log('Seeding database...');

  // For local development only - uses a fixed test user ID
  // In production, users are created through Supabase Auth
  const testUserId = '00000000-0000-0000-0000-000000000001';

  // Clear existing data (for reset)
  // Delete from leaf tables first for explicit control (profiles cascade would work too)
  await db.delete(checkIns);
  await db.delete(goals);
  await db.delete(userSummaries);
  await db.delete(profiles);

  // Create test profile first (FK constraint requires this)
  await db.insert(profiles).values({
    id: testUserId,
    email: 'test@example.com',
  });
  console.log('Created test profile');

  // Seed goals
  const [goal1, goal2] = await db.insert(goals).values([
    { userId: testUserId, title: 'Exercise 3x per week', status: 'active' },
    { userId: testUserId, title: 'Learn Spanish basics', status: 'active' },
  ]).returning();

  console.log(`Created ${2} goals`);

  // Seed check-ins
  await db.insert(checkIns).values([
    {
      userId: testUserId,
      goalId: goal1.id,
      content: 'Went to the gym today, felt great!',
      aiResponse: 'Nice work! Consistency is key. How are you feeling about tomorrow?'
    },
    {
      userId: testUserId,
      goalId: goal2.id,
      content: 'Did 10 minutes of Duolingo',
      aiResponse: '10 minutes is better than zero! What did you learn today?'
    },
  ]);

  console.log(`Created ${2} check-ins`);

  // Seed user summary
  await db.insert(userSummaries).values({
    userId: testUserId,
    summaryJson: {
      patterns: ['Mornings are hard', 'More motivated after work'],
      wins: ['Gym streak: 3 days'],
      struggles: ['Spanish consistency'],
    },
  });

  console.log(`Created user summary`);
  console.log('Seed complete!');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
