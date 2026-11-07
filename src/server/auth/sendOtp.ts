import { fail, ok, type ServiceResult } from '@/server/http';
import { z } from 'zod';
import { rateLimiter, cacheSet, cacheGet, cacheDelete, getSubnet, getClientIp } from '@/lib/data/redis';
import { cookies } from 'next/headers';
import { createMailer } from '@/lib/notify/mailer';
import { queryOne } from '@/lib/data/db';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { isScannerOrTestProbe, verifyDomainHasDeliverableMx } from '@/lib/auth/emailShield';
import crypto from 'crypto';

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.enum(['register', 'login']),
  turnstileToken: z.string().min(1, 'Security check (Turnstile) is required'),
  website: z.string().optional(), // Honeypot field — must be empty
});

/** POST /api/auth/send-otp - mail a one-time code for sign-up or sign-in. */
export async function sendOtp(req: Request): Promise<ServiceResult> {
  try {
    const ip = getClientIp(req);
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;

    const rateLimit = await rateLimiter(`send-otp:${ip}`, 5, 3600);
    if (!rateLimit.allowed) {
      return fail(429, { error: 'Too many requests. Please try again later.' });
    }

    // Short-term burst protection: Max 2 OTP sends per 10 minutes per IP
    const burstIpLimit = await rateLimiter(`send-otp_burst_ip:${ip}`, 2, 600);
    if (!burstIpLimit.allowed) {
      return fail(429, { error: 'Too many verification attempts from this IP address. Please wait a few minutes.' });
    }

    const subnetLimit = await rateLimiter(`send-otp_subnet:${subnet}`, 20, 3600);
    if (!subnetLimit.allowed) {
      return fail(429, { error: 'Too many requests from this network. Please try again later.' });
    }

    // Short-term burst protection: Max 4 OTP sends per 10 minutes per subnet
    const burstSubnetLimit = await rateLimiter(`send-otp_burst_subnet:${subnet}`, 4, 600);
    if (!burstSubnetLimit.allowed) {
      return fail(429, { error: 'Too many verification requests from this network. Please wait a few minutes.' });
    }

    if (devId) {
      const devLimit = await rateLimiter(`send-otp_dev:${devId}`, 3, 3600);
      if (!devLimit.allowed) {
        return fail(429, { error: 'Too many requests from this device. Please try again later.' });
      }
    }

    const body = await req.json();
    const result = sendOtpSchema.safeParse(body);

    if (!result.success) {
      return fail(400, { error: result.error.issues[0].message });
    }

    const { email, type, turnstileToken, website } = result.data;

    // Honeypot trap: silent tarpit without alerting the bot
    if (website) {
      await new Promise((r) => setTimeout(r, 400));
      return ok({ success: true, message: 'If an account exists with this email, a verification code has been sent.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1A. Silent Tarpit for RFC Test & Scanner Domains (probe.*, example.com, etc.)
    if (isScannerOrTestProbe(cleanEmail)) {
      await new Promise((r) => setTimeout(r, 300));
      return ok({ success: true, message: 'If an account exists with this email, a verification code has been sent.' });
    }

    // 1B. Pre-Flight DNS MX Verification (Reject unroutable domains before touching SMTP)
    const atIdx = cleanEmail.lastIndexOf('@');
    if (atIdx === -1) {
      return fail(400, { error: 'Invalid email address.' });
    }
    const domain = cleanEmail.slice(atIdx + 1);
    const hasDeliverableMx = await verifyDomainHasDeliverableMx(domain);
    if (!hasDeliverableMx) {
      return fail(400, { error: 'The specified email domain cannot receive incoming messages.' });
    }

    // 1C. Per-Email 24-Hour Budget: Max 5 OTP sends per 24 hours
    const emailDailyLimit = await rateLimiter(`send-otp_email_daily:${cleanEmail}`, 5, 86400);
    if (!emailDailyLimit.allowed) {
      return fail(429, { error: 'Daily verification limit reached for this email. Please try again tomorrow.' });
    }

    // 1D. Enforce Turnstile verification at OTP request level FIRST
    const isTurnstileValid = await verifyTurnstile(turnstileToken, ip);
    if (!isTurnstileValid) {
      return fail(400, { error: 'Security verification failed. Please try again.' });
    }

    // 2. 30-second resend cooldown per email
    const cooldownKey = `otp_cooldown:${type}:${cleanEmail}`;
    const isOnCooldown = await cacheGet<string>(cooldownKey);
    if (isOnCooldown) {
      return fail(429, { error: 'Please wait 30 seconds before requesting a new OTP.' });
    }

    // Store successful Turnstile verification in Redis (expires in 10 minutes)
    await cacheSet(`turnstile_verified:${cleanEmail}`, 'true', 600);

    if (type === 'register') {
      const existingUser = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
        [cleanEmail]
      );
      if (existingUser) {
        return fail(400, { error: 'An account with this email already exists. Please sign in instead.' });
      }
    } else if (type === 'login') {
      const existingUser = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
        [cleanEmail]
      );
      if (!existingUser) {
        // Return uniform success to prevent account enumeration
        return ok({ message: 'If an account exists with this email, a verification code has been sent.' });
      }
    }

    // Generate 6-digit OTP using CSPRNG (hardware entropy)
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Save OTP to Redis (expires in 10 minutes)
    await cacheSet(`otp:${type}:${cleanEmail}`, otp, 600);
    // Reset attempt counter on new OTP
    await cacheSet(`otp_attempts:${type}:${cleanEmail}`, 0, 600);

    // Never report success for an OTP we could not deliver: the UI would tell
    // the elder's family to check an inbox that will never receive anything.
    const clearPendingOtp = async () => {
      await cacheDelete(`otp:${type}:${cleanEmail}`);
      await cacheDelete(`otp_attempts:${type}:${cleanEmail}`);
    };

    const transporter = createMailer();

    if (!transporter) {
      console.error('SMTP is not configured (SMTP_USER / SMTP_PASS missing); OTP cannot be delivered.');
      await clearPendingOtp();
      return fail(503, { error: 'Email delivery is not configured. Please contact support.' });
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@saralgati.com',
        to: cleanEmail,
        subject: `Your ${type === 'register' ? 'Registration' : 'Login'} OTP - SaralGati`,
        text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
      });
    } catch (mailError) {
      console.error('Failed to deliver OTP email:', mailError);
      await clearPendingOtp();
      return fail(502, { error: 'Could not send the verification code. Please try again.' });
    }

    // Only start the resend cooldown once delivery actually succeeded.
    await cacheSet(cooldownKey, 'true', 30);

    return ok({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return fail(500, { error: 'Internal server error' });
  }
}
