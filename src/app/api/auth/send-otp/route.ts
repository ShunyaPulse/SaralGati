import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { sendOtp } from '@/server/auth/sendOtp';

/**
 * POST /api/auth/send-otp - mail a one-time code for sign-up or sign-in.
 * Logic: src/server/auth/sendOtp.ts.
 */
export async function POST(req: NextRequest) {
  return toResponse(await sendOtp(req));
}
