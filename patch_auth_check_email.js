const fs = require('fs');
const filepath = 'src/app/api/auth/check-email/route.ts';
let code = fs.readFileSync(filepath, 'utf8');

let search = `import { rateLimiter } from '@/lib/redis';`;
let replace = `import { rateLimiter, getSubnet } from '@/lib/redis';
import { cookies } from 'next/headers';`;
code = code.replace(search, replace);

search = `    // Rate limit check requests per IP: 60 checks per minute
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = await rateLimiter(\`check-email:\${ip}\`, 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }`;

replace = `    // Rate limit check requests per IP: 60 checks per minute
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;

    const rateLimit = await rateLimiter(\`check-email:\${ip}\`, 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const subnetLimit = await rateLimiter(\`check-email_subnet:\${subnet}\`, 300, 60);
    if (!subnetLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests from this network. Please try again later.' }, { status: 429 });
    }

    if (devId) {
      const devLimit = await rateLimiter(\`check-email_dev:\${devId}\`, 60, 60);
      if (!devLimit.allowed) {
        return NextResponse.json({ error: 'Too many requests from this device. Please try again later.' }, { status: 429 });
      }
    }`;
code = code.replace(search, replace);

fs.writeFileSync(filepath, code);
