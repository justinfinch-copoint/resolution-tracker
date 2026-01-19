// Agent orchestration types
export type {
  AgentId,
  AgentState,
  AgentConfig,
  HandoffResult,
  AgentResponse,
  SessionMessage,
  AgentTransition,
  WorkingContext,
  LongTermMemory,
  MessageScopingConfig,
} from './types';

export { AGENT_IDS } from './types';

// Re-export scoping configs for agent context building
export { DEFAULT_SCOPING_CONFIGS } from './memory';

// Re-export memory services for convenience
export {
  // Session state
  getOrCreateSession,
  getSession,
  getSessionByUserId,
  updateActiveAgent,
  addMessage,
  recordTransition,
  clearSession,
  // Working context
  assembleWorkingContext,
  selectMessages,
  buildContextInjection,
  getExpertiseModules,
  // Long-term memory
  fetchLongTermMemory,
  getUserProfile,
  getGoalsSummary,
  getEngagementContext,
  ProfileNotFoundError,
} from './memory';

// Re-export service result types
export type { ServiceResult } from './memory';
export type { WorkingContextResult, LongTermMemoryResult } from './memory';
