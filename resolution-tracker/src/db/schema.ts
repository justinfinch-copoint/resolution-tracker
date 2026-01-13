import { pgTable, uuid, text, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';

// F6: Status enum for type safety
export const goalStatusEnum = pgEnum('goal_status', ['active', 'completed', 'paused', 'abandoned']);

// F13: Type definitions for JSONB columns
export type UserSummaryData = {
  patterns?: string[];
  wins?: string[];
  struggles?: string[];
  lastUpdated?: string;
};

export type IntegrationConfig = {
  webhookUrl?: string;
  syncEnabled?: boolean;
  lastSyncAt?: string;
  settings?: Record<string, unknown>;
};

// Goals table
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  status: goalStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  // F2: Indexes for query performance
  index('goals_user_id_idx').on(table.userId),
  index('goals_status_idx').on(table.status),
]);

// Check-ins table
export const checkIns = pgTable('check_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }), // F1: Foreign key
  content: text('content').notNull(),
  aiResponse: text('ai_response'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  // F2: Indexes for query performance
  index('check_ins_user_id_idx').on(table.userId),
  index('check_ins_goal_id_idx').on(table.goalId),
]);

// User summaries table (AI context memory)
export const userSummaries = pgTable('user_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  summaryJson: jsonb('summary_json').$type<UserSummaryData>().notNull().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

// Integration type enum for type safety
export const integrationTypeEnum = pgEnum('integration_type', ['notion', 'zapier']);

// Integrations table
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  type: integrationTypeEnum('type').notNull(),
  accessToken: text('access_token'),
  configJson: jsonb('config_json').$type<IntegrationConfig>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  // F2: Index for query performance
  index('integrations_user_id_idx').on(table.userId),
]);

// Type exports for use in features
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type CheckIn = typeof checkIns.$inferSelect;
export type NewCheckIn = typeof checkIns.$inferInsert;
export type UserSummary = typeof userSummaries.$inferSelect;
export type NewUserSummary = typeof userSummaries.$inferInsert; // F12: Missing insert type
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert; // F12: Missing insert type

// Export enums for use in application code
export type GoalStatus = typeof goalStatusEnum.enumValues[number];
export type IntegrationType = typeof integrationTypeEnum.enumValues[number];
