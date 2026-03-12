// d:\ALFI\TA\Projek\sehati-frontend\middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = {
  '/admin': ['admin'],
  '/guru': ['guru'],
  '/siswa': ['siswa'],
  '/kantin': ['kantin'],
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const role = request.cookies.get('auth_role')?.value;
  const pathname = request.nextUrl.pathname;

  console.log('🔐 Middleware:', { pathname, hasToken: !!token, role });

  // Check if route is protected
  const isProtected = Object.keys(PROTECTED_ROUTES).some(route => 
    pathname.startsWith(route)
  );

  if (isProtected) {
    // If no token, redirect to login
    if (!token) {
      console.log('❌ No token, redirecting to /auth');
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    // Check role-based access
    const routePrefix = Object.keys(PROTECTED_ROUTES).find(route => 
      pathname.startsWith(route)
    );

    if (routePrefix) {
      const allowedRoles = PROTECTED_ROUTES[routePrefix as keyof typeof PROTECTED_ROUTES];
      if (!role) {
        console.log('❌ Missing role cookie, redirecting to /auth');
        return NextResponse.redirect(new URL('/auth', request.url));
      }

      if (!allowedRoles.includes(role)) {
        console.log('❌ Role not allowed:', { role, allowedRoles });
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/guru/:path*',
    '/siswa/:path*',
    '/kantin/:path*',
  ],
};
