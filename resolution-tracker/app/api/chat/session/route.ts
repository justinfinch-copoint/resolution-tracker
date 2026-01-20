import { createClient } from '@/lib/supabase/server';
import { getSessionByUserId } from '@/src/features/agents';

/**
 * GET /api/chat/session
 *
 * Fetch the current user's session with full message history.
 * Used by the client to get accurate agent attribution per message.
 */
export async function GET() {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const result = await getSessionByUserId(user.id);

  if (!result.success) {
    // No session is not an error - user just hasn't chatted yet
    if (result.error.code === 'NOT_FOUND') {
      return Response.json({ session: null });
    }
    return Response.json(
      { error: result.error.message, code: result.error.code },
      { status: 500 }
    );
  }

  return Response.json({ session: result.data });
}
