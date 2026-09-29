import { toResponse } from '@/server/http';
import { getTurnstileConfig } from '@/server/auth/turnstileConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/turnstile-config - the public Turnstile site key.
 * Logic: src/server/auth/turnstileConfig.ts.
 */
export async function GET() {
  return toResponse(await getTurnstileConfig());
}
