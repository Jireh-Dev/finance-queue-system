import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { TIME_SLOTS, MAX_SLOT_CAPACITY } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');

    if (!dateStr) {
      return NextResponse.json({ error: 'Date query parameter is required' }, { status: 400 });
    }

    const selectedDate = new Date(dateStr);
    if (isNaN(selectedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Fetch all active appointments on the given date (excluding CANCELLED)
    const activeAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      select: {
        timeSlot: true,
      },
    });

    // Count bookings per slot
    const slotCounts: Record<string, number> = {};
    activeAppointments.forEach((appt) => {
      slotCounts[appt.timeSlot] = (slotCounts[appt.timeSlot] || 0) + 1;
    });

    // Build capacity map without revealing student names or PII
    const slots = TIME_SLOTS.map((slot) => {
      const bookedCount = slotCounts[slot] || 0;
      const available = Math.max(0, MAX_SLOT_CAPACITY - bookedCount);
      const isFull = bookedCount >= MAX_SLOT_CAPACITY;

      return {
        slot,
        bookedCount,
        maxCapacity: MAX_SLOT_CAPACITY,
        availableSlots: available,
        isFull,
      };
    });

    return NextResponse.json({
      date: dateStr,
      maxCapacity: MAX_SLOT_CAPACITY,
      slots,
    });
  } catch (error) {
    console.error('[Slot Capacity Error]:', error);
    return NextResponse.json({ error: 'Failed to retrieve slot availability' }, { status: 500 });
  }
}

