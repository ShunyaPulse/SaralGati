import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { cacheGet, cacheSet, invalidatePattern } from '@/lib/redis';
import { AssistanceLog, ApiResponse } from '@/types';
import { verifyAndroidHmac } from '@/lib/hmac';

export async function GET(request: Request): Promise<NextResponse<ApiResponse<AssistanceLog[]>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ success: true, data: cached });
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

    return NextResponse.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse<ApiResponse<AssistanceLog>>> {
  try {
    if (!verifyAndroidHmac(request)) {
      return NextResponse.json({ success: false, error: 'Invalid app signature' }, { status: 403 });
    }
    const body = await request.json();
    const { elder_id, event_type, description, severity, screenshot_url, screen_name, app_package } = body;

    if (!elder_id) {
      return NextResponse.json({ success: false, error: 'elder_id is required' }, { status: 400 });
    }

    // Lookup elder and caregiver
    const elder = await queryOne<{ id: string; caregiver_id: string }>(
      `SELECT id, caregiver_id FROM elder_profiles WHERE id = $1`,
      [elder_id]
    );

    if (!elder) {
      return NextResponse.json({ success: false, error: 'Elder profile not found' }, { status: 404 });
    }

    // Map sos_trigger from Android to emergency to satisfy DB constraint
    const mappedEventType = event_type === 'sos_trigger' ? 'emergency' : (event_type || 'emergency');

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
        JSON.stringify({ description: description || 'Mobile alert', severity: severity || 'critical', screenshot_url })
      ]
    );

    // Invalidate alerts cache for caregiver
    await invalidatePattern(`alerts:${elder.caregiver_id}*`);

    return NextResponse.json({ success: true, data: newAlert as AssistanceLog }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

