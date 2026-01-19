import { z } from 'zod';
import { activeAgentEnum } from '@/src/db/schema';

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
