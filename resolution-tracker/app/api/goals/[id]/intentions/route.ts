import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIntentionsForGoal, transformIntentionToResponse } from '@/src/features/implementation-intentions/queries';
import { createIntention } from '@/src/features/implementation-intentions/repository';
import { createIntentionSchema, isValidUUID } from '@/src/features/implementation-intentions/types';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/goals/[id]/intentions
 * List implementation intentions for a goal
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
    const intentions = await getIntentionsForGoal(goalId, user.id);
    if (intentions === null) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(intentions);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch intentions', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/goals/[id]/intentions
 * Create a new implementation intention for a goal
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
  const parseResult = createIntentionSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const input = parseResult.data;

  try {
    const intention = await createIntention(goalId, user.id, input);
    if (!intention) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformIntentionToResponse(intention), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create intention', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
