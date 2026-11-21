export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Extracts client IP from Request headers (x-forwarded-for, cf-connecting-ip).
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Rate-limit helper using Upstash Redis REST API.
 * Graceful no-op (allowed = true) if UPSTASH_REDIS_REST_URL or token is unset,
 * or on any network or API error.
 */
export async function checkUpstashRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL")?.trim();
  const redisToken =
    Deno.env.get("UPSTASH_REDIS_REST_TOKEN")?.trim() ||
    Deno.env.get("UPSTASH_REDIS_TOKEN")?.trim();

  if (!redisUrl || !redisToken) {
    return { allowed: true, remaining: maxRequests };
  }

  try {
    const cleanUrl = redisUrl.replace(/\/+$/, "");
    const resp = await fetch(`${cleanUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSeconds), "NX"],
      ]),
    });

    if (!resp.ok) {
      console.warn("[RateLimit] Upstash responded with status", resp.status);
      return { allowed: true, remaining: maxRequests };
    }

    const results = (await resp.json()) as Array<{ result?: number }>;
    const count = Number(results?.[0]?.result ?? 1);
    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
    };
  } catch (err) {
    console.warn("[RateLimit] Failed to check rate limit:", err);
    return { allowed: true, remaining: maxRequests };
  }
}
