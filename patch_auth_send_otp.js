const fs = require('fs');
const filepath = 'src/app/api/auth/send-otp/route.ts';
let code = fs.readFileSync(filepath, 'utf8');

let search = `import { rateLimiter, cacheSet, cacheGet } from '@/lib/redis';`;
let replace = `import { rateLimiter, cacheSet, cacheGet, getSubnet } from '@/lib/redis';
import { cookies } from 'next/headers';`;
code = code.replace(search, replace);

search = `    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = await rateLimiter(\`send-otp:\${ip}\`, 5, 3600);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }`;

replace = `    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;

    const rateLimit = await rateLimiter(\`send-otp:\${ip}\`, 5, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const subnetLimit = await rateLimiter(\`send-otp_subnet:\${subnet}\`, 20, 3600);
    if (!subnetLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests from this network. Please try again later.' },
        { status: 429 }
      );
    }

    if (devId) {
      const devLimit = await rateLimiter(\`send-otp_dev:\${devId}\`, 3, 3600);
      if (!devLimit.allowed) {
        return NextResponse.json(
          { error: 'Too many requests from this device. Please try again later.' },
          { status: 429 }
        );
      }
    }`;
code = code.replace(search, replace);

fs.writeFileSync(filepath, code);
