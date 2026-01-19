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
} from './long-term';

// Types
export * from './types';
