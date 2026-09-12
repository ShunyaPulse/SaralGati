import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/redis';
import { AssistanceLog, ApiResponse } from '@/types';

export async function GET(request: Request): Promise<NextResponse<ApiResponse<AssistanceLog[]>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const elderId = searchParams.get('elder_id');
    const status = searchParams.get('status'); // 'active', 'resolved', 'all'
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;
    const userId = session.user.id;

    // Build cache key based on params
    const cacheKey = `alerts:${userId}:${elderId || 'all'}:${status || 'active'}:${page}:${limit}`;

    const cached = await cacheGet<AssistanceLog[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // Build query dynamically
    let queryStr = `
      SELECT al.*, ep.name as elder_name 
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
      queryStr += ` AND al.resolved_at IS NULL`;
    } else if (status === 'resolved') {
      queryStr += ` AND al.resolved_at IS NOT NULL`;
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
