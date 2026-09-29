import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { registerCaregiver } from '@/server/auth/register';

/**
 * POST /api/auth/register - caregiver sign-up (OTP + Turnstile gated).
 * Logic: src/server/auth/register.ts.
 */
export async function POST(req: NextRequest) {
  return toResponse(await registerCaregiver(req));
}
