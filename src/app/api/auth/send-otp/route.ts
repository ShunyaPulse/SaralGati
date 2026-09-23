import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimiter, cacheSet, cacheGet, getSubnet } from '@/lib/redis';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { queryOne } from '@/lib/db';
import { verifyTurnstile } from '@/lib/turnstile';
import crypto from 'crypto';

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.enum(['register', 'login']),
  turnstileToken: z.string().min(1, 'Security check (Turnstile) is required'),
  website: z.string().optional(), // Honeypot field — must be empty
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;
    
    const rateLimit = await rateLimiter(`send-otp:${ip}`, 5, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const subnetLimit = await rateLimiter(`send-otp_subnet:${subnet}`, 20, 3600);
    if (!subnetLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests from this network. Please try again later.' },
        { status: 429 }
      );
    }

    if (devId) {
      const devLimit = await rateLimiter(`send-otp_dev:${devId}`, 3, 3600);
      if (!devLimit.allowed) {
        return NextResponse.json(
          { error: 'Too many requests from this device. Please try again later.' },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const result = sendOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, type, turnstileToken, website } = result.data;

    // Honeypot trap: if hidden field is filled, reject (bot detected)
    if (website) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Enforce Turnstile verification at OTP request level FIRST
    const isTurnstileValid = await verifyTurnstile(turnstileToken, ip);
    if (!isTurnstileValid) {
      return NextResponse.json({ error: 'Security verification failed. Please try again.' }, { status: 400 });
    }

    // 2. 60-second resend cooldown per email
    const cooldownKey = `otp_cooldown:${type}:${cleanEmail}`;
    const isOnCooldown = await cacheGet<string>(cooldownKey);
    if (isOnCooldown) {
      return NextResponse.json(
        { error: 'Please wait 60 seconds before requesting a new OTP.' },
        { status: 429 }
      );
    }

    // Store successful Turnstile verification in Redis (expires in 10 minutes)
    await cacheSet(`turnstile_verified:${cleanEmail}`, 'true', 600);

    if (type === 'register') {
      const existingUser = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
        [cleanEmail]
      );
      if (existingUser) {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 400 });
      }
    } else if (type === 'login') {
      const existingUser = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
        [cleanEmail]
      );
      if (!existingUser) {
        return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 });
      }
    }

    // Generate 6-digit OTP using CSPRNG (hardware entropy)
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Save OTP to Redis (expires in 10 minutes)
    await cacheSet(`otp:${type}:${cleanEmail}`, otp, 600);
    // Reset attempt counter on new OTP
    await cacheSet(`otp_attempts:${type}:${cleanEmail}`, 0, 600);
    // Set 60-second cooldown
    await cacheSet(cooldownKey, 'true', 60);

    // Send Email
    console.log(`[OTP] Generated CSPRNG OTP for ${cleanEmail} (${type})`);

    const port = Number(process.env.SMTP_PORT) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@saralgati.com',
        to: cleanEmail,
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
