import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendStatusChangeNotification, sendAssignmentNotification } from '../services/notificationService';
import { importHolidaysForYear, importHolidaysForYears, getCurrentYearHolidays, getUpcomingHolidays, autoImportHolidays } from '../services/holidayService';

const router = Router();

// ========== USER MANAGEMENT ENDPOINTS ==========

/** GET /api/admin/users – list all users (admin only) */
router.get('/users', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/** POST /api/admin/users – create new user (admin only) */
router.post('/users', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { email, password, name, role } = req.body as { 
    email?: string; 
    password?: string; 
    name?: string; 
    role?: Role 
  };
  
  if (!email || !password || !name || !role || !Object.values(Role).includes(role)) {
    return res.status(400).json({ error: 'email, password, name, and a valid role are required' });
  }
  
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ 
      data: { email, passwordHash, name, role }, 
      select: { id: true, email: true, name: true, role: true, createdAt: true } 
    });
    return res.status(201).json(user);
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'A user with that email already exists' });
    console.error(error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

/** PUT /api/admin/users/:id – update user (admin only) */
router.put('/users/:id', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { id } = req.params;
  const { email, name, role, password } = req.body as { 
    email?: string; 
    name?: string; 
    role?: Role; 
    password?: string 
  };
  
  try {
    const updateData: any = {};
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (role && Object.values(Role).includes(role)) updateData.role = role;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    
    return res.json(user);
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    if (error?.code === 'P2002') return res.status(409).json({ error: 'A user with that email already exists' });
    console.error(error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

/** DELETE /api/admin/users/:id – delete user (admin only) */
router.delete('/users/:id', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { id } = req.params;
  
  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    return res.status(204).send();
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ========== BUSINESS CALENDAR ENDPOINTS ==========

/** GET /api/admin/business-calendar – get all calendar entries (admin only) */
router.get('/business-calendar', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const { from, to } = req.query;
    const where: any = {};
    
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) where.date.lte = new Date(to as string);
    }
    
    const calendar = await prisma.businessDayCalendar.findMany({
      where,
      orderBy: { date: 'asc' },
    });
    
    res.json(calendar);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch business calendar' });
  }
});

/** PUT /api/admin/business-calendar – upsert calendar entry (admin only) */
router.put('/business-calendar', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { date, isHoliday } = req.body as { date?: string; isHoliday?: boolean };
  const parsedDate = date ? new Date(date) : undefined;
  
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || typeof isHoliday !== 'boolean') {
    return res.status(400).json({ error: 'date and isHoliday are required' });
  }
  
  try {
    const calendarEntry = await prisma.businessDayCalendar.upsert({
      where: { date: parsedDate },
      update: { isHoliday },
      create: { date: parsedDate, isHoliday },
    });
    return res.json(calendarEntry);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update business calendar' });
  }
});

/** DELETE /api/admin/business-calendar/:date – delete calendar entry (admin only) */
router.delete('/business-calendar/:date', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { date } = req.params;
  const parsedDate = new Date(Array.isArray(date) ? date[0] : date);

  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  
  try {
    await prisma.businessDayCalendar.delete({ where: { date: parsedDate } });
    return res.status(204).send();
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Calendar entry not found' });
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete calendar entry' });
  }
});

