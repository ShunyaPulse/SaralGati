import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { createAlert, listAlerts } from '@/server/alerts/alerts';

/**
 * GET /api/alerts - the caregiver alert feed.
 * POST /api/alerts - a signed alert raised by the companion app.
 * Logic: src/server/alerts/alerts.ts.
 */
export async function GET(request: NextRequest) {
  return toResponse(await listAlerts(request));
}

export async function POST(request: NextRequest) {
  return toResponse(await createAlert(request));
}
