// OAuth callback. Supabase Auth sends the browser here after Google/GitHub;
// we exchange the code for a session cookie, then redirect the user on.

import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/app'
  if (code) {
    const sb = await getServerSupabase()
    await sb.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL(next, url.origin))
}
