import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  tls: redisUrl.startsWith('rediss://') ? {} : undefined,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
  commandTimeout: 2000,
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis cacheGet Error:', error);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (error) {
    console.error('Redis cacheSet Error:', error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis cacheDelete Error:', error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (error) {
    console.error('Redis invalidatePattern Error:', error);
  }
}

export function getSubnet(ip: string): string {
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

export async function rateLimiter(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    const member = `${now}-${Math.random().toString(36).substring(2)}`;
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
    console.error('Redis rateLimiter Error:', error);
    // Graceful degradation: allow request if Redis fails
    return { allowed: true, remaining: 1 };
  }
}

export async function deduplicateAlert(elderId: string, eventType: string, windowSeconds: number = 300): Promise<boolean> {
  try {
    const key = `alert_dedup:${elderId}:${eventType}`;
    const exists = await redis.exists(key);
    if (exists) {
      return true; // Is duplicate
    }
    await redis.setex(key, windowSeconds, '1');
    return false; // Not duplicate
  } catch (error) {
    console.error(`Redis deduplicateAlert Error:`, error);
    return false; // Process alert if Redis fails
  }
}

export async function setDeviceSession(token: string, data: { elderId: string; caregiverId: string }, ttlSeconds: number = 86400): Promise<void> {
  await cacheSet(`device_session:${token}`, data, ttlSeconds);
}

export async function getDeviceSession(token: string): Promise<{ elderId: string; caregiverId: string } | null> {
  return await cacheGet<{ elderId: string; caregiverId: string }>(`device_session:${token}`);
}

export default redis;
