import { fail, type ServiceResult } from '@/server/http';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { queryOne } from '@/lib/data/db';
import { rateLimiter, cacheGet, cacheDelete, cacheSet, getSubnet } from '@/lib/data/redis';
import { cookies } from 'next/headers';
import { verifyTurnstile } from '@/lib/auth/turnstile';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  otp: z.string().min(6, 'OTP must be 6 characters'),
  turnstileToken: z.string().optional(),
  website: z.string().optional(), // Honeypot field — must be empty
});

/**
 * POST /api/auth/register - caregiver sign-up.
 *
 * The OTP is verified here rather than in the NextAuth callback because the
 * account must not exist until the mailed code has been presented.
 */
export async function registerCaregiver(req: Request): Promise<ServiceResult> {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;

    // IP Rate Limit
    const rateLimit = await rateLimiter(`register:${ip}`, 5, 3600); // 5 accounts per hour per IP
    if (!rateLimit.allowed) {
      return fail(429, { error: 'Too many registration attempts. Please try again later.' });
    }

    // Subnet Rate Limit
    const subnetLimit = await rateLimiter(`register_subnet:${subnet}`, 20, 3600);
    if (!subnetLimit.allowed) {
      return fail(429, { error: 'Too many registration attempts from this network. Please try again later.' });
    }

    // Device Fingerprint Rate Limit
    if (devId) {
      const devLimit = await rateLimiter(`register_dev:${devId}`, 3, 3600);
      if (!devLimit.allowed) {
        return fail(429, { error: 'Too many registration attempts from this device. Please try again later.' });
      }
    }

    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return fail(400, { error: result.error.issues[0].message });
    }

    const { name, email, password, otp, turnstileToken, website } = result.data;

    // Honeypot trap: if hidden field is filled, silently reject (bot detected)
    if (website) {
      return fail(201, { success: true, user: { id: 'ok' } });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Enforce Turnstile verification at Sign Up level
    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken, ip);
      if (!isTurnstileValid) {
        return fail(400, { error: 'Turnstile security check failed' });
      }
    } else {
      const wasTurnstileVerified = await cacheGet<string>(`turnstile_verified:${cleanEmail}`);
      if (!wasTurnstileVerified) {
        return fail(400, { error: 'Security verification required before registration' });
      }
    }

    // OTP attempt capping: max 5 invalid attempts before auto-wipe
    const attemptKey = `otp_attempts:register:${cleanEmail}`;
    const attempts = await cacheGet<number>(attemptKey) || 0;
    if (attempts >= 5) {
      // Auto-wipe OTP after 5 failed attempts
      await cacheDelete(`otp:register:${cleanEmail}`);
      await cacheDelete(attemptKey);
      return fail(429, { error: 'Too many invalid OTP attempts. Please request a new code.' });
    }

    // Verify OTP
    const storedOtp = await cacheGet<string>(`otp:register:${cleanEmail}`);
    if (!storedOtp || storedOtp !== otp) {
      // Increment attempt counter
      await cacheSet(attemptKey, (attempts + 1), 600);
      return fail(400, { error: `Invalid or expired OTP. ${4 - attempts} attempts remaining.` });
    }

    // Check if user already exists
    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
      [cleanEmail]
    );

    if (existingUser) {
      return fail(400, { error: 'An account with this email already exists. Please sign in instead.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const newUser = await queryOne<{ id: string; email: string; name: string }>(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'caregiver')
      RETURNING id, email, name
      `,
      [name.trim(), cleanEmail, hashedPassword]
    );

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Clear OTP, attempts & Turnstile verification
    await cacheDelete(`otp:register:${cleanEmail}`);
    await cacheDelete(attemptKey);
    await cacheDelete(`turnstile_verified:${cleanEmail}`);

    return fail(201, { success: true, user: newUser });
  } catch (error) {
    console.error('Registration error:', error);
    return fail(500, { error: 'Internal server error' });
  }
}
