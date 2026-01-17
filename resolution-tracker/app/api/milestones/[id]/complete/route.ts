import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeMilestoneService } from '@/src/features/milestones/services';
import { isValidUUID } from '@/src/features/milestones/types';
import { errorCodeToStatus } from '@/src/lib/api-utils';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/milestones/[id]/complete
 * Mark a milestone as complete
 */
export async function POST(_request: Request, { params }: RouteParams) {
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
    const result = await completeMilestoneService(id, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: errorCodeToStatus(result.error.code) }
      );
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to complete milestone', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
