import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { cacheGet, cacheSet, invalidatePattern } from '@/lib/redis';
import { elderProfileSchema } from '@/lib/validations';
import { ElderProfile, ApiResponse } from '@/types';

export async function GET(request: Request): Promise<NextResponse<ApiResponse<ElderProfile[]>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const cacheKey = `elders:${userId}`;

    // Try cache first
    const cached = await cacheGet<ElderProfile[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // DB Query
    const elders = await query<ElderProfile>(
      `SELECT * FROM elder_profiles WHERE caregiver_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    // Set cache
    await cacheSet(cacheKey, elders, 300); // 5 minutes

    return NextResponse.json({ success: true, data: elders });
  } catch (error) {
    console.error('Error fetching elders:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse<ApiResponse<ElderProfile>>> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = elderProfileSchema.parse(body);
    const userId = session.user.id;

    // Insert into DB
    const newElder = await queryOne<ElderProfile>(
      `INSERT INTO elder_profiles (
        caregiver_id, elder_name, phone_model, os_version, emergency_contact, preferred_lang
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        userId,
        validatedData.elder_name,
        validatedData.phone_model || null,
        validatedData.os_version || null,
        validatedData.emergency_contact || null,
        validatedData.preferred_lang || 'hi'
      ]
    );

    if (!newElder) {
      throw new Error('Failed to create elder profile');
    }

    // Invalidate cache
    await invalidatePattern(`elders:${userId}*`);

    return NextResponse.json({ success: true, data: newElder }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating elder:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
