import { z } from 'zod';
import { activeAgentEnum, goalTypeEnum, goalStatusEnum, type SessionMessage } from '@/src/db/schema';

// Re-export DB types
export type {
  ConversationSession,
  NewConversationSession,
  ActiveAgent,
  SessionMessage,
  AgentTransition,
} from '@/src/db/schema';

// Agent ID values - derived from schema enum (single source of truth)
export const AGENT_IDS = activeAgentEnum.enumValues;
export type AgentId = (typeof AGENT_IDS)[number];

// Zod schemas for validation
export const sessionMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  agentId: z.enum(AGENT_IDS).optional(),
  timestamp: z.string().datetime(),
});

export const agentTransitionSchema = z.object({
  from: z.enum(AGENT_IDS),
  to: z.enum(AGENT_IDS),
  reason: z.string().min(1),
  timestamp: z.string().datetime(),
});

export const addMessageInputSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  agentId: z.enum(AGENT_IDS).optional(),
});

export const recordTransitionInputSchema = z.object({
  to: z.enum(AGENT_IDS),
  reason: z.string().min(1),
});

// Input types
export type AddMessageInput = z.infer<typeof addMessageInputSchema>;
export type RecordTransitionInput = z.infer<typeof recordTransitionInputSchema>;

// Response type (camelCase for API)
export type SessionResponse = {
  id: string;
  userId: string;
  activeAgent: AgentId;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    agentId?: AgentId;
    timestamp: string;
  }>;
  agentTransitions: Array<{
    from: AgentId;
    to: AgentId;
    reason: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

// ============================================================
// Working Context Types (MA-1.2)
// ============================================================

// Zod schema for userId validation (reusable across long-term memory functions)
export const userIdSchema = z.string().uuid('userId must be a valid UUID');

// Type-safe goal type and status derived from schema enums
export type GoalType = (typeof goalTypeEnum.enumValues)[number];
export type GoalStatus = (typeof goalStatusEnum.enumValues)[number];

// User profile for context injection
export type UserProfile = {
  id: string;
  email: string | null;
  createdAt: string;
};

// Goals summary for context (subset of full goal)
export type GoalSummary = {
  id: string;
  title: string;
  status: GoalStatus;
  goalType: GoalType;
};

// User summary data (patterns, wins, struggles)
export type UserSummaryContext = {
  patterns: string[];
  wins: string[];
  struggles: string[];
  lastUpdated: string | null;
};

// Engagement data
export type EngagementContext = {
  daysSinceLastCheckIn: number | null;
  status: 'new' | 'engaged' | 'returning';
  lastCheckInAt: string | null;
};

// Combined long-term memory
export type LongTermMemory = {
  userProfile: UserProfile;
  goals: GoalSummary[];
  userSummary: UserSummaryContext | null;
  engagement: EngagementContext;
};

// Message scoping configuration per agent
export type MessageScopingConfig = {
  maxMessages: number;
  relevanceFilter?: (message: SessionMessage) => boolean;
};

// Default scoping configs per agent type
export const DEFAULT_SCOPING_CONFIGS: Record<AgentId, MessageScopingConfig> = {
  coach: { maxMessages: 10 },
  goalArchitect: { maxMessages: 10 },
  patternAnalyst: { maxMessages: 5 },
  motivator: { maxMessages: 5 },
  accountabilityPartner: { maxMessages: 10 },
};

// Final working context output (matches Vercel AI SDK expectations)
export type WorkingContext = {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  // TODO(MA-2.x): Replace with proper Vercel AI SDK tool types when agents are implemented.
  // Intentionally untyped for now as tool schemas vary per agent.
  tools: Record<string, unknown>;
};
