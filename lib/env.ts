import { z } from "zod";
import { fromZodError } from "zod-validation-error";

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  TAVILY_API_KEY: z.string().min(1, "TAVILY_API_KEY is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }
  const validationError = fromZodError(result.error);
  console.error(validationError.message);
  throw validationError;
}

let _env: Env | null = null;

export function env(): Env {
  if (!_env) _env = validateEnv();
  return _env;
}
