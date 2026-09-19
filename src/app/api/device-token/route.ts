import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { elderId } = body;
    const userId = session.user.id;

    if (!elderId) {
      return NextResponse.json({ success: false, error: 'elderId is required' }, { status: 400 });
    }

    // Verify ownership
    const elder = await queryOne<{ id: string; elder_name: string }>(
      `SELECT id, elder_name FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`,
      [elderId, userId]
    );
    if (!elder) {
      return NextResponse.json({ success: false, error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    // Generate bearer token: sg_ + 32 random hex chars
    const plainToken = `sg_${randomBytes(16).toString('hex')}`;

    // Save token in DB
    const updated = await queryOne(`
      UPDATE elder_profiles 
      SET device_token = $1, updated_at = NOW() 
      WHERE id = $2 RETURNING id
    `, [plainToken, elderId]);

    if (!updated) {
      throw new Error('Failed to save device token');
    }

    // Cache in Redis device session for 30 days
    try {
      const { setDeviceSession } = await import('@/lib/redis');
      await setDeviceSession(plainToken, { elderId: elder.id, caregiverId: userId }, 30 * 86400);
    } catch (redisErr) {
      console.error('Failed to cache device session in Redis:', redisErr);
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        token: plainToken,
        elderId: elder.id,
        elderName: elder.elder_name,
        apiUrl: process.env.NEXTAUTH_URL || 'https://saralgati-685823552970.asia-south1.run.app'
      } 
    });
  } catch (error) {
    console.error('Error generating device token:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
