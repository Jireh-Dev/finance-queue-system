import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getPHTDayRange } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { startOfDay, endOfDay } = getPHTDayRange();

    // Fetch appointments for today with ONLY non-sensitive queue display fields.
    // Strictly omit user, studentId, email, fullName, and phone numbers to prevent PII leaks.
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      select: {
        id: true,
        queueNumber: true,
        status: true,
        counterName: true,
        purpose: true,
        createdAt: true,
        checkInTime: true,
        servedTime: true,
      },
      orderBy: [
        { queueNumber: 'asc' },
        { checkInTime: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Map to include ticketNumber / counterNumber compatibility while keeping student identities private
    const sanitizedAppointments = todayAppointments.map((a) => ({
      id: a.id,
      ticketNumber: a.queueNumber ? `Q-${a.queueNumber}` : null,
      queueNumber: a.queueNumber,
      status: a.status,
      counterName: a.counterName,
      counterNumber: a.counterName ? a.counterName.split('-')[0].trim() : null,
      purpose: a.purpose,
      createdAt: a.createdAt,
      checkInTime: a.checkInTime,
      servedTime: a.servedTime,
    }));

    const servingList = sanitizedAppointments.filter((a) => a.status === 'SERVING');
    const waitingQueue = sanitizedAppointments.filter((a) => a.status === 'CHECKED_IN');
    const completedList = sanitizedAppointments.filter((a) => a.status === 'COMPLETED');
    const upcomingToday = sanitizedAppointments.filter((a) => a.status === 'CONFIRMED');

    // Calculate dynamic estimated wait time: ~8 minutes per waiting customer
    const averageServiceMinutes = 8;
    const estimatedWaitMinutes = waitingQueue.length * averageServiceMinutes;

    return NextResponse.json(
      {
        servingList,
        waitingQueue,
        upcomingToday,
        completedTodayCount: completedList.length,
        totalWaitingCount: waitingQueue.length,
        estimatedWaitMinutes,
        nowServing: servingList[0] || null,
        serverTime: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json({ error: 'Failed to retrieve queue status' }, { status: 500 });
  }
}

