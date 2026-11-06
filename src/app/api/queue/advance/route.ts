import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { queueAdvanceSchema, formatZodError } from '@/lib/validations';
import { broadcastQueueUpdate } from '@/lib/events';
import { sendQueueNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'STAFF' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized: Staff or Admin role required' },
        { status: 403 }
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    // Zod Schema Validation
    const validation = queueAdvanceSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { action, appointmentId, counterName, remarks } = validation.data;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    if (action === 'CALL_NEXT') {
      const assignedCounter = counterName || 'Window 1 - Cashier';

      // Atomic fetch and transition to SERVING inside a transaction to prevent two cashiers calling the same student
      const updated = await prisma.$transaction(async (tx) => {
        const nextVisitor = await tx.appointment.findFirst({
          where: { status: 'CHECKED_IN' },
          orderBy: [{ queueNumber: 'asc' }, { checkInTime: 'asc' }],
          include: { user: true },
        });

        if (!nextVisitor) {
          return null;
        }

        return await tx.appointment.update({
          where: { id: nextVisitor.id },
          data: {
            status: 'SERVING',
            servedTime: new Date(),
            counterName: assignedCounter,
          },
          include: { user: true },
        });
      });

      if (!updated) {
        return NextResponse.json(
          { error: 'No visitors currently waiting in the check-in queue.' },
          { status: 404 }
        );
      }

      await createAuditLog({
        userId: session.id,
        action: 'STATUS_UPDATED',
        details: {
          appointmentId: updated.id,
          queueNumber: updated.queueNumber,
          studentName: `${updated.user.firstName} ${updated.user.lastName}`,
          fromStatus: 'CHECKED_IN',
          toStatus: 'SERVING',
          counter: assignedCounter,
        },
        ipAddress,
      });

      // Broadcast Realtime SSE Event
      broadcastQueueUpdate({
        action: 'QUEUE_CALLED',
        appointmentId: updated.id,
        queueNumber: updated.queueNumber,
      });

      // Send Queue Called Email Alert
      sendQueueNotification({
        to: updated.user.email,
        recipientName: `${updated.user.firstName} ${updated.user.lastName}`,
        type: 'QUEUE_CALLED',
        details: {
          queueNumber: updated.queueNumber,
          counterName: assignedCounter,
          purpose: updated.purpose,
        },
      }).catch((e) => console.error('Notification error:', e));

      return NextResponse.json({
        success: true,
        message: `Now serving Queue #${updated.queueNumber} (${updated.user.firstName} ${updated.user.lastName})`,
        appointment: updated,
      });
    }

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required for this action' },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { user: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    let updatedStatus = appointment.status;
    const updateData: any = {};

    if (action === 'START_SERVING') {
      updatedStatus = 'SERVING';
      updateData.status = 'SERVING';
      updateData.servedTime = new Date();
      if (counterName) updateData.counterName = counterName;
    } else if (action === 'COMPLETE') {
      updatedStatus = 'COMPLETED';
      updateData.status = 'COMPLETED';
      updateData.completedTime = new Date();
      if (remarks) updateData.remarks = remarks;
    } else if (action === 'MARK_MISSED') {
      updatedStatus = 'MISSED';
      updateData.status = 'MISSED';
      if (remarks) updateData.remarks = remarks;
    } else if (action === 'REVERT_TO_WAITING') {
      updatedStatus = 'CHECKED_IN';
      updateData.status = 'CHECKED_IN';
      updateData.servedTime = null;
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: { user: true },
    });

    await createAuditLog({
      userId: session.id,
      action: 'STATUS_UPDATED',
      details: {
        appointmentId: updated.id,
        queueNumber: updated.queueNumber,
        action,
        fromStatus: appointment.status,
        toStatus: updatedStatus,
        counter: counterName || appointment.counterName,
        remarks: remarks || null,
      },
      ipAddress,
    });

    // Broadcast Realtime SSE Event
    broadcastQueueUpdate({
      action: `QUEUE_${updatedStatus}`,
      appointmentId: updated.id,
      queueNumber: updated.queueNumber,
    });

    // Send Completion or Called notification
    if (updatedStatus === 'SERVING') {
      sendQueueNotification({
        to: updated.user.email,
        recipientName: `${updated.user.firstName} ${updated.user.lastName}`,
        type: 'QUEUE_CALLED',
        details: {
          queueNumber: updated.queueNumber,
          counterName: updated.counterName,
          purpose: updated.purpose,
        },
      }).catch((e) => console.error('Notification error:', e));
    } else if (updatedStatus === 'COMPLETED') {
      sendQueueNotification({
        to: updated.user.email,
        recipientName: `${updated.user.firstName} ${updated.user.lastName}`,
        type: 'APPOINTMENT_COMPLETED',
        details: {
          queueNumber: updated.queueNumber,
          counterName: updated.counterName,
          remarks: updated.remarks,
        },
      }).catch((e) => console.error('Notification error:', e));
    }

    return NextResponse.json({
      success: true,
      message: `Queue status updated to ${updatedStatus}`,
      appointment: updated,
    });
  } catch (error) {
    console.error('Queue advance error:', error);
    return NextResponse.json(
      { error: 'Failed to update queue state' },
      { status: 500 }
    );
  }
}
