import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { strongPasswordSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    // Support both `newPassword` and `password` for client convenience
    const token = body.token?.trim();
    const newPassword = (body.newPassword || body.password)?.trim();

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
    }

    const passwordValidation = strongPasswordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      return NextResponse.json(
        { error: passwordValidation.error.issues[0]?.message || 'Invalid password' },
        { status: 400 }
      );
    }

    // Look up the user by resetPasswordToken where resetPasswordExpiry > new Date()
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset token. Please request a new link.' },
        { status: 400 }
      );
    }

    // Hash the new password using bcryptjs (via project's hashPassword utility)
    const newPasswordHash = await hashPassword(newPassword);

    // Update passwordHash, and reset resetPasswordToken: null, resetPasswordExpiry: null
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    // Record audit log
    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_SUCCESS',
      details: { email: user.email },
      ipAddress: ip,
    });

    // Return a 200 success response
    return NextResponse.json(
      {
        success: true,
        message: 'Your password has been successfully reset. You can now log in.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting password.' },
      { status: 500 }
    );
  }
}
