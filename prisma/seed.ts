import { faker } from '@faker-js/faker';
import { PrismaClient, PaymentMode, PaymentType, RefundReason, RefundStatus, Role } from '@prisma/client';
import { addBusinessDays, addDays, subDays } from 'date-fns';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const NOW = new Date('2026-09-22T12:00:00.000Z');
const PASSWORD = 'password123';

const courses = [
  { name: 'Full Stack Development', fee: 8999900 },
  { name: 'Zen Class - Full Stack', fee: 12390000 },
  { name: 'Data Science / Data Engineering', fee: 9999900 },
  { name: 'Java Full Stack Developer', fee: 9499900 },
  { name: 'UI/UX Design', fee: 7999900 },
];
const bdNames = ['Karthik R', 'Priya Sundaram', 'Arjun Menon', 'Divya K'];
const coordinatorNames = ['Meena Iyer', 'Rahul Verma', 'Shalini Nair', 'Nithin Joseph'];
const financeNames = ['Suresh Pillai', 'Anjali Rao'];
const adminNames = ['Vikram Shetty', 'Aditi Kapoor'];
const statusCounts: Array<[RefundStatus, number]> = [
  [RefundStatus.LOGGED, 42], [RefundStatus.UNDER_REVIEW, 42], [RefundStatus.APPROVED, 28],
  [RefundStatus.PROCESSING, 14], [RefundStatus.DISBURSED, 98], [RefundStatus.REJECTED, 42], [RefundStatus.ON_HOLD, 14],
];
const reasonWeights: Array<[RefundReason, number]> = [
  [RefundReason.CHANGE_OF_MIND, 28], [RefundReason.COURSE_QUALITY, 24], [RefundReason.TECHNICAL_ISSUE, 14],
  [RefundReason.DUPLICATE_PAYMENT, 10], [RefundReason.WRONG_COURSE_ENROLLED, 9], [RefundReason.OTHER, 8], [RefundReason.JOB_ASSURANCE_BREACH, 5],
];
const paymentModes: Array<[PaymentMode, number]> = [
  [PaymentMode.UPI, 35], [PaymentMode.CARD, 25], [PaymentMode.NETBANKING, 15], [PaymentMode.WALLET, 10], [PaymentMode.EMI_PARTNER, 15],
];
const otherReasons = ['Relocated for a job offer in another city', 'Found employment before completing the course', 'Family circumstances require a pause in learning', 'Schedule changed after joining a new shift'];
const holidays = ['2025-01-26', '2025-03-14', '2025-08-15', '2025-10-02', '2025-10-20', '2025-12-25', '2026-01-26', '2026-03-04', '2026-08-15', '2026-10-02', '2026-11-08', '2026-12-25'];

function weighted<T>(items: Array<[T, number]>): T {
  let cursor = faker.number.int({ min: 1, max: items.reduce((sum, [, weight]) => sum + weight, 0) });
  for (const [item, weight] of items) { cursor -= weight; if (cursor <= 0) return item; }
  return items[items.length - 1][0];
}
function dateBetween(start: Date, end: Date) { return faker.date.between({ from: start, to: end }); }
function money(value: number) { return Math.max(0, Math.round(value)); }

async function createUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const all = [];
  for (const [index, name] of bdNames.entries()) all.push(await prisma.user.create({ data: { name, email: `bd${index + 1}@guvi.in`, passwordHash, role: Role.BD } }));
  for (const [index, name] of coordinatorNames.entries()) all.push(await prisma.user.create({ data: { name, email: `coordinator${index + 1}@guvi.in`, passwordHash, role: Role.COORDINATOR } }));
  for (const [index, name] of financeNames.entries()) all.push(await prisma.user.create({ data: { name, email: `finance${index + 1}@guvi.in`, passwordHash, role: Role.FINANCE } }));
  for (const [index, name] of adminNames.entries()) all.push(await prisma.user.create({ data: { name, email: `admin${index + 1}@guvi.in`, passwordHash, role: Role.ADMIN } }));
  return {
    all,
    bds: all.filter((user) => user.role === Role.BD),
    coordinators: all.filter((user) => user.role === Role.COORDINATOR),
    finance: all.filter((user) => user.role === Role.FINANCE),
    admins: all.filter((user) => user.role === Role.ADMIN),
  };
}

type Users = Awaited<ReturnType<typeof createUsers>>;

