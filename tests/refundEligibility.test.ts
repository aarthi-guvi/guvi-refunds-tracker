import { calculateEligibleAmount } from '../src/services/refundEligibility';
import { Payment, RefundRequest, RefundReason } from '@prisma/client';
import { addDays } from 'date-fns';

jest.mock('../src/prisma', () => ({
  prisma: {
    businessDayCalendar: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

/** Mock config */
const config = {
  freeLookWindowDays: 7,
  eligibilityWindowDays: 3,
  gstSafeWindowBusinessDays: 5,
  processingFeePaise: 5000, // ₹50
};

describe('calculateEligibleAmount', () => {
  const learner = {
    enrollmentDate: new Date('2023-01-01'),
    courseStartDate: new Date('2023-01-15'),
  };

  const basePayment: Payment = {
    id: 1,
    learnerId: 1,
    amount: 1000000, // ₹10,000
    paymentType: 'FULL',
    paymentMode: 'CARD',
    gatewayTransactionId: 'tx123',
    financingPartnerName: null,
    paidAt: new Date('2022-12-20'),
    geekoinsUsed: 0,
    gstAmount: 180000, // 18% GST
  } as any;

  const baseRefund: RefundRequest = {
    id: 1,
    learnerId: 1,
    paymentId: 1,
    initiatedBy: 2,
    initiatedVia: 'email',
    refundReason: RefundReason.CHANGE_OF_MIND,
    otherReasonDetail: null,
    requestedAmount: 1000000,
    eligibleAmount: null,
    processingFeeDeducted: null,
    gstClawbackDeducted: null,
    geekoinsForfeited: null,
    refundTo: 'learner_bank_account',
    status: 'LOGGED',
    slaDueAt: null,
    approvedBy: null,
    disbursedBy: null,
    rejectionReason: null,
    loggedAt: new Date('2023-01-10'),
    resolvedAt: null,
    attachments: null,
    // additional fields required by type but not used
    otherFields: undefined,
  } as any;

  test('full refund within free‑look window', async () => {
    const requestDate = new Date('2023-01-05'); // within 7 days of enrollment
    const res = await calculateEligibleAmount(
      basePayment,
      learner,
      baseRefund,
      requestDate,
      config
    );
    expect(res.eligibleAmount).toBe(1000000 - config.processingFeePaise);
    // GST should be deducted because request after loggedAt > gstSafeWindow? loggedAt is 10th, request 5th earlier, so no GST clawback
    // Actually GST clawback only after gstSafeWindow; here request before loggedAt, so GST not deducted.
    const gstDeduction = res.deductions.find((d) => d.type === 'GST_CLARBACK');
    expect(gstDeduction).toBeUndefined();
  });

  test('GST clawback after safe window', async () => {
    const requestDate = addDays(new Date('2023-01-17'), 6); // 6 business days after loggedAt (10th) -> beyond 5 day window
    const res = await calculateEligibleAmount(
      basePayment,
      learner,
      baseRefund,
      requestDate,
      config
    );
    const gstDeduction = res.deductions.find((d) => d.type === 'GST_CLARBACK');
    expect(gstDeduction).toBeDefined();
    expect(gstDeduction?.amount).toBe(Number(basePayment.gstAmount));
    expect(res.eligibleAmount).toBeLessThan(1000000);
  });

  test('EMI partner forces manual review', async () => {
    const emiPayment = { ...basePayment, paymentMode: 'EMI_PARTNER' } as any;
    const requestDate = new Date('2023-01-05');
    const res = await calculateEligibleAmount(
      emiPayment,
      learner,
      baseRefund,
      requestDate,
      config
    );
    expect(res.requiresManualReview).toBe(true);
    expect(res.refundRoute).toBe('FINANCING_PARTNER');
  });
});
