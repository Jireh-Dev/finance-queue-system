import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Fetch appointments for today
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            studentId: true,
            role: true,
          },
        },
      },
      orderBy: [
        { queueNumber: 'asc' },
        { checkInTime: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const servingList = todayAppointments.filter((a) => a.status === 'SERVING');
    const waitingQueue = todayAppointments.filter((a) => a.status === 'CHECKED_IN');
    const completedList = todayAppointments.filter((a) => a.status === 'COMPLETED');
    const upcomingToday = todayAppointments.filter((a) => a.status === 'CONFIRMED');

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

