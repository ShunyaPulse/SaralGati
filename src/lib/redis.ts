import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Redis cacheGet Error for key ${key}:`, error);
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
    console.error(`Redis cacheSet Error for key ${key}:`, error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Redis cacheDelete Error for key ${key}:`, error);
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
    console.error(`Redis invalidatePattern Error for pattern ${pattern}:`, error);
  }
}

export async function rateLimiter(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current)
    };
  } catch (error) {
    console.error(`Redis rateLimiter Error for identifier ${identifier}:`, error);
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
