import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { rateLimiter } from '@/lib/redis';

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
    const rateLimit = await rateLimiter(`check-email:${ip}`, 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
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
