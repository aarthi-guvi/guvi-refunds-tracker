import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { uploadSingle, uploadMultiple } from '../middleware/uploadMiddleware';
import { prisma } from '../prisma';
import { calculateEligibleAmount } from '../services/refundEligibility';
import { canTransition } from '../services/refundStateMachine';
import { sendStatusChangeNotification } from '../services/notificationService';
import { uploadFile, uploadMultipleFiles } from '../services/documentService';
import { Role } from '@prisma/client';

// Role‑based transition permissions (state + role)
const transitionPermissions: Record<string, Role[]> = {
  'LOGGED->UNDER_REVIEW': [Role.COORDINATOR, Role.ADMIN],
  'UNDER_REVIEW->APPROVED': [Role.FINANCE, Role.ADMIN],
  'UNDER_REVIEW->REJECTED': [Role.FINANCE, Role.ADMIN],
  'APPROVED->PROCESSING': [Role.FINANCE, Role.ADMIN],
  'PROCESSING->DISBURSED': [Role.FINANCE, Role.ADMIN],
  'APPROVED->ON_HOLD': [Role.FINANCE, Role.ADMIN],
};
import { RefundStatus } from '@prisma/client';

const router = Router();

// Authentication & role middleware are imported from ../middleware/auth

/** POST /api/refunds – log new request */
router.post('/', requireAuth, requireRole(Role.COORDINATOR, Role.ADMIN), async (req, res) => {
  try {
    const { learnerId, paymentId, refundReason, otherReasonDetail, initiatedVia } = req.body;
    const refund = await prisma.refundRequest.create({
      data: {
        learnerId,
        paymentId,
        initiatedBy: req.user!.userId,
        initiatedVia: initiatedVia || 'portal',
        refundReason,
        otherReasonDetail: otherReasonDetail ?? null,
        requestedAmount: req.body.requestedAmount,
        refundTo: req.body.refundTo || 'original_payment_source',
        // defaults set in schema
      },
      include: { learner: true, payment: true },
    });

    // Send notification to learner about new refund request
    await sendStatusChangeNotification({
      recipientEmail: refund.learner.email,
      recipientName: refund.learner.name,
      refundId: refund.id,
      status: refund.status,
      amount: refund.requestedAmount,
    });

    res.status(201).json(refund);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create refund request' });
  }
});

/** GET /api/refunds – list with role‑scoped filters */
router.get('/', requireAuth, async (req, res) => {
  const { page = '1', limit = '20', ...filters } = req.query as any;
  const where: any = {};

  // role‑scoped visibility
  if (req.user?.role === Role.BD) {
    where.learner = { assignedBdId: req.user.userId };
  } else if (req.user?.role === Role.COORDINATOR) {
    where.learner = { assignedCoordinatorId: req.user.userId };
  }

  // apply allowed filters
  if (filters.status) where.status = filters.status;
  if (filters.coordinatorId) where.learner = { ...(where.learner || {}), assignedCoordinatorId: Number(filters.coordinatorId) };
  if (filters.bdId) where.learner = { ...(where.learner || {}), assignedBdId: Number(filters.bdId) };
  if (filters.course) where.learner = { ...(where.learner || {}), courseEnrolled: filters.course };
  if (filters.paymentMode) where.payment = { paymentMode: filters.paymentMode };
  if (filters.from || filters.to) {
    where.loggedAt = {};
    if (filters.from) where.loggedAt.gte = new Date(filters.from);
    if (filters.to) where.loggedAt.lte = new Date(filters.to);
  }
  if (filters.slaBreached) {
    where.slaDueAt = { lt: new Date() };
    where.OR = [{ resolvedAt: null }, { resolvedAt: { gt: new Date() } }];
  }

  const take = Number(limit);
  const skip = (Number(page) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.refundRequest.findMany({
      where,
      skip,
      take,
      orderBy: { loggedAt: 'desc' },
      include: { learner: true, payment: true },
    }),
    prisma.refundRequest.count({ where }),
  ]);

  res.json({ refunds: items, items, total, page: Number(page), totalPages: Math.ceil(total / take) });
});

