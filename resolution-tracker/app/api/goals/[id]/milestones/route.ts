import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMilestonesForGoal, transformMilestoneToResponse } from '@/src/features/milestones/queries';
import { createMilestone } from '@/src/features/milestones/repository';
import { createMilestoneSchema, isValidUUID } from '@/src/features/milestones/types';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/goals/[id]/milestones
 * List milestones for a goal
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: goalId } = await params;

  // Validate UUID format
  if (!isValidUUID(goalId)) {
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
    const milestones = await getMilestonesForGoal(goalId, user.id);
    if (milestones === null) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(milestones);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch milestones', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/goals/[id]/milestones
 * Create a new milestone for a goal
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: goalId } = await params;

  // Validate UUID format
  if (!isValidUUID(goalId)) {
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
  const parseResult = createMilestoneSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const input = parseResult.data;

  try {
    const milestone = await createMilestone(goalId, user.id, input);
    if (!milestone) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformMilestoneToResponse(milestone), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create milestone', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
