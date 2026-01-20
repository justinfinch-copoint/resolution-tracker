/**
 * Shared Agent Modules
 *
 * Re-export shared modules used across multiple agents.
 */

export { BASE_PERSONA_MODULE } from './base-persona';

// Tool result types (shared between coach and goal-architect)
export type {
  CreateGoalResult,
  UpdateGoalResult,
  PauseResumeGoalResult,
  MarkGoalCompleteResult,
  RecordCheckInResult,
  UpdateGoalSentimentResult,
  CompleteMilestoneResult,
  AddMilestoneResult,
  AddImplementationIntentionResult,
  UpdateSummaryResult,
} from './tool-result-types';
