import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'downloads', 'saralgati.apk');
    await stat(filePath); // Just to verify it exists

    const stream = createReadStream(filePath);
    
    const readableWebStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      }
    });

    return new NextResponse(readableWebStream, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="saralgati.apk"',
        // CRITICAL: DO NOT set Content-Length! 
        // This forces Next.js to use Transfer-Encoding: chunked
        // which completely bypasses the Cloud Run 32MB response limit!
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error serving APK:', error);
    return new NextResponse('File not found', { status: 500 });
  }
}
