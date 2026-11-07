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

