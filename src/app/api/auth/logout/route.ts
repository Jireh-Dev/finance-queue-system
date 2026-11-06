import { NextResponse } from 'next/server';
import { SESSION_COOKIE_OPTIONS } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete(SESSION_COOKIE_OPTIONS.name);
  return response;
}

