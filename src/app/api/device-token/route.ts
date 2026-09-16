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
    const elder = await queryOne(`SELECT id FROM elder_profiles WHERE id = $1 AND caregiver_id = $2`, [elderId, userId]);
    if (!elder) {
      return NextResponse.json({ success: false, error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    // Generate token (plain text for the user)
    // Format: sg_ + 32 random hex chars
    const plainToken = `sg_${randomBytes(16).toString('hex')}`;
    
    // Hash token for database storage
    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(plainToken, salt);

    // Save hashed token in DB
    const updated = await queryOne(`
      UPDATE elder_profiles 
      SET device_token = $1, updated_at = NOW() 
      WHERE id = $2 RETURNING id
    `, [hashedToken, elderId]);

    if (!updated) {
      throw new Error('Failed to save device token');
    }

    // Return the plain token exactly once
    return NextResponse.json({ 
      success: true, 
      data: { token: plainToken } 
    });
  } catch (error) {
    console.error('Error generating device token:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
