import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';
import { broadcastQueueUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'STAFF' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only Finance Office Staff or Admin can validate tokens.' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimitKey = `token-validate:${session.id}:${ip}`;

    // Rate Limiting: Max 10 requests per minute per session/IP
    const rateLimit = checkRateLimit(rateLimitKey, { limit: 10, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          code: 'RATE_LIMITED',
          error: `Too many validation requests. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
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
    if (!body || !body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        { code: 'INVALID_INPUT', error: 'Please provide a valid 64-character token.' },
        { status: 400 }
      );
    }

    const token = body.token.trim();
    const counterName = (body.counterName || 'Window 1 - Cashier').trim();

    // 1. Look up appointment by token
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
        action: 'TOKEN_VALIDATION_FAILED',
        details: {
          reason: 'Token does not exist',
          tokenPrefix: token.substring(0, 10) + '...',
          staffId: session.id,
          counterName,
        },
        ipAddress: ip,
      });

      return NextResponse.json(
        {
          code: 'TOKEN_NOT_FOUND',
          error: 'Invalid QR Code: Token reference does not match any scheduled appointment.',
        },
        { status: 404 }
      );
    }

    // 2. Check if already used
    if (appointment.isUsed || appointment.status === 'COMPLETED') {
      await createAuditLog({
        userId: session.id,
        action: 'TOKEN_VALIDATION_FAILED',
        details: {
          reason: 'Token already used',
          appointmentId: appointment.id,
          studentId: appointment.user.studentId,
          usedAt: appointment.usedAt,
          staffId: session.id,
          counterName,
        },
        ipAddress: ip,
      });

      return NextResponse.json(
        {
          code: 'ALREADY_USED',
          error: `This token was already used on ${
            appointment.usedAt
              ? new Date(appointment.usedAt).toLocaleString()
              : 'a previous visit'
          }.`,
          appointment,
        },
        { status: 409 }
      );
    }

    // 3. Check if cancelled
    if (appointment.status === 'CANCELLED') {
      await createAuditLog({
        userId: session.id,
        action: 'TOKEN_VALIDATION_FAILED',
        details: {
          reason: 'Appointment cancelled',
          appointmentId: appointment.id,
          studentId: appointment.user.studentId,
          staffId: session.id,
          counterName,
        },
        ipAddress: ip,
      });

      return NextResponse.json(
        {
          code: 'APPOINTMENT_CANCELLED',
          error: `This appointment was cancelled (${appointment.remarks || 'No reason provided'}).`,
          appointment,
        },
        { status: 400 }
      );
    }

    // 4. Check expiration (expiresAt or appointment date)
    const now = new Date();
    if (appointment.expiresAt && now > appointment.expiresAt) {
      await createAuditLog({
        userId: session.id,
        action: 'TOKEN_VALIDATION_FAILED',
        details: {
          reason: 'Token expired',
          appointmentId: appointment.id,
          studentId: appointment.user.studentId,
          expiresAt: appointment.expiresAt,
          staffId: session.id,
          counterName,
        },
        ipAddress: ip,
      });

      return NextResponse.json(
        {
          code: 'TOKEN_EXPIRED',
          error: `This token expired on ${new Date(appointment.expiresAt).toLocaleDateString()}. Please re-schedule.`,
          appointment,
        },
        { status: 400 }
      );
    }

    // 5. Already checked in or currently serving
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

    // 6. Atomic Transaction: Check in, mark token as used, and assign queue number
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const { updated, nextQueueNumber } = await prisma.$transaction(
      async (tx) => {
        // Re-read appointment inside transaction to prevent double validation race condition
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
            isUsed: true,
            usedAt: new Date(),
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
      { isolationLevel: 'Serializable' }
    );

    // 7. Audit Log on successful check-in
    await createAuditLog({
      userId: session.id,
      action: 'TOKEN_VALIDATED',
      details: {
        appointmentId: updated.id,
        studentId: updated.user.studentId,
        studentName: `${updated.user.firstName} ${updated.user.lastName}`,
        queueNumber: nextQueueNumber,
        purpose: updated.purpose,
        counterName,
        staffId: session.id,
        timestamp: new Date().toISOString(),
      },
      ipAddress: ip,
    });

    // 8. Broadcast real-time queue change
    broadcastQueueUpdate({
      action: 'QUEUE_CHECKED_IN',
      appointmentId: updated.id,
      queueNumber: nextQueueNumber,
    });

    return NextResponse.json({
      success: true,
      code: 'CHECKED_IN_SUCCESS',
      message: `Token validated! Assigned Queue #${nextQueueNumber}.`,
      appointment: updated,
    });
  } catch (error: any) {
    if (error?.message?.startsWith('APPOINTMENT_STATE_INVALID:')) {
      const state = error.message.split(':')[1];
      return NextResponse.json(
        {
          code: 'INVALID_STATE',
          error: `Appointment is already in '${state}' status and cannot be validated again.`,
        },
        { status: 409 }
      );
    }

    console.error('[Token Validate Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while validating the token.' },
      { status: 500 }
    );
  }
}

