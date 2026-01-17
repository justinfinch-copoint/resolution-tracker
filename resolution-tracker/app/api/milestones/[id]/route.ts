import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMilestone, transformMilestoneToResponse } from '@/src/features/milestones/queries';
import { updateMilestone, deleteMilestone } from '@/src/features/milestones/repository';
import { isValidUUID, updateMilestoneSchema } from '@/src/features/milestones/types';

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
    const milestone = await getMilestone(id, user.id);
    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(milestone);
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

  // Validate with Zod schema
  const parseResult = updateMilestoneSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const input = parseResult.data;

  try {
    const milestone = await updateMilestone(id, user.id, input);
    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformMilestoneToResponse(milestone));
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
    const deleted = await deleteMilestone(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Milestone not found', code: 'NOT_FOUND' },
        { status: 404 }
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
