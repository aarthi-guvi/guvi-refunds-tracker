export type Role = 'ADMIN' | 'FINANCE' | 'COORDINATOR' | 'BD'
export type RefundStatus = 'LOGGED' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'DISBURSED' | 'REJECTED' | 'ON_HOLD'
export type PaymentMode = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'EMI_PARTNER'

export interface User { id: number; name: string; email?: string; role: Role }
export interface Summary { totalRefunds: number | string; totalCount: number; avgResolutionDays: number; slaBreachPct: number; pendingCount?: number; totalWithheld?: number }
export interface Refund { id: number; learner?: { name: string; email: string; courseEnrolled: string }; payment?: { amount: number | string; paymentMode: PaymentMode; financingPartnerName?: string }; status: RefundStatus; refundReason: string; requestedAmount: number | string; eligibleAmount?: number | string; slaDueAt?: string; loggedAt: string; assignedCoordinator?: { name: string }; assignedBd?: { name: string } }
export interface Eligibility { eligibleAmount: number; deductions: { type: string; amount: number }[]; refundRoute: string; requiresManualReview: boolean }
export interface TrendPoint { label: string; value: number; [key: string]: string | number }
