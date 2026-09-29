import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import { sendContactMessage } from '@/server/contact';

/**
 * POST /api/contact - the public contact form.
 * Logic: src/server/contact.ts.
 */
export async function POST(req: NextRequest) {
  return toResponse(await sendContactMessage(req));
}
