import { createAgentUIStreamResponse, type UIMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';
import {
  getOrCreateSession,
  addMessage,
  createAgentForSession,
  OrchestratorError,
} from '@/src/features/agents';

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

  // 2. Parse messages from request
  let uiMessages: UIMessage[];
  try {
    const body = await req.json();
    uiMessages = body.messages;
  } catch {
    return Response.json(
      { error: 'Invalid request body', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  if (!uiMessages || !Array.isArray(uiMessages)) {
    return Response.json(
      { error: 'Messages array is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  // 3. Extract the last user message
  const lastUserMessage = uiMessages.filter(m => m.role === 'user').pop();
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
    return createAgentUIStreamResponse({
      agent,
      uiMessages,
      async onFinish({ responseMessage }) {
        // Persist assistant message after stream completes
        try {
          if (responseMessage.role === 'assistant' && responseMessage.parts) {
            const assistantContent = responseMessage.parts
              .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map(p => p.text)
              .join('');

            if (assistantContent) {
              const result = await addMessage(updatedSession.id, user.id, {
                role: 'assistant',
                content: assistantContent,
                agentId: updatedSession.activeAgent,
              });

              if (!result.success) {
                console.error('Failed to persist assistant message:', result.error);
              }
            }
          }
        } catch (error) {
          // Log but don't throw - user already received the response
          console.error('Error persisting assistant message:', error);
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
