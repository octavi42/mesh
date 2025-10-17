import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith('/w/')) {
    return NextResponse.rewrite(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/w/:path*',
};
