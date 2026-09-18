import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimiter } from '@/lib/redis';
import { cacheSet } from '@/lib/redis';
import nodemailer from 'nodemailer';
import { queryOne } from '@/lib/db';

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.enum(['register', 'login']),
  turnstileToken: z.string().optional(),
});

async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error('Turnstile verification failed', error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = await rateLimiter(`send-otp:${ip}`, 5, 3600);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = sendOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, type, turnstileToken } = result.data;

    if (type === 'register') {
      if (!turnstileToken) {
        return NextResponse.json({ error: 'Turnstile token required' }, { status: 400 });
      }
      const isTurnstileValid = await verifyTurnstile(turnstileToken);
      if (!isTurnstileValid) {
        return NextResponse.json({ error: 'Invalid Turnstile token' }, { status: 400 });
      }
      
      const existingUser = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }
    } else if (type === 'login') {
      const existingUser = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to Redis (expires in 10 minutes)
    await cacheSet(`otp:${type}:${email}`, otp, 600);

    // Send Email
    console.log(`[OTP] Generated ${otp} for ${email} (${type})`);

    const port = Number(process.env.SMTP_PORT) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@saralgati.com',
        to: email,
        subject: `Your ${type === 'register' ? 'Registration' : 'Login'} OTP - SaralGati`,
        text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
      });
    } else {
      console.log('SMTP credentials not configured, skipping email delivery.');
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
