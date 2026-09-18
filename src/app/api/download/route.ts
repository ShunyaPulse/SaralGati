import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'downloads', 'saralgati.apk');
    const stats = await stat(filePath);

    const stream = createReadStream(filePath);
    
    // Convert Node.js readable stream to Web ReadableStream
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
        'Content-Length': stats.size.toString(),
        'Content-Disposition': 'attachment; filename="saralgati.apk"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error serving APK:', error);
    return new NextResponse(error.message + " | path: " + join(process.cwd(), 'public', 'downloads', 'saralgati.apk'), { status: 500 });
  }
}
