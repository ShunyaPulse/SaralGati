import { fail, ok, type ServiceResult } from '@/server/http';
import { getAuthSession } from '@/lib/auth/auth';
import { query, queryOne } from '@/lib/data/db';
import { cacheGet, cacheSet, invalidatePattern, rateLimiter } from '@/lib/data/redis';
import { AssistanceLog, ApiResponse } from '@/types';
import { androidAlertSchema } from '@/lib/shared/validations';
import { verifyAndroidHmac } from '@/lib/auth/hmac';

/** GET /api/alerts - the caregiver alert feed, cached for 30 seconds. */
export async function listAlerts(request: Request): Promise<ServiceResult<ApiResponse<AssistanceLog[]>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return fail(401, { success: false, error: 'Unauthorized' });
    }

    const { searchParams } = new URL(request.url);
    const elderId = searchParams.get('elder_id');
    const status = searchParams.get('status'); // 'active', 'resolved', 'all'
    const eventTypes = (searchParams.get('event_types') || '')
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean);
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const offset = (page - 1) * limit;
    const userId = session.user.id;

    // Build cache key based on params
    const cacheKey = `alerts:${userId}:${elderId || 'all'}:${status || 'active'}:${eventTypes.join('|')}:${fromDate || ''}:${toDate || ''}:${page}:${limit}`;

    const cached = await cacheGet<AssistanceLog[]>(cacheKey);
    if (cached) {
      return ok({ success: true, data: cached });
    }

    // Build query dynamically
    let queryStr = `
      SELECT al.*, ep.elder_name as elder_name 
      FROM assistance_logs al
      JOIN elder_profiles ep ON al.elder_id = ep.id
      WHERE ep.caregiver_id = $1
    `;
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (elderId) {
      queryStr += ` AND al.elder_id = $${paramIndex}`;
      queryParams.push(elderId);
      paramIndex++;
    }

    if (status === 'active') {
      queryStr += ` AND al.resolved = false`;
    } else if (status === 'resolved') {
      queryStr += ` AND al.resolved = true`;
    }

    if (eventTypes.length > 0) {
      queryStr += ` AND al.event_type = ANY($${paramIndex}::text[])`;
      queryParams.push(eventTypes);
      paramIndex++;
    }

    if (fromDate) {
      queryStr += ` AND al.created_at >= $${paramIndex}::date`;
      queryParams.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      // Inclusive of the whole end day, not just its midnight.
      queryStr += ` AND al.created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      queryParams.push(toDate);
      paramIndex++;
    }

    queryStr += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const alerts = await query<AssistanceLog>(queryStr, queryParams);

    // Cache for 30s
    await cacheSet(cacheKey, alerts, 30);

    return ok({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}

/** POST /api/alerts - the companion app raising an alert, signed with the shared HMAC. */
export async function createAlert(request: Request): Promise<ServiceResult<ApiResponse<AssistanceLog>>> {
  try {
    if (!verifyAndroidHmac(request)) {
      return fail(403, { success: false, error: 'Invalid app signature' });
    }
    // The companion app is the only caller, but its payload used to go straight
    // into the insert: a bad `elder_id` reached Postgres as an invalid uuid and
    // an unknown `event_type` tripped the CHECK constraint, both surfacing as a
    // 500. Validate first so the device gets an actionable 400 instead.
    const parsed = androidAlertSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail(400, {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid payload',
      });
    }

    const { elder_id, event_type, description, severity, screenshot_url, screen_name, app_package } = parsed.data;

    // A changing screen can make one phone emit a burst of alerts; cap the rate
    // so a single device cannot flood the caregiver feed or the table.
    const alertLimit = await rateLimiter(`alert:${elder_id}`, 30, 60);
    if (!alertLimit.allowed) {
      return fail(429, { success: false, error: 'Too many alerts, please slow down' });
    }

    // Lookup elder and caregiver
    const elder = await queryOne<{ id: string; caregiver_id: string }>(
      `SELECT id, caregiver_id FROM elder_profiles WHERE id = $1`,
      [elder_id]
    );

    if (!elder) {
      return fail(404, { success: false, error: 'Elder profile not found' });
    }

    // Map sos_trigger from Android to emergency to satisfy DB constraint
    const mappedEventType = event_type === 'sos_trigger' ? 'emergency' : event_type;

    // Insert alert log
    const newAlert = await queryOne<AssistanceLog>(
      `INSERT INTO assistance_logs (
        elder_id, event_type, screen_name, app_package, duration_ms, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        elder_id,
        mappedEventType,
        screen_name || 'SOS / Companion App',
        app_package || 'com.saralgati.app',
        0,
        JSON.stringify({ description: description || 'Mobile alert', severity, screenshot_url })
      ]
    );

    // Invalidate alerts cache for caregiver
    await invalidatePattern(`alerts:${elder.caregiver_id}*`);

    return fail(201, { success: true, data: newAlert as AssistanceLog });
  } catch (error) {
    console.error('Error creating alert:', error);
    // Do not pass the driver message straight back: a failed insert would echo
    // column, table and constraint names to the caller.
    return fail(500, { success: false, error: 'Internal Server Error' });
  }
}
