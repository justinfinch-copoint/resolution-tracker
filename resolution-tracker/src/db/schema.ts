import { pgTable, uuid, text, timestamp, jsonb, index, pgEnum, integer, numeric, boolean, date } from 'drizzle-orm/pg-core';

// Enums for type safety
export const goalStatusEnum = pgEnum('goal_status', ['active', 'completed', 'paused', 'abandoned']);
export const goalTypeEnum = pgEnum('goal_type', ['habit', 'target', 'project']);
export const progressSentimentEnum = pgEnum('progress_sentiment', ['behind', 'on_track', 'ahead']);
export const habitCompletionStatusEnum = pgEnum('habit_completion_status', ['completed', 'skipped', 'missed']);
export const integrationTypeEnum = pgEnum('integration_type', ['notion', 'zapier']);
export const activeAgentEnum = pgEnum('active_agent', [
  'coach',
  'goalArchitect',
  'patternAnalyst',
  'motivator',
  'accountabilityPartner'
]);

// Profiles table - links auth.users to our public schema
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // matches auth.users.id, NOT defaultRandom()
  email: text('email'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

// Type definitions for JSONB columns
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

// Session message with agent attribution
export type SessionMessage = {
  role: 'user' | 'assistant';
  content: string;
  agentId?: typeof activeAgentEnum.enumValues[number];  // Which agent sent this (for assistant messages)
  timestamp: string; // ISO 8601
};

// Agent transition record
export type AgentTransition = {
  from: typeof activeAgentEnum.enumValues[number];
  to: typeof activeAgentEnum.enumValues[number];
  reason: string;
  timestamp: string; // ISO 8601
};

// Goals table - enhanced with goal types, motivation, and tracking fields
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  status: goalStatusEnum('status').notNull().default('active'),
  // Enhanced fields for research-backed goal setting
  goalType: goalTypeEnum('goal_type').notNull().default('habit'),
  successCriteria: text('success_criteria'),
  targetDate: timestamp('target_date'),
  whyItMatters: text('why_it_matters'),
  currentBaseline: text('current_baseline'),
  recoveryPlan: text('recovery_plan'),
  // Target type specific fields
  targetValue: numeric('target_value'),
  targetUnit: text('target_unit'),
  // Habit type specific fields
  frequencyPerWeek: integer('frequency_per_week'),
  // Progress tracking
  progressSentiment: progressSentimentEnum('progress_sentiment'),
  checkInCount: integer('check_in_count').notNull().default(0),
  lastCheckInAt: timestamp('last_check_in_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('goals_user_id_idx').on(table.userId),
  index('goals_status_idx').on(table.status),
  index('goals_goal_type_idx').on(table.goalType),
]);

// Milestones table - for breaking down goals into trackable sub-goals
export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  targetDate: timestamp('target_date'),
  sortOrder: integer('sort_order').notNull().default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('milestones_goal_id_idx').on(table.goalId),
]);

// Implementation intentions table - if-then planning for behavior change
export const implementationIntentions = pgTable('implementation_intentions', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  triggerCondition: text('trigger_condition').notNull(), // The "If..." part
  action: text('action').notNull(), // The "Then I will..." part
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('implementation_intentions_goal_id_idx').on(table.goalId),
]);

// Check-ins table - enhanced with structured progress fields
export const checkIns = pgTable('check_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }), // Now required
  content: text('content').notNull(),
  aiResponse: text('ai_response'),
  // Structured progress fields
  milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
  valueRecorded: numeric('value_recorded'), // For target progress
  habitCompletionStatus: habitCompletionStatusEnum('habit_completion_status'), // For habit tracking
  checkInDate: date('check_in_date').notNull().defaultNow(), // For habit day tracking
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('check_ins_user_id_idx').on(table.userId),
  index('check_ins_goal_id_idx').on(table.goalId),
  index('check_ins_milestone_id_idx').on(table.milestoneId),
  index('check_ins_check_in_date_idx').on(table.checkInDate),
]);

// User summaries table (AI context memory)
export const userSummaries = pgTable('user_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => profiles.id, { onDelete: 'cascade' }),
  summaryJson: jsonb('summary_json').$type<UserSummaryData>().notNull().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

// Integrations table
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type: integrationTypeEnum('type').notNull(),
  accessToken: text('access_token'),
  configJson: jsonb('config_json').$type<IntegrationConfig>().notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('integrations_user_id_idx').on(table.userId),
]);

// Conversation sessions table (multi-agent session state)
// Each user has exactly one active session (enforced by unique constraint)
export const conversationSessions = pgTable('conversation_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => profiles.id, { onDelete: 'cascade' }),
  activeAgent: activeAgentEnum('active_agent').notNull().default('coach'),
  messages: jsonb('messages').$type<SessionMessage[]>().notNull().default([]),
  agentTransitions: jsonb('agent_transitions').$type<AgentTransition[]>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  expiresAt: timestamp('expires_at'),
});

// Type exports for use in features
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type ImplementationIntention = typeof implementationIntentions.$inferSelect;
export type NewImplementationIntention = typeof implementationIntentions.$inferInsert;
export type CheckIn = typeof checkIns.$inferSelect;
export type NewCheckIn = typeof checkIns.$inferInsert;
export type UserSummary = typeof userSummaries.$inferSelect;
export type NewUserSummary = typeof userSummaries.$inferInsert;
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type ConversationSession = typeof conversationSessions.$inferSelect;
export type NewConversationSession = typeof conversationSessions.$inferInsert;

// Export enums for use in application code
export type GoalStatus = typeof goalStatusEnum.enumValues[number];
export type GoalType = typeof goalTypeEnum.enumValues[number];
export type ProgressSentiment = typeof progressSentimentEnum.enumValues[number];
export type HabitCompletionStatus = typeof habitCompletionStatusEnum.enumValues[number];
export type IntegrationType = typeof integrationTypeEnum.enumValues[number];
export type ActiveAgent = typeof activeAgentEnum.enumValues[number];