async function createLearners(users: Users) {
  const learners = [];
  const payments = [];
  for (let index = 0; index < 180; index += 1) {
    const course = courses[index % courses.length];
    const enrollmentDate = dateBetween(subDays(NOW, 185), subDays(NOW, 3));
    const courseStartDate = addDays(enrollmentDate, faker.number.int({ min: 5, max: 21 }));
    const bd = users.bds[index % 4 === 0 ? 0 : faker.number.int({ min: 0, max: users.bds.length - 1 })];
    const coordinator = users.coordinators[faker.number.int({ min: 0, max: users.coordinators.length - 1 })];
    const learner = await prisma.learner.create({ data: {
      name: faker.person.fullName(), email: `learner${String(index + 1).padStart(3, '0')}@example.com`, phone: `+91${faker.string.numeric(10)}`,
      courseEnrolled: course.name, batchId: `${course.name.slice(0, 3).toUpperCase()}-${2025 + (index % 2)}-${String(index % 5 + 1).padStart(2, '0')}`,
      enrollmentDate, courseStartDate, assignedBdId: bd.id, assignedCoordinatorId: coordinator.id,
    } });
    learners.push(learner);
    const mode = weighted(paymentModes);
    const isDownPayment = index % 10 < 4;
    const isInstallmentOnly = !isDownPayment && index % 4 === 0;
    const paidAmount = isDownPayment || isInstallmentOnly ? Math.round(course.fee * 0.45) : course.fee;
    const payment = await prisma.payment.create({ data: {
      learnerId: learner.id, amount: BigInt(paidAmount), paymentType: isDownPayment ? PaymentType.DOWN_PAYMENT : isInstallmentOnly ? PaymentType.INSTALLMENT : PaymentType.FULL,
      paymentMode: mode, gatewayTransactionId: `GUVI-${20260000 + index}`, financingPartnerName: mode === PaymentMode.EMI_PARTNER ? (index % 2 ? 'Propelld' : 'Eduvanz') : null,
      paidAt: enrollmentDate, geekoinsUsed: index % 5 === 0 ? faker.number.int({ min: 500, max: 5000 }) : 0, gstAmount: BigInt(Math.round(paidAmount * 0.18)),
    } });
    payments.push(payment);
    if (isDownPayment || isInstallmentOnly) payments.push(await prisma.payment.create({ data: {
      learnerId: learner.id, amount: BigInt(course.fee - paidAmount), paymentType: PaymentType.INSTALLMENT, paymentMode: mode,
      gatewayTransactionId: `GUVI-${20260000 + index}-I2`, financingPartnerName: mode === PaymentMode.EMI_PARTNER ? (index % 2 ? 'Propelld' : 'Eduvanz') : null,
      paidAt: addDays(enrollmentDate, 30), geekoinsUsed: 0, gstAmount: BigInt(Math.round((course.fee - paidAmount) * 0.18)),
    } }));
  }
  return { learners, payments };
}

type LearnerData = Awaited<ReturnType<typeof createLearners>>;
function statusPool() { return statusCounts.flatMap(([status, count]) => Array.from({ length: count }, () => status)); }
function historyFor(status: RefundStatus) {
  const base = [RefundStatus.LOGGED, RefundStatus.UNDER_REVIEW];
  if (status === RefundStatus.LOGGED) return base.slice(0, 1);
  if (status === RefundStatus.UNDER_REVIEW) return base;
  if (status === RefundStatus.APPROVED) return [...base, RefundStatus.APPROVED];
  if (status === RefundStatus.PROCESSING) return [...base, RefundStatus.APPROVED, RefundStatus.PROCESSING];
  if (status === RefundStatus.DISBURSED) return [...base, RefundStatus.APPROVED, RefundStatus.PROCESSING, RefundStatus.DISBURSED];
  if (status === RefundStatus.REJECTED) return [...base, RefundStatus.REJECTED];
  return [...base, RefundStatus.APPROVED, RefundStatus.ON_HOLD];
}

