import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { updateAppointmentSchema, formatZodError } from '@/lib/validations';
import { broadcastQueueUpdate } from '@/lib/events';
import { sendQueueNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
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

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (session.role === 'STUDENT' || session.role === 'PARENT') {
      if (appointment.userId !== session.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Get appointment error:', error);
    return NextResponse.json({ error: 'Failed to retrieve appointment' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const isOwner = appointment.userId === session.id;
    const isStaffOrAdmin = session.role === 'STAFF' || session.role === 'ADMIN';

    if (!isOwner && !isStaffOrAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    // Zod validation
    const validation = updateAppointmentSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { action, appointmentDate, timeSlot, remarks, counterName, status } = validation.data;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    const dataToUpdate: any = {};

    if (action === 'CANCEL') {
      if (['COMPLETED', 'SERVING'].includes(appointment.status)) {
        return NextResponse.json(
          { error: 'Cannot cancel an appointment that is already being served or completed' },
          { status: 400 }
        );
      }
      dataToUpdate.status = 'CANCELLED';
      if (remarks) dataToUpdate.remarks = remarks;

      await createAuditLog({
        userId: session.id,
        action: 'APPOINTMENT_CANCELLED',
        details: {
          appointmentId: appointment.id,
          reason: remarks || 'Cancelled by user',
        },
        ipAddress,
      });
    } else if (action === 'RESCHEDULE') {
      if (!appointmentDate || !timeSlot) {
        return NextResponse.json(
          { error: 'New appointment date and time slot are required for rescheduling' },
          { status: 400 }
        );
      }
      dataToUpdate.appointmentDate = new Date(appointmentDate);
      dataToUpdate.timeSlot = timeSlot;
      dataToUpdate.status = 'CONFIRMED';
      if (remarks) dataToUpdate.remarks = remarks;

      await createAuditLog({
        userId: session.id,
        action: 'STATUS_UPDATED',
        details: {
          appointmentId: appointment.id,
          action: 'RESCHEDULE',
          newDate: appointmentDate,
          newSlot: timeSlot,
        },
        ipAddress,
      });
    } else if (isStaffOrAdmin) {
      if (status) dataToUpdate.status = status;
      if (counterName !== undefined) dataToUpdate.counterName = counterName;
      if (remarks !== undefined) dataToUpdate.remarks = remarks;

      await createAuditLog({
        userId: session.id,
        action: 'STATUS_UPDATED',
        details: {
          appointmentId: appointment.id,
          updatedFields: dataToUpdate,
        },
        ipAddress,
      });
    }

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: dataToUpdate,
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

    // Broadcast queue update for real-time screens
    broadcastQueueUpdate({
      action: action || 'APPOINTMENT_UPDATED',
      appointmentId: updated.id,
      queueNumber: updated.queueNumber,
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('Update appointment error:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}
