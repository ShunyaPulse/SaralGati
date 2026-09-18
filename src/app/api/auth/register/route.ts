import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db';
import { rateLimiter, cacheGet, cacheDelete } from '@/lib/redis';
import { verifyTurnstile } from '@/lib/turnstile';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  otp: z.string().min(6, 'OTP must be 6 characters'),
  turnstileToken: z.string().optional(),
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

    const { name, email, password, otp, turnstileToken } = result.data;

    // Enforce Turnstile verification at Sign Up level
    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken, ip);
      if (!isTurnstileValid) {
        return NextResponse.json({ error: 'Turnstile security check failed' }, { status: 400 });
      }
    } else {
      const wasTurnstileVerified = await cacheGet<string>(`turnstile_verified:${email}`);
      if (!wasTurnstileVerified) {
        return NextResponse.json({ error: 'Security verification required before registration' }, { status: 400 });
      }
    }

    // Verify OTP
    const storedOtp = await cacheGet<string>(`otp:register:${email}`);
    if (!storedOtp || storedOtp !== otp) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
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
      [name, email, hashedPassword]
    );

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Clear OTP & Turnstile verification
    await cacheDelete(`otp:register:${email}`);
    await cacheDelete(`turnstile_verified:${email}`);

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
