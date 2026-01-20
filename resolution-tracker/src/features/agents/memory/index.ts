// Session state services
export {
  getOrCreateSession,
  getSession,
  getSessionByUserId,
  updateActiveAgent,
  addMessage,
  recordTransition,
  clearSession,
  type ServiceResult,
} from './session-state';

// Working context
export {
  assembleWorkingContext,
  selectMessages,
  buildContextInjection,
  getExpertiseModules,
  type WorkingContextResult,
} from './working-context';

// Long-term memory
export {
  fetchLongTermMemory,
  getUserProfile,
  getGoalsSummary,
  getEngagementContext,
  ProfileNotFoundError,
  type LongTermMemoryResult,
  // User summary functions (moved from ai-coach)
  getUserSummary,
  getUserSummaryData,
  upsertUserSummary,
  mergeUserSummary,
} from './long-term';

// Chat context (moved from ai-coach)
export { buildChatContext } from './chat-context';
export type { ChatContext, GoalType } from './chat-context';

// Types
export * from './types';
