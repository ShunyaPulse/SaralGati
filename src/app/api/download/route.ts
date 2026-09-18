import { NextResponse } from 'next/server';

export async function GET() {
  // Redirect to GitHub raw content to bypass all Cloud Run memory, bandwidth, and size limits
  return NextResponse.redirect('https://raw.githubusercontent.com/ShunyaPulse/SaralGati/main/public/downloads/saralgati.apk', {
    status: 302,
  });
}
