import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const isPublicPath =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/api/auth')

  // Check for Better Auth session cookie
  const sessionToken = request.cookies.get('better-auth.session_token')?.value

  if (!sessionToken && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (sessionToken && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
