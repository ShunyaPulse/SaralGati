const fs = require('fs');
const filepath = 'src/app/api/auth/register/route.ts';
let code = fs.readFileSync(filepath, 'utf8');

let search = `import { rateLimiter, cacheGet, cacheDelete, cacheSet } from '@/lib/redis';`;
let replace = `import { rateLimiter, cacheGet, cacheDelete, cacheSet, getSubnet } from '@/lib/redis';
import { cookies } from 'next/headers';`;
code = code.replace(search, replace);

search = `    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = await rateLimiter(\`register:\${ip}\`, 5, 3600); // 5 accounts per hour per IP

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }`;

replace = `    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;

    // IP Rate Limit
    const rateLimit = await rateLimiter(\`register:\${ip}\`, 5, 3600); // 5 accounts per hour per IP
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Subnet Rate Limit
    const subnetLimit = await rateLimiter(\`register_subnet:\${subnet}\`, 20, 3600);
    if (!subnetLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts from this network. Please try again later.' },
        { status: 429 }
      );
    }

    // Device Fingerprint Rate Limit
    if (devId) {
      const devLimit = await rateLimiter(\`register_dev:\${devId}\`, 3, 3600);
      if (!devLimit.allowed) {
        return NextResponse.json(
          { error: 'Too many registration attempts from this device. Please try again later.' },
          { status: 429 }
        );
      }
    }`;
code = code.replace(search, replace);

fs.writeFileSync(filepath, code);
