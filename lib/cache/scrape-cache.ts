import { getRedisClient } from "@/lib/redis";
import { logEvent, metrics } from "@/lib/telemetry";

const KEY_PREFIX = "argus:scrape:";
const TTL_SECONDS = 86400; // 24 hours

export async function getCachedScrape(url: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get(`${KEY_PREFIX}${url}`);
    if (cached !== null) {
      await redis.incr("argus:scrape_cache:hits").catch(() => {});
      metrics.increment("cache_hits");
      logEvent("cache_hit", { url });
      return cached;
    }
    await redis.incr("argus:scrape_cache:misses").catch(() => {});
    metrics.increment("cache_misses");
    logEvent("cache_miss", { url });
    return null;
  } catch (err) {
    logEvent("cache_get_error", {
      url,
      error: err instanceof Error ? err.message : String(err),
    });
    metrics.increment("cache_misses");
    return null;
  }
}

export async function setCachedScrape(url: string, content: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(`${KEY_PREFIX}${url}`, content, "EX", TTL_SECONDS);
  } catch (err) {
    logEvent("cache_set_error", {
      url,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getScrapeCacheStats(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
}> {
  const redis = getRedisClient();
  if (!redis) return { hits: 0, misses: 0, hitRate: 0 };

  try {
    const [hitsStr, missesStr] = await Promise.all([
      redis.get("argus:scrape_cache:hits"),
      redis.get("argus:scrape_cache:misses"),
    ]);
    const hits = parseInt(hitsStr ?? "0", 10);
    const misses = parseInt(missesStr ?? "0", 10);
    const total = hits + misses;
    return { hits, misses, hitRate: total > 0 ? hits / total : 0 };
  } catch {
    return { hits: 0, misses: 0, hitRate: 0 };
  }
}
