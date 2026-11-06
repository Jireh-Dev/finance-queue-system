import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { UserRole, UserSession } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'ua-finance-secure-jwt-secret-key-production-ready-2026';
const COOKIE_NAME = 'ua_finance_session';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signUserToken(user: {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  studentId?: string | null;
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: user.studentId || null,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyUserToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyUserToken(token);
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

