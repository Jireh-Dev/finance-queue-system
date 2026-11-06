import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { queueScanSchema, formatZodError } from '@/lib/validations';
import { broadcastQueueUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'STAFF' && session.role !== 'ADMIN' && session.role !== 'KIOSK')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only Finance Office Staff, Kiosk, or Admin can validate QR codes' },
        { status: 403 }
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    // Zod Schema Validation
    const validation = queueScanSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { token, counterName } = validation.data;
    const cleanToken = token.trim();
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Find appointment by secure qrToken
    const appointment = await prisma.appointment.findUnique({
      where: { qrToken: cleanToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            studentId: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!appointment) {
      await createAuditLog({
        userId: session.id,
        action: 'QR_INVALID',
        details: {
          scannedToken: cleanToken.substring(0, 10) + '...',
          reason: 'Token not found in database',
          scannedBy: `${session.firstName} ${session.lastName}`,
        },
        ipAddress,
      });

      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_TOKEN',
          error: 'Invalid QR Code: Token reference does not match any scheduled appointment.',
        },
        { status: 404 }
      );
    }

    if (appointment.status === 'CANCELLED') {
      await createAuditLog({
        userId: session.id,
        action: 'QR_INVALID',
        details: {
          appointmentId: appointment.id,
          reason: 'Appointment is already cancelled',
          studentId: appointment.user.studentId,
        },
        ipAddress,
      });

      return NextResponse.json(
        {
          success: false,
          code: 'CANCELLED_APPOINTMENT',
          error: `Appointment was previously CANCELLED. Reason: ${appointment.remarks || 'No reason provided'}.`,
          appointment,
        },
        { status: 400 }
      );
    }

    if (appointment.status === 'COMPLETED') {
      await createAuditLog({
        userId: session.id,
        action: 'QR_INVALID',
        details: {
          appointmentId: appointment.id,
          reason: 'Token already used and completed',
          completedTime: appointment.completedTime,
        },
        ipAddress,
      });

      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_COMPLETED',
          error: `This QR token was already used and marked COMPLETED${
            appointment.completedTime
              ? ' at ' + new Date(appointment.completedTime).toLocaleTimeString()
              : ''
          }.`,
          appointment,
        },
        { status: 400 }
      );
    }

    if (appointment.status === 'SERVING') {
      return NextResponse.json({
        success: true,
        code: 'ALREADY_SERVING',
        message: `Visitor is currently being served at ${appointment.counterName || 'Counter'}.`,
        appointment,
      });
    }

    if (appointment.status === 'CHECKED_IN') {
      return NextResponse.json({
        success: true,
        code: 'ALREADY_CHECKED_IN',
        message: `Visitor is already checked in with Queue Number #${appointment.queueNumber}.`,
        appointment,
      });
    }

    // Atomically find highest daily queue number and assign next sequence within a Prisma transaction
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const { updated, nextQueueNumber } = await prisma.$transaction(
      async (tx) => {
        // Double-check appointment status inside transaction to prevent double check-in race conditions
        const freshAppt = await tx.appointment.findUnique({
          where: { id: appointment.id },
        });

        if (!freshAppt || freshAppt.status !== 'CONFIRMED') {
          throw new Error(`APPOINTMENT_NOT_CONFIRMED:${freshAppt?.status || 'NOT_FOUND'}`);
        }

        const highestToday = await tx.appointment.findFirst({
          where: {
            appointmentDate: {
              gte: startOfDay,
              lt: endOfDay,
            },
            queueNumber: { not: null },
          },
          orderBy: { queueNumber: 'desc' },
          select: { queueNumber: true },
        });

        const nextNum = (highestToday?.queueNumber ?? 100) + 1;

        const updatedAppt = await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            status: 'CHECKED_IN',
            queueNumber: nextNum,
            checkInTime: new Date(),
            counterName: counterName || appointment.counterName || null,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                studentId: true,
                phone: true,
                role: true,
              },
            },
          },
        });

        return { updated: updatedAppt, nextQueueNumber: nextNum };
      },
      {
        isolationLevel: 'Serializable', // Ensure strict serialized access for queue number increments
      }
    ).catch(async (err) => {
      // If serialization failure occurs under high load, retry once
      if (err.code === 'P2034' || err.message?.includes('could not serialize access')) {
        return await prisma.$transaction(async (tx) => {
          const highestToday = await tx.appointment.findFirst({
            where: {
              appointmentDate: { gte: startOfDay, lt: endOfDay },
              queueNumber: { not: null },
            },
            orderBy: { queueNumber: 'desc' },
            select: { queueNumber: true },
          });
          const nextNum = (highestToday?.queueNumber ?? 100) + 1;
          const updatedAppt = await tx.appointment.update({
            where: { id: appointment.id },
            data: {
              status: 'CHECKED_IN',
              queueNumber: nextNum,
              checkInTime: new Date(),
              counterName: counterName || appointment.counterName || null,
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  studentId: true,
                  phone: true,
                  role: true,
                },
              },
            },
          });
          return { updated: updatedAppt, nextQueueNumber: nextNum };
        });
      }
      throw err;
    });

    await createAuditLog({
      userId: session.id,
      action: 'QR_SCANNED_SUCCESS',
      details: {
        appointmentId: updated.id,
        studentName: `${updated.user.firstName} ${updated.user.lastName}`,
        studentId: updated.user.studentId,
        queueNumber: nextQueueNumber,
        purpose: updated.purpose,
        counter: counterName || 'Check-in Desk',
      },
      ipAddress,
    });

    // Broadcast Realtime SSE Event
    broadcastQueueUpdate({
      action: 'QUEUE_CHECKED_IN',
      appointmentId: updated.id,
      queueNumber: nextQueueNumber,
    });

    return NextResponse.json({
      success: true,
      code: 'CHECKED_IN_SUCCESS',
      message: `Check-in successful! Assigned Queue #${nextQueueNumber}.`,
      appointment: updated,
    });
  } catch (error: any) {
    if (error?.message?.startsWith('APPOINTMENT_NOT_CONFIRMED:')) {
      const state = error.message.split(':')[1];
      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_PROCESSED',
          error: `Appointment cannot be checked in because it is currently in '${state}' status.`,
        },
        { status: 400 }
      );
    }
    console.error('QR Scan error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the QR scan' },
      { status: 500 }
    );
  }
}
