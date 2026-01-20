/**
 * Shared Tool Result Types
 *
 * Common result types used across agent tool implementations.
 * Consolidated to avoid duplication between coach and goal-architect tools.
 */

// Goal management result types
export type CreateGoalResult = {
  success: boolean;
  goalId?: string;
  message: string;
};

export type UpdateGoalResult = {
  success: boolean;
  message: string;
};

export type PauseResumeGoalResult = {
  success: boolean;
  goalId: string;
  message: string;
};

export type MarkGoalCompleteResult = {
  success: boolean;
  goalId: string;
  message: string;
};

// Check-in result types
export type RecordCheckInResult = {
  success: boolean;
  checkInId: string;
  message: string;
};

// Sentiment result types
export type UpdateGoalSentimentResult = {
  success: boolean;
  goalId: string;
  sentiment: string;
  message: string;
};

// Milestone result types
export type CompleteMilestoneResult = {
  success: boolean;
  milestoneId: string;
  message: string;
};

export type AddMilestoneResult = {
  success: boolean;
  milestoneId?: string;
  message: string;
};

// Implementation intention result types
export type AddImplementationIntentionResult = {
  success: boolean;
  intentionId?: string;
  message: string;
};

// User summary result types
export type UpdateSummaryResult = {
  success: boolean;
  message: string;
};
