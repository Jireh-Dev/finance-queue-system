import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generateCSPRNGToken } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { createAppointmentSchema, formatZodError } from '@/lib/validations';
import { broadcastQueueUpdate } from '@/lib/events';
import { sendQueueNotification } from '@/lib/notifications';
import { MAX_SLOT_CAPACITY } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const query = searchParams.get('q');

    const where: any = {};

    // Role-based scoping
    if (session.role === 'STUDENT' || session.role === 'PARENT') {
      where.userId = session.id;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (date) {
      const targetDate = new Date(date);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        where.appointmentDate = {
          gte: startOfDay,
          lt: endOfDay,
        };
      }
    }

    if (query) {
      where.OR = [
        { purpose: { contains: query } },
        { user: { firstName: { contains: query } } },
        { user: { lastName: { contains: query } } },
        { user: { studentId: { contains: query } } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            studentId: true,
            role: true,
          },
        },
      },
      orderBy: [
        { appointmentDate: 'desc' },
        { timeSlot: 'asc' },
      ],
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Fetch appointments error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    // Zod Validation
    const validation = createAppointmentSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { purpose, appointmentDate, timeSlot, remarks } = validation.data;

    const apptDate = new Date(appointmentDate);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (apptDate < startOfToday) {
      return NextResponse.json(
        { error: 'Cannot book appointments for past dates' },
        { status: 400 }
      );
    }

    // Capacity Check: Ensure selected time slot has not reached MAX_SLOT_CAPACITY
    const targetStartOfDay = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate());
    const targetEndOfDay = new Date(targetStartOfDay.getTime() + 24 * 60 * 60 * 1000);

    const existingCount = await prisma.appointment.count({
      where: {
        appointmentDate: {
          gte: targetStartOfDay,
          lt: targetEndOfDay,
        },
        timeSlot,
        status: {
          not: 'CANCELLED',
        },
      },
    });

    if (existingCount >= MAX_SLOT_CAPACITY) {
      return NextResponse.json(
        {
          error: `The time slot "${timeSlot}" is already fully booked (${MAX_SLOT_CAPACITY}/${MAX_SLOT_CAPACITY}). Please choose another slot.`,
        },
        { status: 409 }
      );
    }

    // Generate secure CSPRNG token
    const qrToken = generateCSPRNGToken();
    // Expiration: End of appointment day (or 24 hours after booking, whichever is later)
    const appointmentEnd = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate(), 23, 59, 59, 999);
    const expiresAt = appointmentEnd > new Date() ? appointmentEnd : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const appointment = await prisma.appointment.create({
      data: {
        userId: session.id,
        purpose,
        appointmentDate: apptDate,
        timeSlot,
        status: 'CONFIRMED',
        qrToken,
        isUsed: false,
        expiresAt,
        remarks: remarks || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            studentId: true,
            role: true,
          },
        },
      },
    });

    // Record audit logs
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    await createAuditLog({
      userId: session.id,
      action: 'APPOINTMENT_CREATED',
      details: {
        appointmentId: appointment.id,
        purpose: appointment.purpose,
        date: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
      },
      ipAddress,
    });

    await createAuditLog({
      userId: session.id,
      action: 'QR_GENERATED',
      details: {
        appointmentId: appointment.id,
        tokenPrefix: qrToken.substring(0, 8) + '...',
      },
      ipAddress,
    });

    // Broadcast real-time queue update
    broadcastQueueUpdate({
      action: 'APPOINTMENT_CREATED',
      appointmentId: appointment.id,
    });

    // Dispatch confirmation email/alert asynchronously
    sendQueueNotification({
      to: appointment.user.email,
      recipientName: `${appointment.user.firstName} ${appointment.user.lastName}`,
      type: 'BOOKING_CONFIRMATION',
      details: {
        purpose: appointment.purpose,
        appointmentDate: new Date(appointment.appointmentDate).toLocaleDateString(),
        timeSlot: appointment.timeSlot,
        token: appointment.qrToken,
      },
    }).catch((err) => console.error('Notification error:', err));

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    console.error('Create appointment error:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}
