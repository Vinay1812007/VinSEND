// Server-side Supabase client bound to the caller's session via cookies.
// Uses @supabase/ssr so RLS policies are enforced under the caller's JWT.

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicEnv } from '@/lib/validation/env'

interface CookieItem {
  name: string
  value: string
  options: CookieOptions
}

export async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieItem[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // set() throws in read-only contexts (RSC render); ignore.
        }
      },
    },
  })
}

export async function getCurrentUser() {
  const sb = await getServerSupabase()
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export async function requireCurrentUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user
}
