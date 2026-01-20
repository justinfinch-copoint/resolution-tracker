import { createClient } from '@/lib/supabase/server';
import { buildChatContext } from '@/src/features/agents/memory/chat-context';
import { buildInitialGreeting } from '@/src/features/agents/coach/greeting';

export async function GET() {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    // 2. Build context
    const context = await buildChatContext(user.id);

    // 3. Generate greeting
    const greeting = buildInitialGreeting(context);

    // 4. Return greeting with short cache (greeting can be cached briefly)
    return Response.json(
      { greeting },
      {
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('Greeting API error:', error);
    return Response.json(
      { error: 'Failed to generate greeting', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
