import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// 20 req/min por IP para rutas públicas
const publicLimiter = new Ratelimit({
  redis: { pipeline: () => getRedis().pipeline() } as unknown as Redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'rl:public',
});

// 100 req/min por API Key para rutas B2B
const apiLimiter = new Ratelimit({
  redis: { pipeline: () => getRedis().pipeline() } as unknown as Redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'rl:api',
});

interface RateLimitResult {
  limited: boolean;
  retryAfter?: number;
}

export async function checkRateLimit(
  identifier: string,
  pathname: string
): Promise<RateLimitResult> {
  try {
    const r = getRedis();
    const isApi = pathname.startsWith('/api/v1');
    const limiter = isApi
      ? new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(100, '1 m'), prefix: 'rl:api' })
      : new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:public' });

    const { success, reset } = await limiter.limit(identifier);
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return { limited: true, retryAfter };
    }
    return { limited: false };
  } catch {
    // Si Redis no está disponible, no bloquear
    return { limited: false };
  }
}
