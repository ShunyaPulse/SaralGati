import { fail, ok, type ServiceResult } from '@/server/http';
import { queryOne } from '@/lib/data/db';
import { rateLimiter, getSubnet } from '@/lib/data/redis';
import { cookies } from 'next/headers';

/** GET /api/auth/check-email - sign-up availability probe, rate limited three ways. */
export async function checkEmail(req: Request): Promise<ServiceResult> {
  try {
    const { searchParams } = new URL(req.url);
    const rawEmail = searchParams.get('email');

    if (!rawEmail) {
      return fail(400, { error: 'Email parameter is required' });
    }

    const email = rawEmail.trim().toLowerCase();

    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(400, { error: 'Invalid email format' });
    }

    // Rate limit check requests per IP: 60 checks per minute
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;

    const rateLimit = await rateLimiter(`check-email:${ip}`, 60, 60);
    if (!rateLimit.allowed) {
      return fail(429, { error: 'Too many requests. Please try again later.' });
    }

    const subnetLimit = await rateLimiter(`check-email_subnet:${subnet}`, 300, 60);
    if (!subnetLimit.allowed) {
      return fail(429, { error: 'Too many requests from this network. Please try again later.' });
    }

    if (devId) {
      const devLimit = await rateLimiter(`check-email_dev:${devId}`, 60, 60);
      if (!devLimit.allowed) {
        return fail(429, { error: 'Too many requests from this device. Please try again later.' });
      }
    }

    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
      [email]
    );

    return ok({
      exists: !!existingUser,
    });
  } catch (error) {
    console.error('Check email error:', error);
    return fail(500, { error: 'Internal server error' });
  }
}
