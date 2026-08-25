import { z } from 'zod'

// Server-only env — do NOT import this from client components.
const ServerEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().optional(),
  SECRET_ENCRYPTION_KEY: z
    .string()
    .min(1, 'SECRET_ENCRYPTION_KEY is required. Generate with: openssl rand -base64 32'),
  API_KEY_PEPPER: z
    .string()
    .min(1, 'API_KEY_PEPPER is required. Generate with: openssl rand -base64 32'),
  WEBHOOK_USER_AGENT: z.string().default('VinSEND-Webhooks/1.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type ServerEnv = z.infer<typeof ServerEnvSchema>

let cached: ServerEnv | null = null

export function serverEnv(): ServerEnv {
  if (cached) return cached
  const parsed = ServerEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid server environment:', parsed.error.flatten().fieldErrors)
    throw new Error('Invalid server environment. See logs.')
  }
  cached = parsed.data
  return cached
}

// Client-safe subset. Safe to import in browser components.
export const publicEnv = {
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
}
