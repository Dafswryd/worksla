import { z } from 'zod'

// Load apps/api/.env into process.env when present. In production the
// platform injects env vars directly and no .env file exists, so a missing
// file is not an error.
try {
  process.loadEnvFile()
} catch {
  // no .env file found; rely on process.env as provided by the platform
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  COOKIE_SAMESITE: z.enum(['lax', 'none']).default('lax'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(20 * 1024 * 1024),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const lines = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
  console.error(`Invalid environment:\n${lines.join('\n')}`)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
