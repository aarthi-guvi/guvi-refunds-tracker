import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.put('/business-calendar', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { date, isHoliday } = req.body as { date?: string; isHoliday?: boolean };
  const parsedDate = date ? new Date(date) : undefined;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || typeof isHoliday !== 'boolean') {
    return res.status(400).json({ error: 'date and isHoliday are required' });
  }
  const calendarEntry = await prisma.businessDayCalendar.upsert({
    where: { date: parsedDate },
    update: { isHoliday },
    create: { date: parsedDate, isHoliday },
  });
  return res.json(calendarEntry);
});

export default router;