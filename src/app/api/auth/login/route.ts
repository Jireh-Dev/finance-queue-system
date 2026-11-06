import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, signUserToken, SESSION_COOKIE_OPTIONS } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { loginSchema, formatZodError } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Rate Limiting: 5 attempts per minute per IP
    const rateLimit = checkRateLimit(`login:${ip}`, { limit: 5, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
          retryAfter: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    // Zod Schema Validation
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const formatted = formatZodError(validation.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const { email, password } = validation.data;

    let user = await prisma.user.findUnique({
      where: { email },
    });

    // Safety fallback: if admin@ua.edu.ph logs into an unseeded production database, auto-provision on-the-fly
    if (!user && email.toLowerCase() === 'admin@ua.edu.ph' && password === 'Admin@123') {
      try {
        const { hashPassword } = await import('@/lib/auth');
        const defaultAdminHash = await hashPassword('Admin@123');
        user = await prisma.user.create({
          data: {
            email: 'admin@ua.edu.ph',
            passwordHash: defaultAdminHash,
            role: 'ADMIN',
            firstName: 'Finance',
            lastName: 'Director',
            phone: '+63 917 123 4567',
          },
        });
      } catch (provisionErr) {
        console.error('Failed on-the-fly admin provisioning:', provisionErr);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = signUserToken(user);

    await createAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      details: { email: user.email, role: user.role },
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        studentId: user.studentId,
        phone: user.phone,
      },
    });

    response.cookies.set(
      SESSION_COOKIE_OPTIONS.name,
      token,
      SESSION_COOKIE_OPTIONS.options
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 }
    );
  }
}
