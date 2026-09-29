import type { NextRequest } from 'next/server';

import { toResponse } from '@/server/http';
import {
  deleteElder,
  getElder,
  replaceElder,
  updateElderPreferences,
} from '@/server/elders/elder';

/**
 * GET    /api/elders/:id - dashboard, companion app and pairing handshake.
 * PATCH  /api/elders/:id - caregiver preferences only.
 * PUT    /api/elders/:id - full profile edit.
 * DELETE /api/elders/:id - remove the profile.
 * Logic: src/server/elders/elder.ts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return toResponse(await getElder(request, id));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return toResponse(await updateElderPreferences(request, id));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return toResponse(await replaceElder(request, id));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return toResponse(await deleteElder(id));
}
