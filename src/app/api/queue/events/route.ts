import { NextRequest } from 'next/server';
import { queueEvents } from '@/lib/events';
import prisma from '@/lib/db';
import { getPHTDayRange } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

async function getQueueSnapshot() {
  const { startOfDay, endOfDay } = getPHTDayRange();

  // Fetch appointments for today with ONLY non-sensitive queue display fields.
  // Strictly omit user, studentId, email, fullName, and phone numbers.
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

  const averageServiceMinutes = 8;
  const estimatedWaitMinutes = waitingQueue.length * averageServiceMinutes;

  return {
    servingList,
    waitingQueue,
    upcomingToday,
    completedTodayCount: completedList.length,
    totalWaitingCount: waitingQueue.length,
    estimatedWaitMinutes,
    nowServing: servingList[0] || null,
    serverTime: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send initial queue snapshot immediately
      try {
        const initialData = await getQueueSnapshot();
        controller.enqueue(encoder.encode(`event: queue-init\ndata: ${JSON.stringify(initialData)}\n\n`));
      } catch (err) {
        console.error('Error sending initial queue state via SSE:', err);
      }

      // 2. Listen for queue update broadcasts
      const onQueueChange = async (event: any) => {
        try {
          const freshData = await getQueueSnapshot();
          controller.enqueue(
            encoder.encode(`event: queue-update\ndata: ${JSON.stringify({ ...freshData, trigger: event })}\n\n`)
          );
        } catch (err) {
          console.error('Error pushing queue update via SSE:', err);
        }
      };

      queueEvents.on('queue-change', onQueueChange);

      // 3. Keep-alive heartbeat every 15s to prevent proxy timeouts
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        queueEvents.off('queue-change', onQueueChange);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

