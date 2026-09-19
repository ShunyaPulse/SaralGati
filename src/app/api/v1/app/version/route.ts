import { NextResponse } from 'next/server';
import versionData from '../../../../../../version.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: versionData
  });
}
