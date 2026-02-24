import { getRedisClient } from "@/lib/redis";
import { logEvent, metrics } from "@/lib/telemetry";

export const TAVILY_RATE_LIMIT = parseInt(process.env.TAVILY_RATE_LIMIT ?? "20", 10);
export const JINA_RATE_LIMIT = parseInt(process.env.JINA_RATE_LIMIT ?? "15", 10);
const RATE_LIMIT_WINDOW_MS = 60_000;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

const FAIL_OPEN: RateLimitResult = { allowed: true, remaining: 999, resetMs: 0 };

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) return FAIL_OPEN;

  const redisKey = `argus:ratelimit:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, "-inf", windowStart);
    pipeline.zcard(redisKey);
    const results = await pipeline.exec();

    if (!results) return FAIL_OPEN;

    const countResult = results[1];
    if (!countResult || countResult[0]) return FAIL_OPEN;
    const currentCount = countResult[1] as number;

    if (currentCount < maxRequests) {
      const addPipeline = redis.pipeline();
      addPipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
      addPipeline.pexpire(redisKey, windowMs);
      await addPipeline.exec();

      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
        resetMs: windowMs,
      };
    }

    // Over limit — find when the oldest entry expires
    const oldest = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
    const oldestTimestamp = oldest.length >= 2 ? parseFloat(oldest[1]) : now;
    const resetMs = Math.max(0, Math.ceil(oldestTimestamp + windowMs - now));

    return { allowed: false, remaining: 0, resetMs };
  } catch (err) {
    logEvent("rate_limit_error", {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return FAIL_OPEN;
  }
}

const MAX_SHORT_WAIT_MS = 5000;

export async function checkRateLimitWithWait(
  serviceKey: string,
  maxRequests: number
): Promise<void> {
  metrics.increment(`rate_limit_${serviceKey}_checked`);

  const result = await checkRateLimit(serviceKey, maxRequests);
  if (result.allowed) return;

  metrics.increment(`rate_limit_${serviceKey}_blocked`);
  logEvent("rate_limit_blocked", {
    service: serviceKey,
    resetMs: result.resetMs,
  });

  if (result.resetMs > 0 && result.resetMs <= MAX_SHORT_WAIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, result.resetMs));
    const retry = await checkRateLimit(serviceKey, maxRequests);
    if (!retry.allowed) {
      logEvent("rate_limit_fail_open", { service: serviceKey });
    }
  } else {
    logEvent("rate_limit_fail_open", { service: serviceKey });
  }
}