/** GET /api/refunds/:id/eligibility – preview */
router.get('/:id/eligibility', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const refund = await prisma.refundRequest.findFirst({
      where: { id, ...scopeForUser(req.user) },
      include: { learner: true, payment: true },
    });
    if (!refund) return res.status(404).json({ error: 'Not found' });

    const config = {
      freeLookWindowDays: 7,
      eligibilityWindowDays: 3,
      gstSafeWindowBusinessDays: 5,
      processingFeePaise: 5000,
    };

    const eligibility = await calculateEligibleAmount(
      refund.payment,
      refund.learner,
      refund,
      new Date(), // assume now for preview
      config
    );
    res.json(eligibility);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Eligibility calculation failed' });
  }
});

/** GET /api/refunds/:id – detail with row‑level scoping */
router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const refund = await prisma.refundRequest.findFirst({
    where: { id, ...scopeForUser(req.user) },
    include: { learner: true, payment: true, auditLogs: true },
  });
  if (!refund) return res.status(404).json({ error: 'Not found' });

  res.json(refund);
});

/** PATCH /api/refunds/:id/status – transition */
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { toStatus, rejectionReason } = req.body;
    const refund = await prisma.refundRequest.findFirst({
      where: { id, ...scopeForUser(req.user) },
      include: { learner: true, payment: true },
    });
    if (!refund) return res.status(404).json({ error: 'Not found' });
    if (!canTransition(refund.status as RefundStatus, toStatus as RefundStatus)) {
      return res.status(400).json({ error: `Invalid transition from ${refund.status} to ${toStatus}` });
    }
    // role‑based permission check
    const permKey = `${refund.status}->${toStatus}`;
    if (!transitionPermissions[permKey]?.includes(req.user?.role as any)) {
      return res.status(403).json({ error: 'Forbidden: your role cannot perform this transition' });
    }
    const updated = await prisma.refundRequest.update({
      where: { id },
      data: {
        status: toStatus as RefundStatus,
        updatedBy: req.user?.userId,
        ...(toStatus === RefundStatus.APPROVED ? { approvedBy: req.user?.userId } : {}),
        ...(toStatus === RefundStatus.DISBURSED ? { disbursedBy: req.user?.userId } : {}),
        ...(toStatus === RefundStatus.DISBURSED || toStatus === RefundStatus.REJECTED ? { resolvedAt: new Date() } : {}),
        ...(toStatus === RefundStatus.REJECTED && rejectionReason ? { rejectionReason } : {}),
      },
    });

    // Send notification to learner about status change
    await sendStatusChangeNotification({
      recipientEmail: refund.learner.email,
      recipientName: refund.learner.name,
      refundId: refund.id,
      status: toStatus as RefundStatus,
      previousStatus: refund.status as RefundStatus,
      amount: refund.requestedAmount,
      rejectionReason: rejectionReason,
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Status update failed' });
  }
});

/** POST /api/refunds/:id/notes */
router.post('/:id/notes', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { body } = req.body;
    
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({ error: 'Note body is required' });
    }

    // Check if refund exists and user has access
    const refund = await prisma.refundRequest.findFirst({
      where: { id, ...scopeForUser(req.user) },
    });
    if (!refund) return res.status(404).json({ error: 'Refund not found' });

    // Create note
    const note = await prisma.note.create({
      data: {
        refundRequestId: id,
        createdBy: req.user!.userId,
        body: body.trim(),
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    res.status(201).json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/** POST /api/refunds/:id/attachments */
router.post('/:id/attachments', requireAuth, uploadSingle, async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Check if refund exists and user has access
    const refund = await prisma.refundRequest.findFirst({
      where: { id, ...scopeForUser(req.user) },
    });
    if (!refund) return res.status(404).json({ error: 'Refund not found' });

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create attachment object
    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date(),
    };

    // Update refund with attachment info
    const currentAttachments = (refund.attachments as any[]) || [];
    const updatedAttachments = [...currentAttachments, attachment];

    await prisma.refundRequest.update({
      where: { id },
      data: { attachments: updatedAttachments as any },
    });

    res.json({ message: 'File uploaded successfully', attachment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

function scopeForUser(user: Express.Request['user']) {
  if (!user || user.role === Role.ADMIN || user.role === Role.FINANCE) return {};
  if (user.role === Role.BD) return { learner: { assignedBdId: user.userId } };
  return { learner: { assignedCoordinatorId: user.userId } };
}

export default router;
