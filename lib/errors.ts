export class ResearchError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ResearchError";
    Object.setPrototypeOf(this, ResearchError.prototype);
  }
}

export function searchError(message: string, context?: Record<string, unknown>): ResearchError {
  return new ResearchError(message, "SEARCH_FAILED", true, context);
}

export function scrapeError(message: string, context?: Record<string, unknown>): ResearchError {
  return new ResearchError(message, "SCRAPE_FAILED", true, context);
}

export function validationError(message: string, context?: Record<string, unknown>): ResearchError {
  return new ResearchError(message, "VALIDATION_FAILED", false, context);
}

export function llmError(message: string, context?: Record<string, unknown>): ResearchError {
  return new ResearchError(message, "LLM_FAILED", true, context);
}

export function planningError(message: string, context?: Record<string, unknown>): ResearchError {
  return new ResearchError(message, "PLANNING_FAILED", true, context);
}
