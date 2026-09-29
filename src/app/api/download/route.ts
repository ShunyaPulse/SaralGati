import { serveApkDownload } from '@/server/app/apkDownload';

/**
 * GET /api/download - redirect to the latest APK release.
 * Logic: src/server/app/apkDownload.ts.
 */
export async function GET() {
  return serveApkDownload();
}
