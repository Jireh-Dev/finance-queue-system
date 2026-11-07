import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, verifyPassword, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { strongPasswordSchema } from '@/lib/validations';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid password data' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // Fetch existing user password hash
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, passwordHash: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: 'Incorrect current password. Please try again.' },
        { status: 400 }
      );
    }

    // Hash the new password with bcryptjs
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'USER_PASSWORD_CHANGED',
      details: { email: user.email },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Failed to change password. Please try again.' },
      { status: 500 }
    );
  }
}

