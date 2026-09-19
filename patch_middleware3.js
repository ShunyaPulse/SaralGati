const fs = require('fs');
const filepath = 'src/middleware.ts';
let code = fs.readFileSync(filepath, 'utf8');

const search = `    // 2. CSP Nonce Generation
    const nonce = btoa(crypto.randomUUID());

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
    res.headers.set('x-nonce', nonce);`;

const replace = `    // 2. CSP Nonce Generation
    const nonce = btoa(crypto.randomUUID());

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
    resWithReqHeaders.headers.set('x-nonce', nonce);`;

code = code.replace(search, replace);

const search2 = `    const res = NextResponse.next();

    // 1. Device Fingerprint Cookie
    if (!req.cookies.has('__sg_dev_id')) {
      const devId = crypto.randomUUID();
      res.cookies.set('__sg_dev_id', devId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }`;

const replace2 = `    // 1. Device Fingerprint Cookie
    let devId = req.cookies.get('__sg_dev_id')?.value;
    if (!devId) {
      devId = crypto.randomUUID();
    }`;

code = code.replace(search2, replace2);

const search3 = `    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.headers.set('X-Frame-Options', 'SAMEORIGIN');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-XSS-Protection', '1; mode=block');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
    res.headers.set('X-DNS-Prefetch-Control', 'on');

    return res;`;

const replace3 = `    resWithReqHeaders.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    resWithReqHeaders.headers.set('X-Frame-Options', 'SAMEORIGIN');
    resWithReqHeaders.headers.set('X-Content-Type-Options', 'nosniff');
    resWithReqHeaders.headers.set('X-XSS-Protection', '1; mode=block');
    resWithReqHeaders.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    resWithReqHeaders.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
    resWithReqHeaders.headers.set('X-DNS-Prefetch-Control', 'on');

    return resWithReqHeaders;`;

code = code.replace(search3, replace3);
fs.writeFileSync(filepath, code);
