import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPHTDayRange } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { startOfDay, endOfDay } = getPHTDayRange();
    const session = await getSession();
    const isStaffOrAdmin = session?.role === 'STAFF' || session?.role === 'ADMIN';

    // Fetch appointments for today.
    // If request is authenticated as STAFF or ADMIN, include student user details so cashiers can identify the student.
    // Otherwise, strictly omit user, studentId, email, fullName, and phone numbers to prevent public PII leaks.
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
        ...(isStaffOrAdmin
          ? {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  studentId: true,
                  email: true,
                  phone: true,
                  role: true,
                },
              },
            }
          : {}),
      },
      orderBy: [
        { queueNumber: 'asc' },
        { checkInTime: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Map to include ticketNumber / counterNumber compatibility while keeping student identities private for public
    const sanitizedAppointments = todayAppointments.map((a: any) => ({
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
      user: isStaffOrAdmin ? a.user : undefined,
      studentName: isStaffOrAdmin && a.user ? `${a.user.firstName} ${a.user.lastName}` : undefined,
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

