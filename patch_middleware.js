const fs = require('fs');
const filepath = 'src/middleware.ts';
let code = fs.readFileSync(filepath, 'utf8');

const search = `import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/elders/:path*', '/alerts/:path*', '/settings/:path*'],
};`;

const replace = `import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export default withAuth(
  function middleware(req) {
    const res = NextResponse.next();

    // 1. Device Fingerprint Cookie
    if (!req.cookies.has('__sg_dev_id')) {
      const devId = crypto.randomUUID();
      res.cookies.set('__sg_dev_id', devId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    // 2. CSP Nonce Generation
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    const cspHeader = \`
      default-src 'self';
      script-src 'self' 'nonce-\${nonce}' 'strict-dynamic' 'unsafe-eval' https://challenges.cloudflare.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https: blob:;
      font-src 'self' data:;
      connect-src 'self' https://challenges.cloudflare.com;
      frame-src 'self' https://challenges.cloudflare.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
    \`.replace(/\\s{2,}/g, ' ').trim();

    res.headers.set('Content-Security-Policy', cspHeader);
    res.headers.set('x-nonce', nonce);

    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.headers.set('X-Frame-Options', 'SAMEORIGIN');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-XSS-Protection', '1; mode=block');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
    res.headers.set('X-DNS-Prefetch-Control', 'on');

    return res;
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
};`;

code = code.replace(search, replace);
fs.writeFileSync(filepath, code);
