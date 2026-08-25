import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/auth/middleware'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isDashboard =
    pathname.startsWith('/app') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/admin')

  const isAuthPage =
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')

  // Accept-invite must remain reachable even for signed-in users; skip both branches.
  if (pathname.startsWith('/accept-invite')) return response

  // Hosted unsubscribe pages must remain public (email recipients aren't
  // logged in to VinSEND).
  if (pathname.startsWith('/u/')) return response

  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Everything except public assets, /v1 API, and Next internals.
    '/((?!_next/static|_next/image|favicon.ico|v1/|api/health|robots.txt|.*\\..*).*)',
  ],
}
