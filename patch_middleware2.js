const fs = require('fs');
const filepath = 'src/middleware.ts';
let code = fs.readFileSync(filepath, 'utf8');

const search = `import crypto from 'crypto';

export default withAuth(
  function middleware(req) {
    const res = NextResponse.next();

    // 1. Device Fingerprint Cookie
    if (!req.cookies.has('__sg_dev_id')) {
      const devId = crypto.randomUUID();
      res.cookies.set('__sg_dev_id', devId, {`;

const replace = `export default withAuth(
  function middleware(req) {
    const res = NextResponse.next();

    // 1. Device Fingerprint Cookie
    if (!req.cookies.has('__sg_dev_id')) {
      const devId = crypto.randomUUID();
      res.cookies.set('__sg_dev_id', devId, {`;

code = code.replace(search, replace);

const search2 = `    // 2. CSP Nonce Generation
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');`;
const replace2 = `    // 2. CSP Nonce Generation
    const nonce = btoa(crypto.randomUUID());`;

code = code.replace(search2, replace2);

fs.writeFileSync(filepath, code);
