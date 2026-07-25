import { NextRequest, NextResponse } from 'next/server';

// Protected admin paths
const ADMIN_PATHS = ['/admin'];
const PUBLIC_PATHS = ['/admin/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's an admin path
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.includes(p));
  const isPublicAdminPath = PUBLIC_PATHS.some((p) => pathname.includes(p));

  if (isAdminPath && !isPublicAdminPath) {
    // Check for access token in the cookie (we store it as a session cookie from the client)
    const adminSession = request.cookies.get('admin_session');

    if (!adminSession?.value) {
      // Redirect to login
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
