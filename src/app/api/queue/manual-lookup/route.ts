import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastQueueUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'STAFF' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Search appointments for today or active appointments matching Student ID or Full Name
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        OR: [
          { user: { studentId: { contains: query } } },
          { user: { firstName: { contains: query } } },
          { user: { lastName: { contains: query } } },
          { user: { email: { contains: query } } },
          { qrToken: { startsWith: query } },
        ],
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
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ results: appointments });
  } catch (error) {
    console.error('[Manual Search Error]:', error);
    return NextResponse.json({ error: 'Failed to search student appointments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'STAFF' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    const { appointmentId, reason, counterName } = body;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { user: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: `Cannot manually check in appointment in '${appointment.status}' state.` },
        { status: 400 }
      );
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const { updated, nextQueueNumber } = await prisma.$transaction(
      async (tx) => {
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
            counterName: counterName || 'Window 1 - Cashier',
            remarks: reason
              ? `${appointment.remarks ? appointment.remarks + ' | ' : ''}Manual check-in override: ${reason}`
              : appointment.remarks,
          },
          include: { user: true },
        });

        return { updated: updatedAppt, nextQueueNumber: nextNum };
      },
      { isolationLevel: 'Serializable' }
    );

    await createAuditLog({
      userId: session.id,
      action: 'MANUAL_CHECKIN_OVERRIDE',
      details: {
        appointmentId: updated.id,
        studentId: updated.user.studentId,
        studentName: `${updated.user.firstName} ${updated.user.lastName}`,
        queueNumber: nextQueueNumber,
        staffId: session.id,
        reason: reason || 'Phone unreadable / dead battery',
        counterName,
        timestamp: new Date().toISOString(),
      },
      ipAddress: ip,
    });

    broadcastQueueUpdate({
      action: 'QUEUE_CHECKED_IN',
      appointmentId: updated.id,
      queueNumber: nextQueueNumber,
    });

    return NextResponse.json({
      success: true,
      message: `Manual check-in confirmed! Assigned Queue #${nextQueueNumber}.`,
      appointment: updated,
    });
  } catch (error) {
    console.error('[Manual Override Error]:', error);
    return NextResponse.json({ error: 'Failed to process manual check-in' }, { status: 500 });
  }
}

