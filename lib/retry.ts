import { ResearchError } from "./errors";
import { logEvent } from "./telemetry";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryIf?: (error: unknown) => boolean;
}

const defaultRetryIf = (error: unknown): boolean => {
  return error instanceof ResearchError && error.retryable;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 10000;
  const retryIf = options?.retryIf ?? defaultRetryIf;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !retryIf(err)) {
        throw err;
      }
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const cappedDelay = Math.min(maxDelayMs, exponentialDelay);
      const jitter = 0.5 + Math.random() * 0.5;
      const delay = Math.round(cappedDelay * jitter);
      logEvent("retry_attempt", {
        attempt: attempt + 1,
        maxRetries,
        delayMs: delay,
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
