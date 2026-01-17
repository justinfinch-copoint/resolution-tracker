export * from './types';
export * from './queries';

// Services layer - preferred API for external code
export {
  createIntentionService,
  updateIntentionService,
  toggleIntentionService,
  getIntentionService,
  listIntentionsService,
  deleteIntentionService,
} from './services';

/**
 * @deprecated Use services instead (e.g., createIntentionService).
 * Repository exports maintained for backward compatibility only.
 */
export {
  getIntentionsByGoalId,
  getIntentionById,
  createIntention,
  updateIntention,
  toggleIntentionActive,
  deleteIntention,
} from './repository';
