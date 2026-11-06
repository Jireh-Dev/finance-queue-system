import { NextRequest } from 'next/server';
import { queueEvents } from '@/lib/events';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getQueueSnapshot() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

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

