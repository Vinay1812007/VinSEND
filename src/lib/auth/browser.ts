'use client'

import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/validation/env'

let cached: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserSupabase() {
  if (cached) return cached
  cached = createBrowserClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY)
  return cached
}
