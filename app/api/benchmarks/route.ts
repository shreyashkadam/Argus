import { NextResponse } from "next/server";
import { loadBenchmarks } from "@/lib/benchmark";

export async function GET() {
  const benchmarks = await loadBenchmarks();
  return NextResponse.json(benchmarks);
}
