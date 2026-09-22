import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

/**
 * Financial Analytics Endpoint
 * Provides comprehensive financial insights about refunds
 */
router.get('/financial', requireAuth, requireRole(Role.ADMIN, Role.FINANCE), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter: any = {};
    
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const refunds = await prisma.refundRequest.findMany({
      where: { loggedAt: dateFilter },
      include: { payment: true },
    });

    // Calculate financial metrics
    const totalRequested = refunds.reduce((sum, r) => sum + Number(r.requestedAmount), 0);
    const totalEligible = refunds.reduce((sum, r) => sum + Number(r.eligibleAmount || 0), 0);
    const totalProcessingFees = refunds.reduce((sum, r) => sum + Number(r.processingFeeDeducted || 0), 0);
    const totalGSTClawback = refunds.reduce((sum, r) => sum + Number(r.gstClawbackDeducted || 0), 0);
    const totalGeekoinsForfeited = refunds.reduce((sum, r) => sum + (r.geekoinsForfeited || 0), 0);

    // Status breakdown
    const statusBreakdown = refunds.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Refund reason analysis
    const reasonBreakdown = refunds.reduce((acc, r) => {
      acc[r.refundReason] = (acc[r.refundReason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Payment mode analysis
    const paymentModeBreakdown = refunds.reduce((acc, r) => {
      acc[r.payment.paymentMode] = (acc[r.payment.paymentMode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Financial impact by status
    const financialByStatus = refunds.reduce((acc, r) => {
      if (!acc[r.status]) {
        acc[r.status] = { count: 0, totalRequested: 0, totalEligible: 0 };
      }
      acc[r.status].count++;
      acc[r.status].totalRequested += Number(r.requestedAmount);
      acc[r.status].totalEligible += Number(r.eligibleAmount || 0);
      return acc;
    }, {} as Record<string, { count: number; totalRequested: number; totalEligible: number }>);

    res.json({
      overview: {
        totalRefunds: refunds.length,
        totalRequested: totalRequested / 100, // Convert to rupees
        totalEligible: totalEligible / 100,
        totalProcessingFees: totalProcessingFees / 100,
        totalGSTClawback: totalGSTClawback / 100,
        totalGeekoinsForfeited,
        averageRefundAmount: refunds.length > 0 ? totalRequested / refunds.length / 100 : 0,
        savingsRate: totalRequested > 0 ? ((totalRequested - totalEligible) / totalRequested * 100).toFixed(2) : '0',
      },
      breakdowns: {
        byStatus: statusBreakdown,
        byReason: reasonBreakdown,
        byPaymentMode: paymentModeBreakdown,
      },
      financialByStatus,
      currency: 'INR',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch financial analytics' });
  }
});

/**
 * Performance Analytics Endpoint
 * Analyzes team performance and SLA compliance
 */
router.get('/performance', requireAuth, requireRole(Role.ADMIN, Role.FINANCE), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter: any = {};
    
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const refunds = await prisma.refundRequest.findMany({
      where: { loggedAt: dateFilter },
      include: {
        approvedByUser: { select: { id: true, name: true, role: true } },
        disbursedByUser: { select: { id: true, name: true, role: true } },
        learner: { select: { assignedCoordinator: { select: { id: true, name: true } } } },
      },
    });

    const now = new Date();
    
    // SLA compliance analysis
    const slaAnalysis = {
      totalRefunds: refunds.length,
      slaBreached: refunds.filter(r => r.slaDueAt && r.slaDueAt < now && (!r.resolvedAt || r.resolvedAt > now)).length,
      onTime: refunds.filter(r => r.resolvedAt && r.slaDueAt && r.resolvedAt <= r.slaDueAt).length,
      pendingSLA: refunds.filter(r => !r.resolvedAt && r.slaDueAt && r.slaDueAt >= now).length,
    };

    slaAnalysis.complianceRate = slaAnalysis.totalRefunds > 0 
      ? ((slaAnalysis.onTime / slaAnalysis.totalRefunds) * 100).toFixed(2) 
      : '0';

    // Coordinator performance
    const coordinatorPerformance = refunds.reduce((acc, r) => {
      const coordinatorId = r.learner.assignedCoordinator?.id;
      if (coordinatorId) {
        if (!acc[coordinatorId]) {
          acc[coordinatorId] = {
            name: r.learner.assignedCoordinator.name,
            totalRefunds: 0,
            approvedRefunds: 0,
            avgResolutionTime: 0,
            resolutionTimes: [],
          };
        }
        acc[coordinatorId].totalRefunds++;
        if (r.status === 'APPROVED' || r.status === 'DISBURSED') {
          acc[coordinatorId].approvedRefunds++;
        }
        if (r.loggedAt && r.resolvedAt) {
          const resolutionTime = Math.floor((r.resolvedAt.getTime() - r.loggedAt.getTime()) / (1000 * 60 * 60 * 24));
          acc[coordinatorId].resolutionTimes.push(resolutionTime);
        }
      }
      return acc;
    }, {} as Record<number, any>);

    // Calculate average resolution times
    Object.values(coordinatorPerformance).forEach((coord: any) => {
      if (coord.resolutionTimes.length > 0) {
        coord.avgResolutionTime = coord.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / coord.resolutionTimes.length;
      }
      delete coord.resolutionTimes;
    });

    // Finance team performance
    const financePerformance = refunds.reduce((acc, r) => {
      const financeId = r.approvedBy || r.disbursedBy;
      if (financeId) {
        const financeUser = r.approvedByUser || r.disbursedByUser;
        if (financeUser) {
          if (!acc[financeUser.id]) {
            acc[financeUser.id] = {
              name: financeUser.name,
              approvals: 0,
              disbursements: 0,
              totalAmountApproved: 0,
              totalAmountDisbursed: 0,
            };
          }
          if (r.approvedBy === financeUser.id) {
            acc[financeUser.id].approvals++;
            acc[financeUser.id].totalAmountApproved += Number(r.eligibleAmount || 0);
          }
          if (r.disbursedBy === financeUser.id) {
            acc[financeUser.id].disbursements++;
            acc[financeUser.id].totalAmountDisbursed += Number(r.eligibleAmount || 0);
          }
        }
      }
      return acc;
    }, {} as Record<number, any>);

    // Convert amounts to rupees
    Object.values(financePerformance).forEach((finance: any) => {
      finance.totalAmountApproved /= 100;
      finance.totalAmountDisbursed /= 100;
    });

    res.json({
      sla: slaAnalysis,
      coordinatorPerformance: Object.values(coordinatorPerformance),
      financePerformance: Object.values(financePerformance),
      totalRefundsAnalyzed: refunds.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch performance analytics' });
  }
});

/**
 * Trend Analysis Endpoint
 * Provides monthly/yearly trends and patterns
 */
router.get('/trends', requireAuth, requireRole(Role.ADMIN, Role.FINANCE), async (req, res) => {
  try {
    const { period = 'monthly', year } = req.query;
    
    const currentYear = year ? Number(year) : new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);

    const refunds = await prisma.refundRequest.findMany({
      where: {
        loggedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { payment: true },
    });

    let trendData: any[] = [];

    if (period === 'monthly') {
      // Monthly breakdown
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
        count: 0,
        totalAmount: 0,
        totalEligible: 0,
        byStatus: {} as Record<string, number>,
      }));

      refunds.forEach(r => {
        const month = r.loggedAt.getMonth();
        monthlyData[month].count++;
        monthlyData[month].totalAmount += Number(r.requestedAmount);
        monthlyData[month].totalEligible += Number(r.eligibleAmount || 0);
        monthlyData[month].byStatus[r.status] = (monthlyData[month].byStatus[r.status] || 0) + 1;
      });

      trendData = monthlyData.map(m => ({
        ...m,
        totalAmount: m.totalAmount / 100,
        totalEligible: m.totalEligible / 100,
      }));
    } else if (period === 'quarterly') {
      // Quarterly breakdown
      const quarterlyData = Array.from({ length: 4 }, (_, i) => ({
        quarter: i + 1,
        count: 0,
        totalAmount: 0,
        totalEligible: 0,
        byStatus: {} as Record<string, number>,
      }));

      refunds.forEach(r => {
        const quarter = Math.floor(r.loggedAt.getMonth() / 3);
        quarterlyData[quarter].count++;
        quarterlyData[quarter].totalAmount += Number(r.requestedAmount);
        quarterlyData[quarter].totalEligible += Number(r.eligibleAmount || 0);
        quarterlyData[quarter].byStatus[r.status] = (quarterlyData[quarter].byStatus[r.status] || 0) + 1;
      });

      trendData = quarterlyData.map(q => ({
        ...q,
        totalAmount: q.totalAmount / 100,
        totalEligible: q.totalEligible / 100,
      }));
    }

    // Year-over-year comparison (if we have historical data)
    const yoyData = await prisma.refundRequest.groupBy({
      by: ['loggedAt'],
      where: {
        loggedAt: {
          gte: new Date(currentYear - 2, 0, 1),
          lte: new Date(currentYear, 11, 31),
        },
      },
      _count: true,
      _sum: { requestedAmount: true },
    });

    const yearlyComparison = yoyData.reduce((acc, item) => {
      const year = item.loggedAt.getFullYear();
      if (!acc[year]) {
        acc[year] = { count: 0, totalAmount: 0 };
      }
      acc[year].count += item._count;
      acc[year].totalAmount += Number(item._sum.requestedAmount || 0);
      return acc;
    }, {} as Record<number, { count: number; totalAmount: number }>);

    Object.keys(yearlyComparison).forEach(year => {
      yearlyComparison[Number(year)].totalAmount /= 100;
    });

    res.json({
      period,
      year: currentYear,
      trendData,
      yearlyComparison,
      totalRefunds: refunds.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trend analytics' });
  }
});

/**
 * Course and Regional Analytics
 * Breakdown by course types and geographic regions
 */
router.get('/courses', requireAuth, requireRole(Role.ADMIN, Role.FINANCE), async (req, res) => {
  try {
    const refunds = await prisma.refundRequest.findMany({
      include: {
        learner: {
          select: {
            courseEnrolled: true,
            batchId: true,
          },
        },
        payment: true,
      },
    });

    // Course-wise analysis
    const courseAnalysis = refunds.reduce((acc, r) => {
      const course = r.learner.courseEnrolled;
      if (!acc[course]) {
        acc[course] = {
          course,
          totalRefunds: 0,
          totalAmount: 0,
          totalEligible: 0,
          approvalRate: 0,
          approvedCount: 0,
        };
      }
      acc[course].totalRefunds++;
      acc[course].totalAmount += Number(r.requestedAmount);
      acc[course].totalEligible += Number(r.eligibleAmount || 0);
      if (r.status === 'APPROVED' || r.status === 'DISBURSED') {
        acc[course].approvedCount++;
      }
      return acc;
    }, {} as Record<string, any>);

    // Calculate approval rates
    Object.values(courseAnalysis).forEach((course: any) => {
      course.approvalRate = course.totalRefunds > 0 
        ? ((course.approvedCount / course.totalRefunds) * 100).toFixed(2) 
        : '0';
      course.totalAmount /= 100;
      course.totalEligible /= 100;
    });

    // Batch analysis (if batch data is available)
    const batchAnalysis = refunds.reduce((acc, r) => {
      const batch = r.learner.batchId || 'Unassigned';
      if (!acc[batch]) {
        acc[batch] = {
          batch,
          totalRefunds: 0,
          totalAmount: 0,
        };
      }
      acc[batch].totalRefunds++;
      acc[batch].totalAmount += Number(r.requestedAmount);
      return acc;
    }, {} as Record<string, any>);

    Object.values(batchAnalysis).forEach((batch: any) => {
      batch.totalAmount /= 100;
    });

    res.json({
      courseAnalysis: Object.values(courseAnalysis).sort((a, b) => b.totalRefunds - a.totalRefunds),
      batchAnalysis: Object.values(batchAnalysis).sort((a, b) => b.totalRefunds - a.totalRefunds),
      totalCourses: Object.keys(courseAnalysis).length,
      totalBatches: Object.keys(batchAnalysis).length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch course analytics' });
  }
});

export default router;