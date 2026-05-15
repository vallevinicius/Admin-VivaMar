import { NextRequest, NextResponse } from 'next/server';
import { authConfig, verifySessionToken } from '@/lib/auth';
import { canAccessDashboardPath, getDefaultDashboardHref } from '@/lib/dashboard-access';

export async function middleware(request: NextRequest) {
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const token = request.cookies.get(authConfig.cookieName)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isDashboardRoute && !session) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isDashboardRoute && session) {
    const canAccess = canAccessDashboardPath(
      request.nextUrl.pathname,
      session.plan,
      session.role,
      session.permissions,
    );

    if (!canAccess || !session.active) {
      const destination = getDefaultDashboardHref(
        session.plan,
        session.role,
        session.permissions,
      );

      if (request.nextUrl.pathname !== destination) {
        return NextResponse.redirect(new URL(destination, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
