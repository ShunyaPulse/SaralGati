import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
export default withAuth(
  function middleware(req) {
    // 1. Device Fingerprint Cookie
    let devId = req.cookies.get('__sg_dev_id')?.value;
    if (!devId) {
      devId = crypto.randomUUID();
    }

    // 2. CSP Nonce Generation
    const nonce = btoa(crypto.randomUUID());

    const cspHeader = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://challenges.cloudflare.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https: blob:;
      font-src 'self' data:;
      connect-src 'self' https://challenges.cloudflare.com;
      frame-src 'self' https://challenges.cloudflare.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s{2,}/g, ' ').trim();

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', cspHeader);

    const resWithReqHeaders = NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });

    // Copy cookies
    resWithReqHeaders.cookies.set('__sg_dev_id', devId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    resWithReqHeaders.headers.set('Content-Security-Policy', cspHeader);
    resWithReqHeaders.headers.set('x-nonce', nonce);

    resWithReqHeaders.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    resWithReqHeaders.headers.set('X-Frame-Options', 'SAMEORIGIN');
    resWithReqHeaders.headers.set('X-Content-Type-Options', 'nosniff');
    resWithReqHeaders.headers.set('X-XSS-Protection', '1; mode=block');
    resWithReqHeaders.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    resWithReqHeaders.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
    resWithReqHeaders.headers.set('X-DNS-Prefetch-Control', 'on');

    return resWithReqHeaders;
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith('/dashboard') || path.startsWith('/elders') || path.startsWith('/alerts') || path.startsWith('/settings')) {
          return !!token;
        }
        return true;
      }
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
