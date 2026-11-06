import { NextRequest, NextResponse } from 'next/server';

interface UserJwtPayload {
  id: string;
  email: string;
  role: 'STUDENT' | 'PARENT' | 'STAFF' | 'ADMIN' | 'KIOSK';
  firstName: string;
  lastName: string;
  studentId?: string | null;
  exp?: number;
}

// Decode and verify JWT payload safely in Edge runtime
function parseJwtPayload(token: string): UserJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload) as UserJwtPayload;

    if (parsed.exp && Date.now() >= parsed.exp * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('ua_finance_session')?.value;
  const user = token ? parseJwtPayload(token) : null;

  // 1. Protect Administrator routes: /admin and /admin/*
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'ADMIN') {
      // Non-admins redirected to their appropriate role portal
      const targetUrl = user.role === 'STAFF' ? '/staff' : '/dashboard';
      return NextResponse.redirect(new URL(targetUrl, request.url));
    }
  }

  // 2. Protect Cashier & Staff routes: /staff and /staff/*
  if (pathname.startsWith('/staff')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 3. Protect Student/Parent booking & dashboard: /dashboard and /book
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/book')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Redirect already authenticated users away from /login & /register
  if (pathname === '/login' || pathname === '/register') {
    if (user) {
      if (user.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      if (user.role === 'STAFF') {
        return NextResponse.redirect(new URL('/staff', request.url));
      }
      if (user.role === 'KIOSK') {
        return NextResponse.redirect(new URL('/kiosk', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 5. Protect Door Kiosk terminal: /kiosk and /kiosk/*
  if (pathname.startsWith('/kiosk')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'KIOSK' && user.role !== 'STAFF' && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/staff/:path*',
    '/kiosk/:path*',
    '/dashboard/:path*',
    '/book/:path*',
    '/login',
    '/register',
  ],
};

