import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db';
import { rateLimiter, cacheGet, cacheDelete, cacheSet } from '@/lib/redis';
import { verifyTurnstile } from '@/lib/turnstile';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  otp: z.string().min(6, 'OTP must be 6 characters'),
  turnstileToken: z.string().optional(),
  website: z.string().optional(), // Honeypot field — must be empty
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = await rateLimiter(`register:${ip}`, 5, 3600); // 5 accounts per hour per IP
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, otp, turnstileToken, website } = result.data;

    // Honeypot trap: if hidden field is filled, silently reject (bot detected)
    if (website) {
      return NextResponse.json({ success: true, user: { id: 'ok' } }, { status: 201 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Enforce Turnstile verification at Sign Up level
    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken, ip);
      if (!isTurnstileValid) {
        return NextResponse.json({ error: 'Turnstile security check failed' }, { status: 400 });
      }
    } else {
      const wasTurnstileVerified = await cacheGet<string>(`turnstile_verified:${cleanEmail}`);
      if (!wasTurnstileVerified) {
        return NextResponse.json({ error: 'Security verification required before registration' }, { status: 400 });
      }
    }

    // OTP attempt capping: max 5 invalid attempts before auto-wipe
    const attemptKey = `otp_attempts:register:${cleanEmail}`;
    const attempts = await cacheGet<number>(attemptKey) || 0;
    if (attempts >= 5) {
      // Auto-wipe OTP after 5 failed attempts
      await cacheDelete(`otp:register:${cleanEmail}`);
      await cacheDelete(attemptKey);
      return NextResponse.json(
        { error: 'Too many invalid OTP attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Verify OTP
    const storedOtp = await cacheGet<string>(`otp:register:${cleanEmail}`);
    if (!storedOtp || storedOtp !== otp) {
      // Increment attempt counter
      await cacheSet(attemptKey, (attempts + 1), 600);
      return NextResponse.json(
        { error: `Invalid or expired OTP. ${4 - attempts} attempts remaining.` },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
      [cleanEmail]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 400 }
      );
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

    return NextResponse.json(
      { success: true, user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
