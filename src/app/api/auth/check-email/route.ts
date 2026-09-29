import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { checkEmail } from '@/server/auth/checkEmail';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/check-email - whether an address is already registered.
 * Logic: src/server/auth/checkEmail.ts.
 */
export async function GET(req: NextRequest) {
  return toResponse(await checkEmail(req));
}
