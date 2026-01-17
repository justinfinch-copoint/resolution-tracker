import { createAgentUIStreamResponse, UIMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { buildChatContext, buildSystemPrompt, createCoachTools } from '@/src/features/ai-coach';
import { createCoachAgent } from '@/src/features/ai-coach/agent';

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

  try {
    // 3. Build context and system prompt
    const context = await buildChatContext(user.id);
    const systemPrompt = buildSystemPrompt(context);

    // 4. Create tools with userId bound
    const tools = createCoachTools(user.id);

    // 5. Create agent with system prompt and tools
    const agent = createCoachAgent(systemPrompt, tools);

    // 6. Stream agent response using createAgentUIStreamResponse
    // This handles the async agent.stream() and converts to a Response
    return createAgentUIStreamResponse({
      agent,
      uiMessages,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to process chat request', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
