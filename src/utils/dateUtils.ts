import { BusinessDayCalendar } from '@prisma/client';
import { subDays, addDays, isWeekend, isSameDay } from 'date-fns';

/**
 * Checks if a given date is a business day according to the calendar.
 * Weekends are considered non‑business days, plus any dates marked as holidays.
 */
export const isBusinessDay = (
  date: Date,
  holidays: Set<string> // ISO string of dates (YYYY‑MM‑DD)
): boolean => {
  if (isWeekend(date)) return false;
  const iso = date.toISOString().slice(0, 10);
  return !holidays.has(iso);
};

/**
 * Adds a number of business days to a start date.
 * Skips weekends and any dates present in the holidays set.
 */
export const addBusinessDays = (
  start: Date,
  days: number,
  holidays: Set<string>
): Date => {
  let result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result, holidays)) {
      added++;
    }
  }
  return result;
};

/**
 * Loads holidays from the BusinessDayCalendar table and returns a Set of ISO strings.
 */
export const loadHolidaySet = async (prisma: any): Promise<Set<string>> => {
  const holidays = await prisma.businessDayCalendar.findMany({
    where: { isHoliday: true },
    select: { date: true },
  });
  return new Set(holidays.map((h: any) => h.date.toISOString().slice(0, 10)));
};
