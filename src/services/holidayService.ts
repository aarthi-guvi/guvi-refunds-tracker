import { prisma } from '../prisma';

/**
 * Holiday Service
 * Automatically imports and manages business calendar holidays
 * Supports Indian government holidays and custom holidays
 */

export interface Holiday {
  date: string;
  name: string;
  isHoliday: boolean;
  type?: 'national' | 'regional' | 'religious' | 'custom';
}

/**
 * Indian government holidays for 2025-2026
 * In production, this would be fetched from official government APIs
 */
const INDIAN_HOLIDAYS_2025: Holiday[] = [
  { date: '2025-01-26', name: 'Republic Day', isHoliday: true, type: 'national' },
  { date: '2025-03-14', name: 'Holi', isHoliday: true, type: 'religious' },
  { date: '2025-03-25', name: 'Ram Navami', isHoliday: true, type: 'religious' },
  { date: '2025-04-14', name: 'Tamil New Year', isHoliday: true, type: 'regional' },
  { date: '2025-05-01', name: 'Labour Day', isHoliday: true, type: 'national' },
  { date: '2025-08-15', name: 'Independence Day', isHoliday: true, type: 'national' },
  { date: '2025-08-19', name: 'Janmashtami', isHoliday: true, type: 'religious' },
  { date: '2025-10-02', name: 'Gandhi Jayanti', isHoliday: true, type: 'national' },
  { date: '2025-10-20', name: 'Dussehra', isHoliday: true, type: 'religious' },
  { date: '2025-11-01', name: 'Diwali', isHoliday: true, type: 'religious' },
  { date: '2025-12-25', name: 'Christmas', isHoliday: true, type: 'religious' },
];

const INDIAN_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-26', name: 'Republic Day', isHoliday: true, type: 'national' },
  { date: '2026-03-04', name: 'Holi', isHoliday: true, type: 'religious' },
  { date: '2026-03-25', name: 'Ram Navami', isHoliday: true, type: 'religious' },
  { date: '2026-04-14', name: 'Tamil New Year', isHoliday: true, type: 'regional' },
  { date: '2026-05-01', name: 'Labour Day', isHoliday: true, type: 'national' },
  { date: '2026-08-15', name: 'Independence Day', isHoliday: true, type: 'national' },
  { date: '2026-08-17', name: 'Janmashtami', isHoliday: true, type: 'religious' },
  { date: '2026-10-02', name: 'Gandhi Jayanti', isHoliday: true, type: 'national' },
  { date: '2026-10-09', name: 'Dussehra', isHoliday: true, type: 'religious' },
  { date: '2026-11-08', name: 'Diwali', isHoliday: true, type: 'religious' },
  { date: '2026-12-25', name: 'Christmas', isHoliday: true, type: 'religious' },
];

/**
 * Get holidays for a specific year
 */
export const getHolidaysForYear = (year: number): Holiday[] => {
  switch (year) {
    case 2025:
      return INDIAN_HOLIDAYS_2025;
    case 2026:
      return INDIAN_HOLIDAYS_2026;
    default:
      // For future years, return 2026 as template
      console.warn(`No predefined holidays for year ${year}, using 2026 as template`);
      return INDIAN_HOLIDAYS_2026.map(holiday => ({
        ...holiday,
        date: holiday.date.replace('2026', String(year)),
      }));
  }
};

/**
 * Import holidays for a specific year into the database
 */
export const importHolidaysForYear = async (year: number): Promise<{
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
}> => {
  const holidays = getHolidaysForYear(year);
  const results = {
    success: true,
    imported: 0,
    updated: 0,
    errors: [] as string[],
  };

  for (const holiday of holidays) {
    try {
      const parsedDate = new Date(holiday.date);
      if (Number.isNaN(parsedDate.getTime())) {
        results.errors.push(`Invalid date format: ${holiday.date}`);
        continue;
      }

      const existing = await prisma.businessDayCalendar.findUnique({
        where: { date: parsedDate },
      });

      if (existing) {
        await prisma.businessDayCalendar.update({
          where: { date: parsedDate },
          data: { isHoliday: holiday.isHoliday },
        });
        results.updated++;
      } else {
        await prisma.businessDayCalendar.create({
          data: {
            date: parsedDate,
            isHoliday: holiday.isHoliday,
          },
        });
        results.imported++;
      }
    } catch (error) {
      results.errors.push(`Failed to import ${holiday.name}: ${error}`);
      results.success = false;
    }
  }

  return results;
};

/**
 * Import holidays for multiple years
 */
export const importHolidaysForYears = async (years: number[]): Promise<{
  success: boolean;
  totalImported: number;
  totalUpdated: number;
  yearResults: Array<{ success: boolean; imported: number; updated: number; errors: string[] }>;
}> => {
  const yearResults = await Promise.all(
    years.map(year => importHolidaysForYear(year))
  );

  return {
    success: yearResults.every(r => r.success),
    totalImported: yearResults.reduce((sum, r) => sum + r.imported, 0),
    totalUpdated: yearResults.reduce((sum, r) => sum + r.updated, 0),
    yearResults,
  };
};

/**
 * Get current year holidays
 */
export const getCurrentYearHolidays = async (): Promise<Holiday[]> => {
  const currentYear = new Date().getFullYear();
  const storedHolidays = await prisma.businessDayCalendar.findMany({
    where: {
      date: {
        gte: new Date(`${currentYear}-01-01`),
        lte: new Date(`${currentYear}-12-31`),
      },
      isHoliday: true,
    },
    orderBy: { date: 'asc' },
  });

  // If no holidays stored, import them
  if (storedHolidays.length === 0) {
    console.log('No holidays found in database, importing current year holidays...');
    await importHolidaysForYear(currentYear);
    return getHolidaysForYear(currentYear);
  }

  return storedHolidays.map(h => ({
    date: h.date.toISOString().split('T')[0],
    name: 'Holiday', // In production, would store holiday names
    isHoliday: h.isHoliday,
  }));
};

/**
 * Check if a specific date is a holiday
 */
export const isHoliday = async (date: Date): Promise<boolean> => {
  const holiday = await prisma.businessDayCalendar.findUnique({
    where: { date },
    select: { isHoliday: true },
  });
  return holiday?.isHoliday || false;
};

/**
 * Get upcoming holidays (next 30 days)
 */
export const getUpcomingHolidays = async (days: number = 30): Promise<Holiday[]> => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const holidays = await prisma.businessDayCalendar.findMany({
    where: {
      date: {
        gte: today,
        lte: futureDate,
      },
      isHoliday: true,
    },
    orderBy: { date: 'asc' },
  });

  return holidays.map(h => ({
    date: h.date.toISOString().split('T')[0],
    name: 'Holiday',
    isHoliday: h.isHoliday,
  }));
};

/**
 * Auto-import holidays for current and next year
 * Call this during application startup or periodically
 */
export const autoImportHolidays = async (): Promise<void> => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  console.log(`Auto-importing holidays for ${currentYear} and ${nextYear}...`);
  
  const result = await importHolidaysForYears([currentYear, nextYear]);
  
  console.log(`Holiday import completed: ${result.totalImported} imported, ${result.totalUpdated} updated`);
  
  if (!result.success) {
    console.error('Some holiday imports failed:', result.yearResults);
  }
};