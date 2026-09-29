import { toResponse } from '@/server/http';
import { getAppVersion } from '@/server/app/version';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/app/version - latest release metadata for the update check.
 * Logic: src/server/app/version.ts.
 */
export async function GET() {
  return toResponse(await getAppVersion());
}
