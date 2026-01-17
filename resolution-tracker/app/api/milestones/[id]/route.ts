import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getMilestoneService,
  updateMilestoneService,
  deleteMilestoneService,
} from '@/src/features/milestones/services';
import { isValidUUID } from '@/src/features/milestones/types';
import { errorCodeToStatus } from '@/src/lib/api-utils';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/milestones/[id]
 * Get a single milestone by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid milestone ID format', code: 'VALIDATION_ERROR' },
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
    const result = await getMilestoneService(id, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch milestone', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/milestones/[id]
 * Update a milestone
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid milestone ID format', code: 'VALIDATION_ERROR' },
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
    const result = await updateMilestoneService(id, user.id, body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to update milestone', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/milestones/[id]
 * Delete a milestone
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid milestone ID format', code: 'VALIDATION_ERROR' },
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
    const result = await deleteMilestoneService(id, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete milestone', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
