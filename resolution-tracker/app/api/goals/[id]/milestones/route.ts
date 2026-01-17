import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listMilestonesService, createMilestoneService } from '@/src/features/milestones/services';
import { isValidUUID } from '@/src/features/milestones/types';
import { errorCodeToStatus } from '@/src/lib/api-utils';

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
    const result = await listMilestonesService(goalId, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return NextResponse.json(result.data);
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

  try {
    const result = await createMilestoneService(goalId, user.id, body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create milestone', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
