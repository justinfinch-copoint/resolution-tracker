import type {
  AgentId,
  SessionMessage,
  WorkingContext,
  LongTermMemory,
  MessageScopingConfig,
} from './types';
import { DEFAULT_SCOPING_CONFIGS } from './types';
import { fetchLongTermMemory } from './long-term';

/** Result type for assembleWorkingContext (consistent with ServiceResult pattern) */
export type WorkingContextResult =
  | { success: true; data: WorkingContext }
  | { success: false; error: { code: string; message: string } };

/**
 * Select relevant messages using "last N" strategy.
 * Designed for easy replacement with compaction/summary strategy later.
 *
 * Note: This function intentionally strips agentId and timestamp metadata
 * to conform to Vercel AI SDK message format. If downstream consumers need
 * agent attribution, access the original SessionMessage array directly.
 */
export function selectMessages(
  messages: SessionMessage[],
  agentId: AgentId,
  config?: Partial<MessageScopingConfig>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const defaultConfig = DEFAULT_SCOPING_CONFIGS[agentId];
  const maxMessages = config?.maxMessages ?? defaultConfig.maxMessages;
  const filter = config?.relevanceFilter ?? defaultConfig.relevanceFilter;

  // Apply optional filter
  const filtered = filter ? messages.filter(filter) : messages;

  // Take last N messages
  const scoped = filtered.slice(-maxMessages);

  // Transform to Vercel AI SDK format (strip metadata)
  return scoped.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

/**
 * Build context injection string for system prompt.
 * Includes user profile, goals summary, user patterns, and engagement status.
 */
export function buildContextInjection(memory: LongTermMemory): string {
  const sections: string[] = [];

  // User context section (account age helps personalize tone)
  const accountAge = Math.floor(
    (Date.now() - new Date(memory.userProfile.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const accountAgeText = accountAge === 0 ? 'today' : accountAge === 1 ? '1 day ago' : `${accountAge} days ago`;
  sections.push(`## User Context\n**Account created:** ${accountAgeText}`);

  // Goals section
  if (memory.goals.length > 0) {
    const goalsList = memory.goals
      .map((g, i) => `${i + 1}. "${g.title}" (${g.goalType})`)
      .join('\n');
    sections.push(`## User's Active Goals\n${goalsList}`);
  } else {
    sections.push(`## User's Active Goals\nNo active goals yet.`);
  }

  // User summary section
  if (memory.userSummary) {
    const parts: string[] = [];
    if (memory.userSummary.patterns.length > 0) {
      parts.push(`**Patterns:** ${memory.userSummary.patterns.join('; ')}`);
    }
    if (memory.userSummary.wins.length > 0) {
      parts.push(`**Past wins:** ${memory.userSummary.wins.join('; ')}`);
    }
    if (memory.userSummary.struggles.length > 0) {
      parts.push(`**Challenges:** ${memory.userSummary.struggles.join('; ')}`);
    }
    if (parts.length > 0) {
      sections.push(`## What You Know About This User\n${parts.join('\n')}`);
    }
  }

  // Engagement section
  const { engagement } = memory;
  if (engagement.daysSinceLastCheckIn !== null) {
    sections.push(
      `## Engagement\n**Status:** ${engagement.status}\n**Days since last check-in:** ${engagement.daysSinceLastCheckIn}`
    );
  } else {
    sections.push(`## Engagement\n**Status:** new user (first conversation)`);
  }

  return sections.join('\n\n');
}

/**
 * Stub for expertise module loading
 * Returns empty array - implemented in MA-2.1 (Coach Agent Extraction)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getExpertiseModules(agentId: AgentId): string[] {
  // TODO: Implement in MA-2.1 - return agent-specific expertise modules
  return [];
}

/**
 * Assemble working context for an agent invocation.
 * This is the main entry point for the orchestrator.
 *
 * Returns ServiceResult pattern for consistent error handling.
 */
export async function assembleWorkingContext(
  agentId: AgentId,
  baseSystemPrompt: string,
  sessionMessages: SessionMessage[],
  userId: string,
  scopingConfig?: Partial<MessageScopingConfig>
): Promise<WorkingContextResult> {
  // Fetch long-term memory (now returns ServiceResult)
  const memoryResult = await fetchLongTermMemory(userId);

  if (!memoryResult.success) {
    return memoryResult; // Propagate error
  }

  const longTermMemory = memoryResult.data;

  // Build context injection
  const contextInjection = buildContextInjection(longTermMemory);

  // Get expertise modules (stubbed for now)
  const expertiseModules = getExpertiseModules(agentId);
  const expertiseSection =
    expertiseModules.length > 0
      ? `\n\n## Expertise\n${expertiseModules.join('\n\n')}`
      : '';

  // Assemble system prompt
  const systemPrompt = `${baseSystemPrompt}\n\n${contextInjection}${expertiseSection}`;

  // Scope messages
  const messages = selectMessages(sessionMessages, agentId, scopingConfig);

  return {
    success: true,
    data: {
      systemPrompt,
      messages,
      tools: {}, // Placeholder - actual tools defined in agent configs (MA-2.x)
    },
  };
}
