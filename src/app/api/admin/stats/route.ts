import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalAppointments,
      todayAppointments,
      completedToday,
      servingToday,
      waitingToday,
      cancelledToday,
      totalUsers,
      failedScansCount,
      allAppointments,
    ] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({
        where: { appointmentDate: { gte: startOfDay, lt: endOfDay } },
      }),
      prisma.appointment.count({
        where: {
          appointmentDate: { gte: startOfDay, lt: endOfDay },
          status: 'COMPLETED',
        },
      }),
      prisma.appointment.count({
        where: {
          appointmentDate: { gte: startOfDay, lt: endOfDay },
          status: 'SERVING',
        },
      }),
      prisma.appointment.count({
        where: {
          appointmentDate: { gte: startOfDay, lt: endOfDay },
          status: 'CHECKED_IN',
        },
      }),
      prisma.appointment.count({
        where: {
          appointmentDate: { gte: startOfDay, lt: endOfDay },
          status: 'CANCELLED',
        },
      }),
      prisma.user.count(),
      prisma.auditLog.count({
        where: { action: 'QR_INVALID' },
      }),
      prisma.appointment.findMany({
        where: { appointmentDate: { gte: startOfDay, lt: endOfDay } },
        select: { purpose: true, timeSlot: true, status: true },
      }),
    ]);

    // Breakdown by purpose
    const purposeCounts: Record<string, number> = {};
    allAppointments.forEach((a) => {
      purposeCounts[a.purpose] = (purposeCounts[a.purpose] || 0) + 1;
    });

    const purposeBreakdown = Object.entries(purposeCounts).map(([purpose, count]) => ({
      purpose,
      count,
    }));

    return NextResponse.json({
      metrics: {
        totalAppointments,
        todayAppointments,
        completedToday,
        servingToday,
        waitingToday,
        cancelledToday,
        totalUsers,
        failedScansCount,
      },
      purposeBreakdown,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to retrieve stats' }, { status: 500 });
  }
}

