const fs = require('fs');
const filepath = 'src/app/api/v1/agent/ask/route.ts';
let code = fs.readFileSync(filepath, 'utf8');

let search = `import { rateLimiter } from '@/lib/redis';`;
let replace = `import { rateLimiter, getSubnet } from '@/lib/redis';
import { cookies } from 'next/headers';`;
code = code.replace(search, replace);

search = `    // IP Rate Limiting (30 requests per minute per IP or Elder ID)
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimitId = auth.elderId ? \`agent_ask:\${auth.elderId}\` : \`agent_ask:\${ip}\`;
    const rateLimit = await rateLimiter(rateLimitId, 30, 60);

    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }`;

replace = `    // IP Rate Limiting (30 requests per minute per IP or Elder ID)
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const subnet = getSubnet(ip);
    const cookieStore = await cookies();
    const devId = cookieStore.get('__sg_dev_id')?.value;

    const rateLimitId = auth.elderId ? \`agent_ask:\${auth.elderId}\` : \`agent_ask:\${ip}\`;
    const rateLimit = await rateLimiter(rateLimitId, 30, 60);

    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    if (!auth.elderId) {
      const subnetLimit = await rateLimiter(\`agent_ask_subnet:\${subnet}\`, 100, 60);
      if (!subnetLimit.allowed) {
        return NextResponse.json({ success: false, error: 'Too many requests from this network' }, { status: 429 });
      }

      if (devId) {
        const devLimit = await rateLimiter(\`agent_ask_dev:\${devId}\`, 30, 60);
        if (!devLimit.allowed) {
          return NextResponse.json({ success: false, error: 'Too many requests from this device' }, { status: 429 });
        }
      }
    }`;
code = code.replace(search, replace);

fs.writeFileSync(filepath, code);
