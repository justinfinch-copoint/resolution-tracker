import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transformMilestoneToResponse } from '@/src/features/milestones/queries';
import { completeMilestone } from '@/src/features/milestones/repository';
import { isValidUUID } from '@/src/features/milestones/types';

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
    const milestone = await completeMilestone(id, user.id);
    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformMilestoneToResponse(milestone));
  } catch {
    return NextResponse.json(
      { error: 'Failed to complete milestone', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
