import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';

const GITHUB_RELEASE_APK_URL = 'https://github.com/ShunyaPulse/SaralGati/releases/download/android-latest/app-debug.apk';

export async function GET() {
  try {
    // If GitHub release is available, redirect directly to always get the latest compiled APK
    return NextResponse.redirect(GITHUB_RELEASE_APK_URL, {
      status: 302,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    // Fallback: serve local bundled APK if redirect fails
    try {
      const filePath = join(process.cwd(), 'public', 'downloads', 'saralgati.apk');
      await stat(filePath);

      const stream = createReadStream(filePath);
      const readableWebStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        },
      });

      return new NextResponse(readableWebStream, {
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="saralgati.apk"',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (fallbackError: any) {
      console.error('Error serving fallback APK:', fallbackError);
      return new NextResponse('File not found', { status: 500 });
    }
  }
}

