import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserCheckIn } from '@/src/features/check-ins/queries';
import { deleteCheckIn } from '@/src/features/check-ins/repository';
import { isValidUUID } from '@/src/features/check-ins/types';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/check-ins/[id]
 * Get a single check-in by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid check-in ID format', code: 'VALIDATION_ERROR' },
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
    const checkIn = await getUserCheckIn(id, user.id);
    if (!checkIn) {
      return NextResponse.json(
        { error: 'Check-in not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(checkIn);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch check-in', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/check-ins/[id]
 * Delete a check-in (for corrections)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid check-in ID format', code: 'VALIDATION_ERROR' },
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
    const deleted = await deleteCheckIn(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Check-in not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete check-in', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
