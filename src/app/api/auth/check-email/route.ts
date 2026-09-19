import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { rateLimiter, getSubnet } from '@/lib/redis';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawEmail = searchParams.get('email');

    if (!rawEmail) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();

    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Rate limit check requests per IP: 60 checks per minute
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;

    const rateLimit = await rateLimiter(`check-email:${ip}`, 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const subnetLimit = await rateLimiter(`check-email_subnet:${subnet}`, 300, 60);
    if (!subnetLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests from this network. Please try again later.' }, { status: 429 });
    }

    if (devId) {
      const devLimit = await rateLimiter(`check-email_dev:${devId}`, 60, 60);
      if (!devLimit.allowed) {
        return NextResponse.json({ error: 'Too many requests from this device. Please try again later.' }, { status: 429 });
      }
    }

    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
      [email]
    );

    return NextResponse.json({
      exists: !!existingUser,
    });
  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