async function createRefunds(users: Users, learnerData: LearnerData) {
  const statuses = statusPool();
  const created: Array<{ id: number; status: RefundStatus }> = [];
  const openStatuses = new Set<RefundStatus>([RefundStatus.LOGGED, RefundStatus.UNDER_REVIEW, RefundStatus.APPROVED]);
  for (let index = 0; index < statuses.length; index += 1) {
    const status = statuses[index];
    const learner = learnerData.learners[index % learnerData.learners.length];
    const learnerPayments = learnerData.payments.filter((payment) => payment.learnerId === learner.id);
    const payment = learnerPayments[index % learnerPayments.length];
    const reason = weighted(reasonWeights);
    const loggedAt = dateBetween(subDays(NOW, 180), subDays(NOW, 1));
    const breached = openStatuses.has(status) && index < 25;
    const slaDueAt = breached ? subDays(NOW, faker.number.int({ min: 1, max: 16 })) : addBusinessDays(loggedAt, 5);
    const zeroEligible = index === 7 || index === 111;
    const requestedAmount = money(Number(payment.amount) * (index % 3 === 0 ? 0.7 : 1));
    const gst = Number(payment.gstAmount);
    const processingFee = zeroEligible ? 0 : 5000;
    const gstClawback = index % 4 === 0 ? gst : 0;
    const eligibleAmount = zeroEligible ? 0 : money(requestedAmount - processingFee - gstClawback - Number(payment.geekoinsUsed) * 100);
    const refund = await prisma.refundRequest.create({ data: {
      learnerId: learner.id, paymentId: payment.id, initiatedBy: users.coordinators[index % users.coordinators.length].id,
      initiatedVia: index % 5 === 0 ? 'portal' : index % 2 ? 'email' : 'phone', refundReason: reason,
      otherReasonDetail: reason === RefundReason.OTHER ? otherReasons[index % otherReasons.length] : null,
      requestedAmount: BigInt(requestedAmount), eligibleAmount: BigInt(eligibleAmount), processingFeeDeducted: processingFee,
      gstClawbackDeducted: gstClawback, geekoinsForfeited: payment.geekoinsUsed,
      refundTo: payment.paymentMode === PaymentMode.EMI_PARTNER ? 'financing_partner' : 'original_payment_source', status, slaDueAt,
      approvedBy: (status === RefundStatus.APPROVED || status === RefundStatus.PROCESSING || status === RefundStatus.DISBURSED) ? users.finance[index % users.finance.length].id : null,
      disbursedBy: status === RefundStatus.DISBURSED ? users.finance[(index + 1) % users.finance.length].id : null,
      rejectionReason: status === RefundStatus.REJECTED ? 'Learner is outside the applicable refund window.' : null, loggedAt,
      resolvedAt: (status === RefundStatus.DISBURSED || status === RefundStatus.REJECTED) ? addDays(loggedAt, faker.number.int({ min: 2, max: 35 })) : null,
      ...(index % 17 === 0 ? { attachments: [{ name: 'learner-bank-confirmation.pdf', url: `https://mock-r2.guvi.in/refunds/${index + 1}/bank-confirmation.pdf` }] } : {}),
    } });
    created.push({ id: refund.id, status });
    const history = historyFor(status);
    for (let step = 0; step < history.length; step += 1) {
      const toStatus = history[step];
      const fromStatus = step === 0 ? null : history[step - 1];
      const changedBy = toStatus === RefundStatus.LOGGED ? users.coordinators[index % users.coordinators.length] : toStatus === RefundStatus.UNDER_REVIEW ? users.coordinators[(index + 1) % users.coordinators.length] : users.finance[step % users.finance.length];
      await prisma.auditLog.create({ data: {
        refundRequestId: refund.id, changedBy: changedBy.id, fromStatus, toStatus, fieldChanged: 'status', oldValue: fromStatus, newValue: toStatus,
        timestamp: addDays(loggedAt, step * 2), remarks: toStatus === RefundStatus.REJECTED ? 'Rejected after eligibility review.' : 'Status transition via seeded demo history.',
      } });
    }
    if (index % 3 === 0) {
      await prisma.note.create({ data: { refundRequestId: refund.id, createdBy: users.coordinators[index % users.coordinators.length].id, body: 'Learner confirmed bank details and requested an update on the refund timeline.', createdAt: addDays(loggedAt, 1) } });
      if (index % 2 === 0) await prisma.note.create({ data: { refundRequestId: refund.id, createdBy: users.finance[index % users.finance.length].id, body: 'Awaiting gateway confirmation before releasing the settlement.', createdAt: addDays(loggedAt, 3) } });
    }
  }
  return created;
}

async function main() {
  faker.seed(42);
  await prisma.note.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.learner.deleteMany();
  await prisma.businessDayCalendar.deleteMany();
  await prisma.user.deleteMany();
  const users = await createUsers();
  const learnerData = await createLearners(users);
  const refunds = await createRefunds(users, learnerData);
  await prisma.businessDayCalendar.createMany({ data: holidays.map((date) => ({ date: new Date(`${date}T00:00:00.000Z`), isHoliday: true })) });
  const statusSummary = refunds.reduce<Record<string, number>>((summary, refund) => ({ ...summary, [refund.status]: (summary[refund.status] ?? 0) + 1 }), {});
  console.log(JSON.stringify({ seed: 42, users: { total: users.all.length, BD: users.bds.length, COORDINATOR: users.coordinators.length, FINANCE: users.finance.length, ADMIN: users.admins.length }, learners: learnerData.learners.length, payments: learnerData.payments.length, refunds: refunds.length, refundsByStatus: statusSummary, dateRange: { from: subDays(NOW, 180).toISOString(), to: NOW.toISOString() }, holidays: holidays.length, loginPassword: PASSWORD }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
