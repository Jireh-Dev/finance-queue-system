import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';
import { broadcastQueueUpdate } from '@/lib/events';
import { getPHTSlotWindow } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'STAFF' && session.role !== 'ADMIN' && session.role !== 'KIOSK')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only Finance Office Staff, Kiosk, or Admin can scan tokens.' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`kiosk-scan:${session.id}:${ip}`, { limit: 15, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          code: 'RATE_LIMITED',
          error: `Too many scan requests. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
          retryAfter: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        { code: 'INVALID_INPUT', error: 'Please provide a valid token.' },
        { status: 400 }
      );
    }

    const token = body.token.trim();
    const counterName = (body.counterName || 'Door Kiosk Self-Service Check-In').trim();

    // 1. Find appointment by qrToken
    const appointment = await prisma.appointment.findUnique({
      where: { qrToken: token },
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
        action: 'KIOSK_SCAN_FAILED',
        details: { reason: 'Token not found', tokenPrefix: token.substring(0, 10), counterName },
        ipAddress: ip,
      });

      return NextResponse.json(
        { code: 'NOT_FOUND', error: 'Appointment token not found. Please verify your QR code.' },
        { status: 404 }
      );
    }

    // 2. Check if already used or completed
    if (appointment.isUsed || appointment.status === 'COMPLETED') {
      await createAuditLog({
        userId: session.id,
        action: 'KIOSK_SCAN_FAILED',
        details: { reason: 'Token already used', appointmentId: appointment.id, counterName },
        ipAddress: ip,
      });

      return NextResponse.json(
        {
          code: 'ALREADY_USED',
          error: `This ticket was already used and completed.`,
          appointment,
        },
        { status: 409 }
      );
    }

    // 3. Check if cancelled
    if (appointment.status === 'CANCELLED') {
      return NextResponse.json(
        {
          code: 'APPOINTMENT_CANCELLED',
          error: `This appointment was cancelled (${appointment.remarks || 'No reason provided'}).`,
          appointment,
        },
        { status: 400 }
      );
    }

    // 4. Strict Time-Bound QR Code Scanner Validation in PHT (UTC+8)
    const now = new Date();
    const slotWindow = getPHTSlotWindow(appointment.appointmentDate, appointment.timeSlot);

    if (slotWindow) {
      if (now < slotWindow.startTime) {
        await createAuditLog({
          userId: session.id,
          action: 'KIOSK_SCAN_TOO_EARLY',
          details: {
            reason: 'Scanned before time window',
            appointmentId: appointment.id,
            timeSlot: appointment.timeSlot,
            scheduledStart: slotWindow.startTime.toISOString(),
            scanTime: now.toISOString(),
            counterName,
          },
          ipAddress: ip,
        });

        return NextResponse.json(
          {
            code: 'TOO_EARLY',
            error: `Too early. Your appointment window starts at ${slotWindow.startStr}.`,
            appointment,
          },
          { status: 400 }
        );
      }

      if (now > slotWindow.endTime) {
        await createAuditLog({
          userId: session.id,
          action: 'KIOSK_SCAN_EXPIRED',
          details: {
            reason: 'Scanned after time window',
            appointmentId: appointment.id,
            timeSlot: appointment.timeSlot,
            scheduledEnd: slotWindow.endTime.toISOString(),
            scanTime: now.toISOString(),
            counterName,
          },
          ipAddress: ip,
        });

        return NextResponse.json(
          {
            code: 'APPOINTMENT_EXPIRED',
            error: `Appointment expired. Your scheduled window was ${slotWindow.startStr} - ${slotWindow.endStr}.`,
            appointment,
          },
          { status: 400 }
        );
      }
    }

    // 5. Already serving or checked in
    if (appointment.status === 'SERVING') {
      return NextResponse.json({
        success: true,
        code: 'ALREADY_SERVING',
        message: `Visitor is currently being served at ${appointment.counterName || 'Cashier Counter'}.`,
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

    // 6. Atomic check-in transaction
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const { updated, nextQueueNumber } = await prisma.$transaction(async (tx) => {
      const fresh = await tx.appointment.findUnique({
        where: { id: appointment.id },
      });

      if (!fresh || fresh.isUsed || fresh.status !== 'CONFIRMED') {
        throw new Error(`APPOINTMENT_STATE_INVALID:${fresh?.status || 'UNKNOWN'}`);
      }

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
          counterName,
          isUsed: true,
          usedAt: new Date(),
          checkInTime: new Date(),
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

    await createAuditLog({
      userId: session.id,
      action: 'KIOSK_TOKEN_VALIDATED',
      details: {
        appointmentId: updated.id,
        queueNumber: nextQueueNumber,
        studentId: updated.user.studentId,
        studentName: `${updated.user.firstName} ${updated.user.lastName}`,
        counterName,
      },
      ipAddress: ip,
    });

    broadcastQueueUpdate({
      action: 'TICKET_CHECKED_IN',
      queueNumber: nextQueueNumber,
      appointmentId: updated.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      code: 'CHECKED_IN_SUCCESS',
      message: `Check-in successful! Assigned Queue #${nextQueueNumber}.`,
      appointment: updated,
    });
  } catch (error: any) {
    console.error('Kiosk scan error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during kiosk scan validation' },
      { status: 500 }
    );
  }
}

