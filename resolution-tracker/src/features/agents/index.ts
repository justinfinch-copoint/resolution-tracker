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

// Orchestrator
export {
  createAgentForSession,
  agentRegistry,
  getAgent,
  getRegisteredAgentIds,
  OrchestratorError,
} from './orchestrator';

// Agent config
export { ANTHROPIC_MODEL, MAX_AGENT_STEPS, AI_TIMEOUT_MS } from './config';

// Coach agent
export { coachAgent, createCoachAgentTools } from './coach';
export type { CoachTools } from './coach';

// Goal Architect agent
export { goalArchitectAgent, createGoalArchitectTools } from './goal-architect';
export type { GoalArchitectTools } from './goal-architect';

// Shared tools
export { createHandoffTool, AGENT_DISPLAY_NAMES } from './shared-tools';
export type { HandoffToolConfig } from './shared-tools';
