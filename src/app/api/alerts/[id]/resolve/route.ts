import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { invalidatePattern } from '@/lib/redis';
import { AssistanceLog, ApiResponse } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<AssistanceLog>>> {
  try {
    const { id: alertId } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify ownership via JOIN
    const alert = await queryOne<AssistanceLog>(`
      SELECT al.* 
      FROM assistance_logs al
      JOIN elder_profiles ep ON al.elder_id = ep.id
      WHERE al.id = $1 AND ep.caregiver_id = $2
    `, [alertId, userId]);

    if (!alert) {
      return NextResponse.json({ success: false, error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    if (alert.resolved) {
      return NextResponse.json({ success: false, error: 'Alert is already resolved' }, { status: 400 });
    }

    // Update alert
    const updatedAlert = await queryOne<AssistanceLog>(
      `UPDATE assistance_logs 
       SET resolved = true 
       WHERE id = $1 RETURNING *`,
      [alertId]
    );

    if (!updatedAlert) {
      throw new Error('Update failed');
    }

    // Invalidate alerts cache for this caregiver
    await invalidatePattern(`alerts:${userId}*`);

    return NextResponse.json({ success: true, data: updatedAlert });
  } catch (error) {
    console.error('Error resolving alert:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
