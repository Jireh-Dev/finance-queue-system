import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, signUserToken, SESSION_COOKIE_OPTIONS } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { registerSchema, formatZodError } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Rate Limiting: 3 registrations per minute per IP
    const rateLimit = checkRateLimit(`register:${ip}`, { limit: 3, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Registration limit reached. Please wait ${rateLimit.retryAfterSeconds} seconds before creating another account.`,
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
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const formatted = formatZodError(validation.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const { email, password, role: requestedRole, firstName, lastName, phone, studentId } = validation.data;

    // RESTRICT PUBLIC REGISTRATION TO STUDENTS & PARENTS
    // Check if the raw body or parsed role attempts to assign privileged or system roles
    const rawRole = (body?.role || '').toString().trim().toUpperCase();
    if (['ADMIN', 'STAFF', 'KIOSK'].includes(rawRole) || ['ADMIN', 'STAFF', 'KIOSK'].includes(requestedRole as string)) {
      return NextResponse.json(
        { error: 'Unauthorized role registration. System roles must be seeded.' },
        { status: 403 }
      );
    }

    // Default to STUDENT if not PARENT
    const role = requestedRole === 'PARENT' ? 'PARENT' : 'STUDENT';

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        firstName,
        lastName,
        phone: phone || null,
        studentId: studentId || null,
      },
    });

    const token = signUserToken(user);

    await createAuditLog({
      userId: user.id,
      action: 'USER_REGISTERED',
      details: { email: user.email, role: user.role, name: `${user.firstName} ${user.lastName}` },
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
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    );
  }
}
