import { NextRequest } from 'next/server';

/**
 * Dynamically resolves the application's base URL for generating absolute links (e.g. password resets, verification emails).
 *
 * Resolution Order:
 * 1. process.env.NEXT_PUBLIC_APP_URL (Explicit production configuration)
 * 2. process.env.VERCEL_URL (Automatic Vercel deployment URL with https://)
 * 3. Incoming Request 'origin' header (e.g., https://finance-queue-system-3ew5.vercel.app)
 * 4. Incoming Request 'x-forwarded-host' or 'host' headers
 * 5. Localhost fallback as final safety net
 */
export function getBaseUrl(req?: NextRequest): string {
  // 1. Explicit app URL from environment
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }

  // 2. Vercel deployment environment variable
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL.replace(/\/+$/, '');
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }

  // 3. Dynamic resolution from request headers if available
  if (req) {
    const origin = req.headers.get('origin');
    if (origin) {
      return origin.replace(/\/+$/, '');
    }

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (host) {
      const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  // 4. Default fallback
  return 'http://localhost:3000';
}

