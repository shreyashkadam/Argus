export class MetricsCollector {
  private spans: { name: string; durationMs: number; success: boolean; timestamp: number }[] =
    [];
  private counters: Map<string, number> = new Map();

  recordSpan(name: string, durationMs: number, success: boolean): void {
    this.spans.push({ name, durationMs, success, timestamp: Date.now() });
  }

  increment(counter: string, by = 1): void {
    this.counters.set(counter, (this.counters.get(counter) ?? 0) + by);
  }

  getCounters(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }

  getSpanSummary(): {
    totalSpans: number;
    avgDurationMs: number;
    errorRate: number;
    byName: Record<string, { count: number; avgMs: number; errors: number }>;
  } {
    const totalSpans = this.spans.length;
    if (totalSpans === 0) {
      return {
        totalSpans: 0,
        avgDurationMs: 0,
        errorRate: 0,
        byName: {},
      };
    }

    const totalDurationMs = this.spans.reduce((sum, s) => sum + s.durationMs, 0);
    const errorCount = this.spans.filter((s) => !s.success).length;

    const byName: Record<string, { count: number; totalMs: number; errors: number }> = {};
    for (const span of this.spans) {
      const existing = byName[span.name] ?? { count: 0, totalMs: 0, errors: 0 };
      existing.count += 1;
      existing.totalMs += span.durationMs;
      if (!span.success) existing.errors += 1;
      byName[span.name] = existing;
    }

    const byNameSummary: Record<string, { count: number; avgMs: number; errors: number }> = {};
    for (const [name, data] of Object.entries(byName)) {
      byNameSummary[name] = {
        count: data.count,
        avgMs: data.count > 0 ? data.totalMs / data.count : 0,
        errors: data.errors,
      };
    }

    return {
      totalSpans,
      avgDurationMs: totalDurationMs / totalSpans,
      errorRate: errorCount / totalSpans,
      byName: byNameSummary,
    };
  }

  reset(): void {
    this.spans = [];
    this.counters.clear();
  }
}

export const metrics = new MetricsCollector();

export function logEvent(event: string, data?: Record<string, unknown>): void {
  const payload = data ? ` ${JSON.stringify(data)}` : "";
  console.info(`[EVENT] ${event}${payload}`);
}

export async function withTelemetry<T>(
  spanName: string,
  attributes: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    const attrsStr = Object.entries(attributes)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.info(`[SPAN] ✓ ${spanName} duration=${duration}ms${attrsStr ? ` ${attrsStr}` : ""}`);
    metrics.recordSpan(spanName, duration, true);
    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    const attrsStr = Object.entries(attributes)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.info(
      `[SPAN] ✗ ${spanName} duration=${duration}ms error=${err instanceof Error ? err.message : String(err)}${attrsStr ? ` ${attrsStr}` : ""}`
    );
    metrics.recordSpan(spanName, duration, false);
    throw err;
  }
}
