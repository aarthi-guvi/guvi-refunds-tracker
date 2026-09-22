import { RefundStatus } from '@prisma/client';

/**
 * Valid transitions according to the spec.
 */
const allowedTransitions: Record<RefundStatus, RefundStatus[]> = {
  [RefundStatus.LOGGED]: [RefundStatus.UNDER_REVIEW],
  [RefundStatus.UNDER_REVIEW]: [RefundStatus.APPROVED, RefundStatus.REJECTED],
  [RefundStatus.APPROVED]: [RefundStatus.PROCESSING, RefundStatus.ON_HOLD],
  [RefundStatus.PROCESSING]: [RefundStatus.DISBURSED],
  [RefundStatus.DISBURSED]: [],
  [RefundStatus.REJECTED]: [],
  [RefundStatus.ON_HOLD]: [RefundStatus.APPROVED, RefundStatus.REJECTED],
};

export const canTransition = (
  from: RefundStatus,
  to: RefundStatus
): boolean => {
  return allowedTransitions[from]?.includes(to) ?? false;
};
