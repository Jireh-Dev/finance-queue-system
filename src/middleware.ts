import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';

interface UserJwtPayload {
  id: string;
  email: string;
  role: 'STUDENT' | 'PARENT' | 'STAFF' | 'ADMIN' | 'KIOSK';
  firstName: string;
  lastName: string;
  studentId?: string | null;
  exp?: number;
}

// Cryptographically verify JWT signature using jose in Edge/Node runtime
async function verifyJwtToken(token: string): Promise<UserJwtPayload | null> {
  try {
    const rawSecret = process.env.JWT_SECRET;
    if (!rawSecret) {
      console.error('FATAL: JWT_SECRET environment variable is missing.');
      return null;
    }
    const secretKey = new TextEncoder().encode(rawSecret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as UserJwtPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Support both institutional cookie naming (ua_finance_session and auth-token)
  const tokenCookie =
    request.cookies.get('ua_finance_session')?.value ||
    request.cookies.get('auth-token')?.value;

  let user: UserJwtPayload | null = null;
  let tokenInvalid = false;

  if (tokenCookie) {
    user = await verifyJwtToken(tokenCookie);
    if (!user) {
      tokenInvalid = true;
    }
  }

  // Helper: Clear invalid cookie and redirect to login
  const clearCookieAndRedirectToLogin = () => {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('ua_finance_session');
    response.cookies.delete('auth-token');
    return response;
  };

  // 1. Protect Administrator routes: /admin and /admin/*
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return clearCookieAndRedirectToLogin();
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
      return clearCookieAndRedirectToLogin();
    }
    if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 3. Protect Student/Parent booking & dashboard: /dashboard and /book
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/book')) {
    if (!user) {
      return clearCookieAndRedirectToLogin();
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
      return clearCookieAndRedirectToLogin();
    }
    if (user.role !== 'KIOSK' && user.role !== 'STAFF' && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // If a token was provided but failed cryptographic signature verification on public routes, clear it
  if (tokenInvalid) {
    const response = NextResponse.next();
    response.cookies.delete('ua_finance_session');
    response.cookies.delete('auth-token');
    return response;
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

