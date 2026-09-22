import { Payment, RefundRequest, RefundReason } from '@prisma/client';
import { addBusinessDays } from '../utils/dateUtils';
import { prisma } from '../prisma';

/**
 * Configuration loaded from DB or env – kept simple for now.
 */
export interface RefundConfig {
  freeLookWindowDays: number; // e.g., 7 days from enrollment or before course start
  eligibilityWindowDays: number; // days after course start when full refund still possible
  gstSafeWindowBusinessDays: number; // e.g., 5 working days after request before GST is clawed back
  processingFeePaise: number; // flat fee in paise
}

/**
 * Calculates eligible amount and deductions for a refund request.
 * Returns detailed breakdown used by the API and UI.
 */
export const calculateEligibleAmount = async (
  payment: Payment,
  learner: any, // minimal learner fields needed for dates
  refundRequest: RefundRequest,
  requestDate: Date,
  config: RefundConfig
) => {
  const deductions: { type: string; amount: number }[] = [];

  // Base cash component (exclude geekoins)
  const cashComponent = Number(payment.amount) - Number(payment.geekoinsUsed) * 100; // assume 1 geekoins = ₹1 = 100 paise

  let eligibleAmount = cashComponent;

  // 1. Eligibility window based on course start date
  const eligibilityCutoff = addBusinessDays(
    learner.courseStartDate,
    config.eligibilityWindowDays,
    await loadHolidaySet(prisma)
  );
  if (requestDate > eligibilityCutoff) {
    // Only allow if special reasons
    if (
      !([
        RefundReason.JOB_ASSURANCE_BREACH,
        RefundReason.TECHNICAL_ISSUE,
      ] as RefundReason[]).includes(refundRequest.refundReason)
    ) {
      eligibleAmount = 0;
    }
  }

  // 2. Free‑look window – full cash refund if within window
  const freeLookCutoff = addBusinessDays(
    learner.enrollmentDate,
    config.freeLookWindowDays,
    await loadHolidaySet(prisma)
  );
  const beforeCourseStart = requestDate <= learner.courseStartDate;
  if (requestDate <= freeLookCutoff || beforeCourseStart) {
    // eligibleAmount already cashComponent, nothing to deduct except fees below
  } else {
    // Outside free‑look, apply processing fee and possibly GST clawback later
  }

  // 3. GST clawback if beyond GST‑safe window
  const gstSafeCutoff = addBusinessDays(
    refundRequest.loggedAt,
    config.gstSafeWindowBusinessDays,
    await loadHolidaySet(prisma)
  );
  if (requestDate > gstSafeCutoff && payment.gstAmount > 0) {
    deductions.push({ type: 'GST_CLARBACK', amount: Number(payment.gstAmount) });
    eligibleAmount -= Number(payment.gstAmount);
  }

  // 4. Processing fee (always deducted if eligibleAmount > 0)
  if (eligibleAmount > 0 && config.processingFeePaise > 0) {
    deductions.push({ type: 'PROCESSING_FEE', amount: config.processingFeePaise });
    eligibleAmount -= config.processingFeePaise;
  }

  // Ensure non‑negative
  if (eligibleAmount < 0) eligibleAmount = 0;

  // 5. EMI routing flag
  const requiresManualReview = payment.paymentMode === 'EMI_PARTNER';
  const refundRoute = requiresManualReview ? 'FINANCING_PARTNER' : 'ORIGINAL_PAYMENT_SOURCE';

  return {
    eligibleAmount,
    deductions,
    refundRoute,
    requiresManualReview,
  };
};

// Helper to load holidays – reused from utils but kept local to avoid circular import
const loadHolidaySet = async (prismaClient: any): Promise<Set<string>> => {
  const holidays = await prismaClient.businessDayCalendar.findMany({
    where: { isHoliday: true },
    select: { date: true },
  });
  return new Set(holidays.map((h: any) => h.date.toISOString().slice(0, 10)));
};
