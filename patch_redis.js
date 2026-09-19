const fs = require('fs');
const filepath = 'src/lib/redis.ts';
let code = fs.readFileSync(filepath, 'utf8');

const search = `export async function rateLimiter(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const key = \`ratelimit:\${identifier}\`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current)
    };
  } catch (error) {
    console.error(\`Redis rateLimiter Error for identifier \${identifier}:\`, error);
    // Graceful degradation: allow request if Redis fails
    return { allowed: true, remaining: 1 };
  }
}`;

const replace = `export async function rateLimiter(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const key = \`ratelimit:\${identifier}\`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    const member = \`\${now}-\${Math.random().toString(36).substring(2)}\`;
    pipeline.zadd(key, now, member);
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();

    if (!results) {
      return { allowed: true, remaining: 1 };
    }

    const requestCount = results[2][1] as number;

    return {
      allowed: requestCount <= limit,
      remaining: Math.max(0, limit - requestCount)
    };
  } catch (error) {
    console.error(\`Redis rateLimiter Error for identifier \${identifier}:\`, error);
    // Graceful degradation: allow request if Redis fails
    return { allowed: true, remaining: 1 };
  }
}`;

code = code.replace(search, replace);
fs.writeFileSync(filepath, code);
