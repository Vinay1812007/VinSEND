// Service-role Supabase client. Bypasses RLS. NEVER expose to the browser.
// Route handlers may use this ONLY after they've authenticated the caller
// through the API key layer and resolved a `project_id` scope.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { serverEnv } from '@/lib/validation/env'

let cached: SupabaseClient | null = null

export function getServiceRoleClient(): SupabaseClient {
  if (cached) return cached
  const env = serverEnv()
  cached = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { 'X-VinSEND-Client': 'service' },
    },
  })
  return cached
}
