import Redis from "ioredis";
import { logEvent } from "@/lib/telemetry";

let client: Redis | null = null;
let connectionAttempted = false;

export function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (connectionAttempted) return client;
  connectionAttempted = true;

  try {
    client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    client.on("connect", () => {
      logEvent("redis_connected", { url: maskRedisUrl(redisUrl) });
    });

    client.on("error", (err) => {
      logEvent("redis_error", { error: err.message });
    });

    client.connect().catch(() => {
      // Connection failure handled by error listener
    });
  } catch (err) {
    logEvent("redis_init_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    client = null;
  }

  return client;
}

export function isRedisAvailable(): boolean {
  const c = getRedisClient();
  return c !== null && c.status === "ready";
}

function maskRedisUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return `${parsed.protocol}//${parsed.username ? parsed.username + "@" : ""}${parsed.host}`;
  } catch {
    return "redis://***";
  }
}
