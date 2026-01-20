import { createAgentUIStreamResponse, type UIMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';
import {
  getOrCreateSession,
  addMessage,
  recordTransition,
  createAgentForSession,
  OrchestratorError,
  agentRegistry,
  AGENT_IDS,
  type HandoffResult,
  type AgentId,
} from '@/src/features/agents';

/**
 * Type guard to check if a value is a HandoffResult.
 * Validates that handoff is a valid AgentId (F2 fix).
 */
function isHandoffResult(value: unknown): value is HandoffResult {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('handoff' in value) ||
    !('reason' in value) ||
    !('announcement' in value)
  ) {
    return false;
  }

  const candidate = value as HandoffResult;

  // Validate handoff is a valid AgentId, not just any string (F2)
  if (
    typeof candidate.handoff !== 'string' ||
    !AGENT_IDS.includes(candidate.handoff as AgentId)
  ) {
    return false;
  }

  return (
    typeof candidate.reason === 'string' &&
    typeof candidate.announcement === 'string'
  );
}

/**
 * Part type for tool invocation results.
 * Vercel AI SDK 6.x uses `type: 'tool-${toolName}'` and `state: 'output-available'`
 * with `output` containing the result.
 */
interface ToolInvocationPart {
  type: string; // 'tool-${toolName}' pattern, e.g., 'tool-transferToGoalArchitect'
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  output?: unknown;
  toolCallId?: string;
}

/**
 * Scan message parts for a handoff tool result.
 * Returns the first HandoffResult found, or null if none.
 *
 * Vercel AI SDK 6.x uses:
 * - type: 'tool-${toolName}' (e.g., 'tool-transferToGoalArchitect')
 * - state: 'output-available' when tool has finished
 * - output: the tool's return value
 */
function findHandoffResult(parts: unknown[]): HandoffResult | null {
  for (const part of parts) {
    const p = part as ToolInvocationPart;
    // Check for tool parts: type starts with 'tool-' and state is 'output-available'
    if (p.type?.startsWith('tool-') && p.state === 'output-available') {
      if (isHandoffResult(p.output)) {
        return p.output;
      }
    }
  }
  return null;
}

/**
 * Convert session messages to UI message format.
 *
 * This uses our server-side session as the source of truth rather than
 * the client's uiMessages. This is architecturally correct because:
 * 1. Server session is authoritative (not client state)
 * 2. Session messages are text-only (no stale tool parts)
 * 3. Avoids tool schema validation issues after agent handoffs
 *
 * The UI message format is what createAgentUIStreamResponse expects.
 */
function sessionMessagesToUIMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
): UIMessage[] {
  return messages.map((msg, index) => ({
    id: `msg-${index}`,
    role: msg.role,
    parts: [{ type: 'text' as const, text: msg.content }],
    createdAt: new Date(msg.timestamp),
  }));
}

export async function POST(req: Request) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // 2. Parse request to extract new user message
  // Note: We only use client messages to get the new user input.
  // For model context, we use server-side session (source of truth).
  let clientMessages: UIMessage[];
  try {
    const body = await req.json();
    clientMessages = body.messages;
  } catch {
    return Response.json(
      { error: 'Invalid request body', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  if (!clientMessages || !Array.isArray(clientMessages)) {
    return Response.json(
      { error: 'Messages array is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  // 3. Extract the last user message (only thing we need from client)
  const lastUserMessage = clientMessages.filter(m => m.role === 'user').pop();
  if (!lastUserMessage) {
    return Response.json(
      { error: 'No user message found', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  // Extract text content from message parts
  const userMessageContent = lastUserMessage.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('') || '';

  if (!userMessageContent) {
    return Response.json(
      { error: 'No message content found', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  try {
    // 4. Get or create session
    const sessionResult = await getOrCreateSession(user.id);
    if (!sessionResult.success) {
      console.error('Session error:', sessionResult.error);
      return Response.json(
        { error: 'Failed to create session', code: sessionResult.error.code },
        { status: 500 }
      );
    }
    const session = sessionResult.data;

    // 5. Add user message to session
    const addMessageResult = await addMessage(session.id, user.id, {
      role: 'user',
      content: userMessageContent,
      agentId: session.activeAgent,
    });

    if (!addMessageResult.success) {
      console.error('Add message error:', addMessageResult.error);
      return Response.json(
        { error: 'Failed to save message', code: addMessageResult.error.code },
        { status: 500 }
      );
    }

    // Use the updated session with the new message
    const updatedSession = addMessageResult.data;

    // 6. Create agent for this session
    const agent = await createAgentForSession(updatedSession, user.id);

    // 7. Stream response using createAgentUIStreamResponse
    // Use session messages as source of truth (not client's uiMessages)
    // This ensures we use server-authoritative state and avoids tool schema
    // validation issues after agent handoffs
    const serverMessages = sessionMessagesToUIMessages(updatedSession.messages);

    return createAgentUIStreamResponse({
      agent,
      uiMessages: serverMessages,
      async onFinish({ responseMessage }) {
        // Persist assistant message after stream completes
        try {
          if (responseMessage.role === 'assistant' && responseMessage.parts) {
            // Check for handoff FIRST to determine correct agentId for message
            const handoff = findHandoffResult(responseMessage.parts);

            // The message was generated by the current active agent (before handoff)
            const messageAgentId = updatedSession.activeAgent;

            const assistantContent = responseMessage.parts
              .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map(p => p.text)
              .join('');

            if (assistantContent) {
              const result = await addMessage(updatedSession.id, user.id, {
                role: 'assistant',
                content: assistantContent,
                agentId: messageAgentId,
              });

              if (!result.success) {
                console.error('Failed to persist assistant message:', result.error);
              }
            }

            // Process handoff after saving message
            if (handoff) {
              // F11 fix: Validate target agent is registered before handoff
              if (!agentRegistry[handoff.handoff]) {
                console.error(
                  `[Handoff] Target agent '${handoff.handoff}' is not registered. Ignoring handoff.`
                );
                return;
              }

              console.log(
                `[Handoff] ${updatedSession.activeAgent} → ${handoff.handoff}: ${handoff.reason}`
              );

              const transitionResult = await recordTransition(
                updatedSession.id,
                user.id,
                { to: handoff.handoff, reason: handoff.reason, context: handoff.context }
              );

              if (!transitionResult.success) {
                // Log but don't throw - user already got their response
                console.error('Failed to record transition:', transitionResult.error);
              }
            }
          }
        } catch (error) {
          // Log but don't throw - user already received the response
          console.error('Error in onFinish callback:', error);
        }
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle orchestrator-specific errors with proper codes
    if (error instanceof OrchestratorError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return Response.json(
      { error: 'Failed to process chat request', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
