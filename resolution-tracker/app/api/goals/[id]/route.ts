import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserGoal, canActivateGoal, transformGoalToResponse } from '@/src/features/goals/queries';
import { updateGoal, deleteGoal, getGoalById } from '@/src/features/goals/repository';
import { isValidUUID, isValidStatus, MAX_TITLE_LENGTH } from '@/src/features/goals/types';
import type { UpdateGoalInput } from '@/src/features/goals/types';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/goals/[id]
 * Get a single goal by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // F1: Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid goal ID format', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const goal = await getUserGoal(id, user.id);
    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(goal);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/goals/[id]
 * Update a goal (title and/or status)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  // F1: Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid goal ID format', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let body: UpdateGoalInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  // Validate title if provided
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return NextResponse.json(
      { error: 'Title cannot be empty', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  // F2: Validate title length
  if (body.title !== undefined && body.title.trim().length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title must be ${MAX_TITLE_LENGTH} characters or less`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  // F14: Use centralized status validation
  if (body.status !== undefined && !isValidStatus(body.status)) {
    return NextResponse.json(
      { error: 'Invalid status', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  try {
    // F5: Pre-check for better UX (transaction handles atomic check)
    if (body.status === 'active') {
      const existingGoal = await getGoalById(id, user.id);
      if (existingGoal && existingGoal.status !== 'active') {
        const canActivate = await canActivateGoal(user.id);
        if (!canActivate) {
          return NextResponse.json(
            { error: 'Maximum active goals reached (5)', code: 'MAX_GOALS_REACHED' },
            { status: 400 }
          );
        }
      }
    }

    const updateData: UpdateGoalInput = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.status !== undefined) updateData.status = body.status;

    const updated = await updateGoal(id, user.id, updateData);
    if (!updated) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformGoalToResponse(updated));
  } catch (err) {
    // Handle MAX_GOALS_REACHED from transaction (race condition protection)
    if (err instanceof Error && err.message === 'MAX_GOALS_REACHED') {
      return NextResponse.json(
        { error: 'Maximum active goals reached (5)', code: 'MAX_GOALS_REACHED' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/[id]
 * Delete a goal
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // F1: Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid goal ID format', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const deleted = await deleteGoal(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
