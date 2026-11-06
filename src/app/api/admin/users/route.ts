import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { strongPasswordSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        studentId: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Failed to retrieve users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email, password, role, firstName, lastName, phone, studentId } = await req.json();

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'All primary fields are required' }, { status: 400 });
    }

    if (!['STUDENT', 'PARENT', 'STAFF', 'ADMIN', 'KIOSK'].includes(role)) {
      return NextResponse.json({ error: 'Invalid user role specified' }, { status: 400 });
    }

    const passCheck = strongPasswordSchema.safeParse(password);
    if (!passCheck.success) {
      return NextResponse.json(
        { error: passCheck.error.issues[0]?.message || 'Invalid password' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || null,
        studentId: studentId?.trim() || null,
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'ADMIN_USER_CREATED',
      details: { createdUserId: user.id, email: user.email, role: user.role },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id, role, firstName, lastName, phone, studentId, password } = await req.json();
    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const updateData: any = {};
    if (role) updateData.role = role;
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (studentId !== undefined) updateData.studentId = studentId ? studentId.trim() : null;

    if (password) {
      const passCheck = strongPasswordSchema.safeParse(password);
      if (!passCheck.success) {
        return NextResponse.json(
          { error: passCheck.error.issues[0]?.message || 'Invalid password' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: session.id,
      action: 'ADMIN_USER_UPDATED',
      details: { targetUserId: id, updatedFields: Object.keys(updateData) },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

