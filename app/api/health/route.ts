import { NextResponse } from "next/server";
import { isRedisAvailable } from "@/lib/redis";

function maskRedisUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "redis://***";
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    redis: {
      connected: isRedisAvailable(),
      url: maskRedisUrl(process.env.REDIS_URL),
    },
    timestamp: new Date().toISOString(),
  });
}
