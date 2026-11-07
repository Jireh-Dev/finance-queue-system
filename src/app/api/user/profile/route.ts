import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, signUserToken, SESSION_COOKIE_OPTIONS } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name cannot be empty').max(50).optional(),
  lastName: z.string().trim().min(1, 'Last name cannot be empty').max(50).optional(),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').optional(),
  phone: z.string().trim().max(30).optional().nullable(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        studentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, phone } = validation.data;
    const updateData: any = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;

    // Email change verification check
    if (email && email !== session.email) {
      const existing = await prisma.user.findUnique({
        where: { email },
      });
      if (existing && existing.id !== session.id) {
        return NextResponse.json(
          { error: 'An account with this email address already exists' },
          { status: 409 }
        );
      }
      updateData.email = email;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        studentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Refresh user session token if email or names updated
    const newToken = signUserToken(updatedUser);

    await createAuditLog({
      userId: session.id,
      action: 'USER_PROFILE_UPDATED',
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });

    response.cookies.set(
      SESSION_COOKIE_OPTIONS.name,
      newToken,
      SESSION_COOKIE_OPTIONS.options
    );

    return response;
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

