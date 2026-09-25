import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { cacheDelete, invalidatePattern } from '@/lib/redis';
import { validateDeviceToken } from '@/lib/agent-auth';
import { elderProfileSchema } from '@/lib/validations';
import { ElderProfile, ApiResponse } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ElderProfile>>> {
  try {
    const { id: elderId } = await params;
    const session = await getAuthSession();
    
    if (session?.user?.id) {
      const userId = session.user.id;
      const elder = await queryOne<ElderProfile>(
        `SELECT * FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`,
        [elderId, userId]
      );

      if (!elder) {
        return NextResponse.json({ success: false, error: 'Not Found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: elder });
    }

    // Companion app / device token check
    const auth = await validateDeviceToken(request);
    if (auth.isAuthenticated) {
      const elder = await queryOne<ElderProfile>(
        `SELECT * FROM elder_profiles WHERE id = $1 AND is_active = true`,
        [elderId]
      );
      if (elder) {
        return NextResponse.json({ success: true, data: elder });
      }
    }

    // Public existence check for initial pairing handshake
    const existingElder = await queryOne<{ id: string; elder_name: string; is_active: boolean }>(
      `SELECT id, elder_name, is_active FROM elder_profiles WHERE id::text = $1 AND is_active = true`,
      [elderId]
    );

    if (existingElder) {
      return NextResponse.json({ success: true, data: existingElder as any });
    }

    return NextResponse.json({ success: false, error: 'Elder not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching elder:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ElderProfile>>> {
  try {
    const { id: elderId } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const validatedData = elderProfileSchema.parse(body);

    // Verify ownership
    const existing = await queryOne(`SELECT id FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`, [elderId, userId]);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    const updatedElder = await queryOne<ElderProfile>(
      `UPDATE elder_profiles SET
        elder_name = $1, phone_model = $2, os_version = $3, emergency_contact = $4,
        preferred_lang = $5, updated_at = NOW()
       WHERE id = $6 AND caregiver_id = $7 RETURNING *`,
      [
        validatedData.elder_name,
        validatedData.phone_model || null,
        validatedData.os_version || null,
        validatedData.emergency_contact || null,
        validatedData.preferred_lang || 'hi',
        elderId,
        userId
      ]
    );

    if (!updatedElder) {
      throw new Error('Update failed');
    }

    // Invalidate caches
    await invalidatePattern(`elders:${userId}*`);
    await cacheDelete(`agent-config:${elderId}`);

    return NextResponse.json({ success: true, data: updatedElder });
  } catch (error: any) {
    console.error('Error updating elder:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation Error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id: elderId } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify ownership and delete
    const result = await queryOne(
      `DELETE FROM elder_profiles WHERE id = $1 AND caregiver_id = $2 RETURNING id`,
      [elderId, userId]
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    // Invalidate caches
    await invalidatePattern(`elders:${userId}*`);
    await invalidatePattern(`alerts:${userId}*`);
    await cacheDelete(`agent-config:${elderId}`);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting elder:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
