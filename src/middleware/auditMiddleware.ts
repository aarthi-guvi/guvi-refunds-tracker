import { PrismaClient } from '@prisma/client';

/**
 * Enhanced Prisma middleware that creates comprehensive audit log entries for RefundRequest updates.
 * Tracks status changes, field modifications, rejection reasons, and user actions.
 */
export const auditMiddleware = (prisma: PrismaClient) => {
  prisma.$use(async (params: any, next: any) => {
    if (params.model === 'RefundRequest' && params.action === 'update') {
      const before = await prisma.refundRequest.findUnique({
        where: params.args.where,
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          eligibleAmount: true,
          processingFeeDeducted: true,
          gstClawbackDeducted: true,
          geekoinsForfeited: true,
          refundTo: true,
          requestedAmount: true,
        },
      });
      const result = await next(params);
      const after = result;

      const changedBy = params.args.data.updatedBy ?? null; // Expect caller passes updatedBy

      // Status change audit with enhanced details
      if (before?.status !== after.status) {
        let remarks = 'Status transition via API';
        
        // Add specific remarks for important status changes
        if (after.status === 'REJECTED') {
          remarks = `Refund rejected. Reason: ${after.rejectionReason || 'No reason provided'}`;
        } else if (after.status === 'APPROVED') {
          remarks = 'Refund approved for processing';
        } else if (after.status === 'DISBURSED') {
          remarks = 'Refund amount disbursed to learner';
        } else if (after.status === 'UNDER_REVIEW') {
          remarks = 'Refund moved to finance review';
        }

        await prisma.auditLog.create({
          data: {
            refundRequestId: after.id,
            changedBy: changedBy,
            fromStatus: before?.status,
            toStatus: after.status,
            fieldChanged: 'status',
            oldValue: before?.status?.toString() ?? null,
            newValue: after.status?.toString() ?? null,
            timestamp: new Date(),
            remarks,
          },
        });
      }

      // Rejection reason change audit
      if (before?.rejectionReason !== after.rejectionReason) {
        await prisma.auditLog.create({
          data: {
            refundRequestId: after.id,
            changedBy: changedBy,
            fieldChanged: 'rejectionReason',
            oldValue: before?.rejectionReason ?? null,
            newValue: after.rejectionReason ?? null,
            timestamp: new Date(),
            remarks: after.rejectionReason ? 'Rejection reason updated' : 'Rejection reason cleared',
          },
        });
      }

      // Financial amount changes audit
      const financialFields = [
        { field: 'eligibleAmount', label: 'Eligible Amount' },
        { field: 'processingFeeDeducted', label: 'Processing Fee' },
        { field: 'gstClawbackDeducted', label: 'GST Clawback' },
        { field: 'geekoinsForfeited', label: 'Geekoins Forfeited' },
        { field: 'requestedAmount', label: 'Requested Amount' },
      ];

      for (const { field, label } of financialFields) {
        if ((before as any)?.[field] !== after[field]) {
          await prisma.auditLog.create({
            data: {
              refundRequestId: after.id,
              changedBy: changedBy,
              fieldChanged: field,
              oldValue: (before as any)?.[field]?.toString() ?? null,
              newValue: after[field]?.toString() ?? null,
              timestamp: new Date(),
              remarks: `${label} changed from ₹${Number((before as any)?.[field] || 0) / 100} to ₹${Number(after[field] || 0) / 100}`,
            },
          });
        }
      }

      // Refund method change audit
      if (before?.refundTo !== after.refundTo) {
        await prisma.auditLog.create({
          data: {
            refundRequestId: after.id,
            changedBy: changedBy,
            fieldChanged: 'refundTo',
            oldValue: before?.refundTo ?? null,
            newValue: after.refundTo ?? null,
            timestamp: new Date(),
            remarks: `Refund method changed to ${after.refundTo}`,
          },
        });
      }

      return result;
    }
    
    // Audit user creation/deletion for security
    if (params.model === 'User') {
      if (params.action === 'create') {
        const result = await next(params);
        await prisma.auditLog.create({
          data: {
            refundRequestId: 0, // Use 0 for system-level audits
            changedBy: result.id, // Self-created
            fieldChanged: 'user_created',
            oldValue: null,
            newValue: JSON.stringify({ email: result.email, role: result.role }),
            timestamp: new Date(),
            remarks: `New user created: ${result.email} (${result.role})`,
          },
        });
        return result;
      }
      
      if (params.action === 'delete') {
        const before = await prisma.user.findUnique({
          where: params.args.where,
          select: { id: true, email: true, role: true },
        });
        const result = await next(params);
        await prisma.auditLog.create({
          data: {
            refundRequestId: 0, // System-level audit
            changedBy: 0, // System action
            fieldChanged: 'user_deleted',
            oldValue: JSON.stringify(before),
            newValue: null,
            timestamp: new Date(),
            remarks: `User deleted: ${before?.email} (${before?.role})`,
          },
        });
        return result;
      }
    }
    
    return next(params);
  });
};
