import { fail, ok, type ServiceResult } from '@/server/http';
import { getAuthSession } from '@/lib/auth/auth';
import { queryOne } from '@/lib/data/db';
import { invalidatePattern } from '@/lib/data/redis';
import { AssistanceLog, ApiResponse } from '@/types';

/** PATCH /api/alerts/:id/resolve - mark one of the caregiver's alerts resolved. */
export async function resolveAlert(
  alertId: string
): Promise<ServiceResult<ApiResponse<AssistanceLog>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
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
      return fail(404, { success: false, error: 'Not Found or Unauthorized' });
    }

    if (alert.resolved) {
      return fail(400, { success: false, error: 'Alert is already resolved' });
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

    return ok({ success: true, data: updatedAlert });
  } catch (error) {
    console.error('Error resolving alert:', error);
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}
