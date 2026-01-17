export * from './types';
export * from './queries';

// Services layer - preferred API for external code
export {
  createMilestoneService,
  updateMilestoneService,
  completeMilestoneService,
  getMilestoneService,
  listMilestonesService,
  deleteMilestoneService,
} from './services';

/**
 * @deprecated Use services instead (e.g., createMilestoneService).
 * Repository exports maintained for backward compatibility only.
 */
export {
  getMilestonesByGoalId,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  completeMilestone,
  deleteMilestone,
  reorderMilestones,
} from './repository';
