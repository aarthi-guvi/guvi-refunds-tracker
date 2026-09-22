import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { RefundReason, Role, RefundStatus } from '@prisma/client';

const router = Router();

/** GET /api/dashboard/summary – returns KPI cards */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const scopedWhere = scopeForUser(req.user);
    const totalRefunds = await prisma.refundRequest.aggregate({
      where: { ...scopedWhere, loggedAt: { gte: monthStart } },
      _sum: { requestedAmount: true },
      _count: { _all: true },
    });
    // average resolution time (working days)
    const resolved = await prisma.refundRequest.findMany({
      where: { ...scopedWhere, resolvedAt: { not: null }, loggedAt: { gte: monthStart } },
      select: { loggedAt: true, resolvedAt: true },
    });
    const holidays = await prisma.businessDayCalendar.findMany({ where: { isHoliday: true } });
    const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
    const totalDays = resolved.reduce((acc, r) => {
      const days = diffBusinessDays(r.loggedAt, r.resolvedAt!, holidaySet);
      return acc + days;
    }, 0);
    const avgResolution = resolved.length ? totalDays / resolved.length : 0;

    // SLA breach %
    const slaBreached = await prisma.refundRequest.count({
      where: {
        slaDueAt: { lt: now },
        resolvedAt: { gt: now },
        ...scopedWhere,
        loggedAt: { gte: monthStart },
      },
    });
    const totalCount = totalRefunds._count._all;
    const slaBreachPct = totalCount ? (slaBreached / totalCount) * 100 : 0;

    const pendingCount = await prisma.refundRequest.count({ where: { ...scopedWhere, status: { in: ['LOGGED', 'UNDER_REVIEW', 'ON_HOLD'] } } });
    res.json({ totalRefunds: totalRefunds._sum.requestedAmount, totalCount, avgResolutionDays: avgResolution, slaBreachPct, pendingCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/** GET /api/dashboard/trends – chart data for the selected range */
router.get('/trends', requireAuth, async (req, res) => {
  try {
    const range = rangeDates(String(req.query.range || 'this-month'));
    const refunds = await prisma.refundRequest.findMany({
      where: { ...scopeForUser(req.user), loggedAt: { gte: range.from, lte: range.to } },
      select: { refundReason: true, loggedAt: true, status: true },
      orderBy: { loggedAt: 'asc' },
    });

    const reasonCounts = new Map<RefundReason, number>();
    const weeklyCounts = new Map<string, number>();
    const slaCounts = new Map<string, { total: number; compliant: number }>();
    for (const refund of refunds) {
      reasonCounts.set(refund.refundReason, (reasonCounts.get(refund.refundReason) || 0) + 1);
      const week = weekLabel(refund.loggedAt);
      weeklyCounts.set(week, (weeklyCounts.get(week) || 0) + 1);
      const slaBucket = monthLabel(refund.loggedAt);
      const current = slaCounts.get(slaBucket) || { total: 0, compliant: 0 };
      current.total += 1;
      if (refund.status === RefundStatus.DISBURSED || refund.status === RefundStatus.REJECTED) current.compliant += 1;
      slaCounts.set(slaBucket, current);
    }

    return res.json({
      byReason: Array.from(reasonCounts, ([label, value]) => ({ label: label.replaceAll('_', ' '), value })),
      weekly: Array.from(weeklyCounts, ([label, value]) => ({ label, value })),
      sla: Array.from(slaCounts, ([label, value]) => ({ label, value: value.total ? Math.round((value.compliant / value.total) * 100) : 0 })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch dashboard trends' });
  }
});

/** GET /api/dashboard/by-bd – refund volume grouped by assigned BD */
router.get('/by-bd', requireAuth, async (req, res) => {
  try {
    const range = rangeDates(String(req.query.range || 'this-month'));
    const refunds = await prisma.refundRequest.findMany({
      where: { ...scopeForUser(req.user), loggedAt: { gte: range.from, lte: range.to } },
      select: { learner: { select: { assignedBd: { select: { name: true } } } } },
    });
    const counts = new Map<string, number>();
    for (const refund of refunds) {
      const label = refund.learner.assignedBd?.name || 'Unassigned';
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return res.json(Array.from(counts, ([label, value]) => ({ label, value })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch BD dashboard data' });
  }
});

function scopeForUser(user: Express.Request['user']) {
  if (!user || user.role === Role.ADMIN || user.role === Role.FINANCE) return {};
  return user.role === Role.BD
    ? { learner: { assignedBdId: user.userId } }
    : { learner: { assignedCoordinatorId: user.userId } };
}

function rangeDates(range: string) {
  const to = new Date();
  const from = new Date(to);
  if (range === 'last-month') {
    from.setMonth(from.getMonth() - 1, 1);
    to.setDate(0);
  } else if (range === 'quarter') {
    from.setDate(from.getDate() - 90);
  } else {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

function weekLabel(date: Date) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { month: 'short' });
}

/** Helper diff business days */
function diffBusinessDays(start: Date, end: Date, holidays: Set<string>): number {
  let count = 0;
  let cur = new Date(start);
  while (cur <= end) {
    if (!isWeekend(cur) && !holidays.has(cur.toISOString().slice(0, 10))) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

import { isWeekend } from 'date-fns';

export default router;
