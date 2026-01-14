import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserGoals, canCreateGoal, transformGoalToResponse } from '@/src/features/goals/queries';
import { createGoal } from '@/src/features/goals/repository';
import { MAX_TITLE_LENGTH } from '@/src/features/goals/types';
import type { CreateGoalInput } from '@/src/features/goals/types';

/**
 * GET /api/goals
 * List all goals for the authenticated user
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const goals = await getUserGoals(user.id);
    return NextResponse.json(goals);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch goals', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/goals
 * Create a new goal for the authenticated user
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let body: CreateGoalInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  // Validate title (F2: added max length)
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return NextResponse.json(
      { error: 'Title is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  if (body.title.trim().length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title must be ${MAX_TITLE_LENGTH} characters or less`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  try {
    // F4: Transaction handles atomic limit check, but we do a quick pre-check for better UX
    const canCreate = await canCreateGoal(user.id);
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Maximum active goals reached (5)', code: 'MAX_GOALS_REACHED' },
        { status: 400 }
      );
    }

    const goal = await createGoal(user.id, { title: body.title.trim() });
    return NextResponse.json(transformGoalToResponse(goal), { status: 201 });
  } catch (err) {
    // Handle MAX_GOALS_REACHED from transaction (race condition protection)
    if (err instanceof Error && err.message === 'MAX_GOALS_REACHED') {
      return NextResponse.json(
        { error: 'Maximum active goals reached (5)', code: 'MAX_GOALS_REACHED' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
