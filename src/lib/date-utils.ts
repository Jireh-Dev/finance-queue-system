// Helper utilities for Philippine Standard Time (PHT / UTC+8) calculations
export const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Returns the start and end of a calendar day in PHT (UTC+8) represented as UTC Date objects.
 * This guarantees that queue queries and daily resets between 00:00 and 08:00 AM PHT
 * accurately reflect the current Philippine calendar day, rather than the previous day.
 */
export function getPHTDayRange(dateInput?: Date | string | number): { startOfDay: Date; endOfDay: Date } {
  const baseDate = dateInput ? new Date(dateInput) : new Date();
  // Shift to PHT representation
  const phtDate = new Date(baseDate.getTime() + PHT_OFFSET_MS);
  const phtYear = phtDate.getUTCFullYear();
  const phtMonth = phtDate.getUTCMonth();
  const phtDay = phtDate.getUTCDate();

  // Convert PHT midnight back to UTC Date
  const startOfDay = new Date(Date.UTC(phtYear, phtMonth, pDayOrDate(phtDay)) - PHT_OFFSET_MS);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  return { startOfDay, endOfDay };
}

function pDayOrDate(val: number): number {
  return val;
}

export interface PHTTimeSlotWindow {
  startTime: Date;
  endTime: Date;
  startStr: string;
  endStr: string;
}

/**
 * Parses an appointment's date and time slot string (e.g. "09:30 AM - 10:00 AM")
 * into exact start and end timestamps in UTC corresponding to Philippine Standard Time (PHT / UTC+8).
 */
export function getPHTSlotWindow(appointmentDate: Date | string | number, timeSlot: string): PHTTimeSlotWindow | null {
  const { startOfDay } = getPHTDayRange(appointmentDate);
  const parts = timeSlot.split('-').map((s) => s.trim());
  if (parts.length < 2) return null;

  const [startStr, endStr] = parts;

  function parseTimePart(tStr: string) {
    const match = tStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    const [_, hoursStr, minsStr, period] = match;
    let hours = parseInt(hoursStr, 10);
    const mins = parseInt(minsStr, 10);
    if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return { hours, mins };
  }

  const startP = parseTimePart(startStr);
  const endP = parseTimePart(endStr);
  if (!startP || !endP) return null;

  const startTime = new Date(startOfDay.getTime() + (startP.hours * 3600 + startP.mins * 60) * 1000);
  const endTime = new Date(startOfDay.getTime() + (endP.hours * 3600 + endP.mins * 60) * 1000);

  return { startTime, endTime, startStr, endStr };
}


