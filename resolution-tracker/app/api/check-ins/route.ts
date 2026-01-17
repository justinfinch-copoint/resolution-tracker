import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserCheckIns, transformCheckInToResponse } from '@/src/features/check-ins/queries';
import { createCheckIn } from '@/src/features/check-ins/repository';
import { createCheckInSchema, isValidUUID } from '@/src/features/check-ins/types';

/**
 * GET /api/check-ins
 * List check-ins for the authenticated user
 * Optional query param: goalId to filter by goal
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get('goalId');

  // Validate goalId if provided
  if (goalId && !isValidUUID(goalId)) {
    return NextResponse.json(
      { error: 'Invalid goal ID format', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  try {
    const checkIns = await getUserCheckIns(user.id, goalId ?? undefined);
    return NextResponse.json(checkIns);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch check-ins', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/check-ins
 * Create a new check-in for the authenticated user
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
  const parseResult = createCheckInSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const input = parseResult.data;

  try {
    const checkIn = await createCheckIn(user.id, {
      goalId: input.goalId,
      content: input.content,
      milestoneId: input.milestoneId,
      valueRecorded: input.valueRecorded,
      habitCompletionStatus: input.habitCompletionStatus,
      checkInDate: input.checkInDate,
    });
    return NextResponse.json(transformCheckInToResponse(checkIn), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create check-in', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
