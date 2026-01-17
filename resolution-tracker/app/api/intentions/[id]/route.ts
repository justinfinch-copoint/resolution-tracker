import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getIntentionService,
  updateIntentionService,
  deleteIntentionService,
} from '@/src/features/implementation-intentions/services';
import { isValidUUID } from '@/src/features/implementation-intentions/types';
import { errorCodeToStatus } from '@/src/lib/api-utils';

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
    const result = await getIntentionService(id, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return NextResponse.json(result.data);
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

  try {
    const result = await updateIntentionService(id, user.id, body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return NextResponse.json(result.data);
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
    const result = await deleteIntentionService(id, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
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
