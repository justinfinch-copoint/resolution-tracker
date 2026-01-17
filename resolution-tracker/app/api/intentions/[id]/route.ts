import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIntention, transformIntentionToResponse } from '@/src/features/implementation-intentions/queries';
import { updateIntention, deleteIntention } from '@/src/features/implementation-intentions/repository';
import { isValidUUID, updateIntentionSchema } from '@/src/features/implementation-intentions/types';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/intentions/[id]
 * Get a single implementation intention by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid intention ID format', code: 'VALIDATION_ERROR' },
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
    const intention = await getIntention(id, user.id);
    if (!intention) {
      return NextResponse.json(
        { error: 'Intention not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(intention);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch intention', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/intentions/[id]
 * Update an implementation intention
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid intention ID format', code: 'VALIDATION_ERROR' },
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
  const parseResult = updateIntentionSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const input = parseResult.data;

  try {
    const intention = await updateIntention(id, user.id, input);
    if (!intention) {
      return NextResponse.json(
        { error: 'Intention not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformIntentionToResponse(intention));
  } catch {
    return NextResponse.json(
      { error: 'Failed to update intention', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/intentions/[id]
 * Delete an implementation intention
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid intention ID format', code: 'VALIDATION_ERROR' },
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
    const deleted = await deleteIntention(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Intention not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete intention', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
