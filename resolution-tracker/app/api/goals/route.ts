import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserGoals, canCreateGoal, transformGoalToResponse } from '@/src/features/goals/queries';
import { createGoal } from '@/src/features/goals/repository';
import { createGoalSchema, isValidUUID } from '@/src/features/goals/types';

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  // Validate with Zod schema
  const parseResult = createGoalSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const input = parseResult.data;

  try {
    // Pre-check for better UX (transaction handles atomic check)
    const canCreate = await canCreateGoal(user.id);
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Maximum active goals reached (5)', code: 'MAX_GOALS_REACHED' },
        { status: 400 }
      );
    }

    const goal = await createGoal(user.id, input);
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
