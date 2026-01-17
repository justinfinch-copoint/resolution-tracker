import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getGoalWithRelationsService,
  updateGoalService,
  deleteGoalService,
} from '@/src/features/goals/services';
import { isValidUUID } from '@/src/features/goals/types';
import { errorCodeToStatus } from '@/src/lib/api-utils';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/goals/[id]
 * Get a single goal by ID with its milestones and implementation intentions
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
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
    const result = await getGoalWithRelationsService(id, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/goals/[id]
 * Update a goal (title, status, and/or enhanced fields)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
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
    const result = await updateGoalService(id, user.id, body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return NextResponse.json(result.data);
  } catch {
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

  // Validate UUID format
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
    const result = await deleteGoalService(id, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
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
