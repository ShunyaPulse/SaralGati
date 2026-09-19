const fs = require('fs');
const filepath = 'src/lib/redis.ts';
let code = fs.readFileSync(filepath, 'utf8');

const search = `export async function rateLimiter(`;

const replace = `export function getSubnet(ip: string): string {
  if (!ip || ip === 'anonymous' || ip === '::1' || ip === '127.0.0.1') return 'local';
  if (ip.includes(':')) {
    // IPv6: use first 4 blocks (/64 subnet)
    const blocks = ip.split(':');
    return blocks.slice(0, Math.min(4, blocks.length)).join(':') + '::/64';
  } else {
    // IPv4: use first 3 octets (/24 subnet)
    const octets = ip.split('.');
    if (octets.length === 4) {
      return octets.slice(0, 3).join('.') + '.0/24';
    }
    return ip;
  }
}

export async function rateLimiter(`;

code = code.replace(search, replace);
fs.writeFileSync(filepath, code);