/** POST /api/admin/business-calendar/bulk – bulk import calendar entries (admin only) */
router.post('/business-calendar/bulk', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { entries } = req.body as { 
    entries?: Array<{ date: string; isHoliday: boolean }> 
  };
  
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries array is required' });
  }
  
  try {
    const results = await Promise.all(
      entries.map(({ date, isHoliday }) => {
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date: ${date}`);
        }
        return prisma.businessDayCalendar.upsert({
          where: { date: parsedDate },
          update: { isHoliday },
          create: { date: parsedDate, isHoliday },
        });
      })
    );
    
    return res.json({ 
      message: `Successfully processed ${results.length} calendar entries`,
      count: results.length 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to bulk import calendar entries' });
  }
});

/** POST /api/admin/business-calendar/import-year – auto-import holidays for a specific year (admin only) */
router.post('/business-calendar/import-year', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { year } = req.body as { year?: number };
  
  if (!year || year < 2020 || year > 2030) {
    return res.status(400).json({ error: 'Valid year (2020-2030) is required' });
  }
  
  try {
    const result = await importHolidaysForYear(year);
    
    return res.json({
      message: `Holiday import for ${year} completed`,
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
      success: result.success,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to import holidays' });
  }
});

/** POST /api/admin/business-calendar/auto-import – auto-import current and next year holidays (admin only) */
router.post('/business-calendar/auto-import', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    await autoImportHolidays();
    
    return res.json({
      message: 'Auto-import of current and next year holidays completed successfully',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to auto-import holidays' });
  }
});

/** GET /api/admin/business-calendar/upcoming – get upcoming holidays (admin only) */
router.get('/business-calendar/upcoming', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const holidays = await getUpcomingHolidays(days);
    
    return res.json({
      holidays,
      count: holidays.length,
      days,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch upcoming holidays' });
  }
});

// ========== BULK REFUND OPERATIONS ==========

/** POST /api/admin/refunds/bulk/status – bulk update refund statuses (admin only) */
router.post('/refunds/bulk/status', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { refundIds, toStatus, rejectionReason } = req.body as {
    refundIds?: number[];
    toStatus?: string;
    rejectionReason?: string;
  };
  
  if (!Array.isArray(refundIds) || refundIds.length === 0) {
    return res.status(400).json({ error: 'refundIds array is required' });
  }
  
  if (!toStatus) {
    return res.status(400).json({ error: 'toStatus is required' });
  }
  
  try {
    const results = await Promise.all(
      refundIds.map(async (id) => {
        const refund = await prisma.refundRequest.findUnique({
          where: { id },
          include: { learner: true, payment: true },
        });
        
        if (!refund) {
          return { id, success: false, error: 'Refund not found' };
        }
        
        // Update status
        const updated = await prisma.refundRequest.update({
          where: { id },
          data: {
            status: toStatus as any,
            updatedBy: req.user!.userId,
            ...(toStatus === 'APPROVED' ? { approvedBy: req.user!.userId } : {}),
            ...(toStatus === 'DISBURSED' ? { disbursedBy: req.user!.userId } : {}),
            ...(toStatus === 'DISBURSED' || toStatus === 'REJECTED' ? { resolvedAt: new Date() } : {}),
            ...(toStatus === 'REJECTED' && rejectionReason ? { rejectionReason } : {}),
          },
        });
        
        // Send notification
        await sendStatusChangeNotification({
          recipientEmail: refund.learner.email,
          recipientName: refund.learner.name,
          refundId: id,
          status: toStatus as any,
          previousStatus: refund.status as any,
          rejectionReason,
        });
        
        return { id, success: true, refund: updated };
      })
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return res.json({
      message: `Bulk status update completed: ${successful} successful, ${failed} failed`,
      total: refundIds.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to perform bulk status update' });
  }
});

/** POST /api/admin/refunds/bulk/assign – bulk assign refunds to coordinators (admin only) */
router.post('/refunds/bulk/assign', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { refundIds, coordinatorId } = req.body as {
    refundIds?: number[];
    coordinatorId?: number;
  };
  
  if (!Array.isArray(refundIds) || refundIds.length === 0) {
    return res.status(400).json({ error: 'refundIds array is required' });
  }
  
  if (!coordinatorId) {
    return res.status(400).json({ error: 'coordinatorId is required' });
  }
  
  try {
    // Verify coordinator exists
    const coordinator = await prisma.user.findUnique({
      where: { id: coordinatorId },
      select: { id: true, name: true, email: true, role: true },
    });
    
    if (!coordinator || coordinator.role !== 'COORDINATOR') {
      return res.status(400).json({ error: 'Invalid coordinator ID' });
    }
    
    const results = await Promise.all(
      refundIds.map(async (id) => {
        try {
          const updated = await prisma.refundRequest.update({
            where: { id },
            data: {
              learner: {
                update: {
                  assignedCoordinatorId: coordinatorId,
                },
              },
            },
            include: { learner: true },
          });
          
          // Send assignment notification
          await sendAssignmentNotification(
            coordinator.email,
            id,
            updated.learner.name
          );
          
          return { id, success: true, refund: updated };
        } catch (error) {
          return { id, success: false, error: 'Failed to assign' };
        }
      })
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return res.json({
      message: `Bulk assignment completed: ${successful} successful, ${failed} failed`,
      total: refundIds.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to perform bulk assignment' });
  }
});

/** POST /api/admin/refunds/bulk/delete – bulk delete refunds (admin only, dangerous operation) */
router.post('/refunds/bulk/delete', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { refundIds, confirm } = req.body as {
    refundIds?: number[];
    confirm?: boolean;
  };
  
  if (!confirm) {
    return res.status(400).json({ error: 'Confirmation required. Set confirm: true to proceed.' });
  }
  
  if (!Array.isArray(refundIds) || refundIds.length === 0) {
    return res.status(400).json({ error: 'refundIds array is required' });
  }
  
  try {
    const results = await Promise.all(
      refundIds.map(async (id) => {
        try {
          await prisma.refundRequest.delete({ where: { id } });
          return { id, success: true };
        } catch (error) {
          return { id, success: false, error: 'Failed to delete' };
        }
      })
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return res.json({
      message: `Bulk deletion completed: ${successful} successful, ${failed} failed`,
      total: refundIds.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to perform bulk deletion' });
  }
});

export default router;
