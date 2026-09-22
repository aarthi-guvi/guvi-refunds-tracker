import { PrismaClient, Role, RefundReason, RefundStatus, PaymentType, PaymentMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.note.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.learner.deleteMany();
  await prisma.businessDayCalendar.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  console.log('👥 Creating users...');
  const users = await Promise.all([
    // Admins
    prisma.user.create({
      data: {
        email: 'admin1@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Vikram Shetty',
        role: Role.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        email: 'admin2@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Aditi Kapoor',
        role: Role.ADMIN,
      },
    }),
    // Finance
    prisma.user.create({
      data: {
        email: 'finance1@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Suresh Pillai',
        role: Role.FINANCE,
      },
    }),
    prisma.user.create({
      data: {
        email: 'finance2@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Anjali Rao',
        role: Role.FINANCE,
      },
    }),
    // Coordinators
    prisma.user.create({
      data: {
        email: 'coordinator1@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Meena Iyer',
        role: Role.COORDINATOR,
      },
    }),
    prisma.user.create({
      data: {
        email: 'coordinator2@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Rahul Verma',
        role: Role.COORDINATOR,
      },
    }),
    prisma.user.create({
      data: {
        email: 'coordinator3@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Shalini Nair',
        role: Role.COORDINATOR,
      },
    }),
    prisma.user.create({
      data: {
        email: 'coordinator4@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Nithin Joseph',
        role: Role.COORDINATOR,
      },
    }),
    // BDs
    prisma.user.create({
      data: {
        email: 'bd1@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Karthik R',
        role: Role.BD,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bd2@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Priya Sundaram',
        role: Role.BD,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bd3@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Arjun Menon',
        role: Role.BD,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bd4@guvi.in',
        passwordHash: await bcrypt.hash('password123', 12),
        name: 'Divya K',
        role: Role.BD,
      },
    }),
  ]);

  const [admin1, admin2, finance1, finance2, coord1, coord2, coord3, coord4, bd1, bd2, bd3, bd4] = users;

  // Create Business Calendar (2025-2026 holidays)
  console.log('📅 Creating business calendar...');
  const holidays = [
    { date: new Date('2025-01-26'), isHoliday: true },
    { date: new Date('2025-03-14'), isHoliday: true },
    { date: new Date('2025-08-15'), isHoliday: true },
    { date: new Date('2025-10-02'), isHoliday: true },
    { date: new Date('2025-10-20'), isHoliday: true },
    { date: new Date('2025-12-25'), isHoliday: true },
    { date: new Date('2026-01-26'), isHoliday: true },
    { date: new Date('2026-03-04'), isHoliday: true },
    { date: new Date('2026-08-15'), isHoliday: true },
    { date: new Date('2026-10-02'), isHoliday: true },
    { date: new Date('2026-11-08'), isHoliday: true },
    { date: new Date('2026-12-25'), isHoliday: true },
  ];

  await Promise.all(
    holidays.map(holiday =>
      prisma.businessDayCalendar.create({
        data: holiday,
      })
    )
  );

  // Create Learners
  console.log('🎓 Creating learners...');
  const learners = await Promise.all([
    prisma.learner.create({
      data: {
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@gmail.com',
        phone: '+91-9876543210',
        courseEnrolled: 'Full Stack Development',
        batchId: 'FSD-2026-09',
        enrollmentDate: new Date('2026-09-01'),
        courseStartDate: new Date('2026-09-15'),
        assignedBdId: bd1.id,
        assignedCoordinatorId: coord1.id,
      },
    }),
    prisma.learner.create({
      data: {
        name: 'Priya Sharma',
        email: 'priya.sharma@yahoo.com',
        phone: '+91-9876543211',
        courseEnrolled: 'Data Science',
        batchId: 'DS-2026-09',
        enrollmentDate: new Date('2026-09-05'),
        courseStartDate: new Date('2026-09-20'),
        assignedBdId: bd2.id,
        assignedCoordinatorId: coord2.id,
      },
    }),
    prisma.learner.create({
      data: {
        name: 'Amit Patel',
        email: 'amit.patel@outlook.com',
        phone: '+91-9876543212',
        courseEnrolled: 'Digital Marketing',
        batchId: 'DM-2026-09',
        enrollmentDate: new Date('2026-09-08'),
        courseStartDate: new Date('2026-09-22'),
        assignedBdId: bd3.id,
        assignedCoordinatorId: coord3.id,
      },
    }),
    prisma.learner.create({
      data: {
        name: 'Sneha Reddy',
        email: 'sneha.reddy@gmail.com',
        phone: '+91-9876543213',
        courseEnrolled: 'Full Stack Development',
        batchId: 'FSD-2026-09',
        enrollmentDate: new Date('2026-09-12'),
        courseStartDate: new Date('2026-09-25'),
        assignedBdId: bd4.id,
        assignedCoordinatorId: coord4.id,
      },
    }),
    prisma.learner.create({
      data: {
        name: 'Vikram Singh',
        email: 'vikram.singh@yahoo.com',
        phone: '+91-9876543214',
        courseEnrolled: 'Data Science',
        batchId: 'DS-2026-09',
        enrollmentDate: new Date('2026-09-15'),
        courseStartDate: new Date('2026-09-28'),
        assignedBdId: bd1.id,
        assignedCoordinatorId: coord1.id,
      },
    }),
    prisma.learner.create({
      data: {
        name: 'Anjali Desai',
        email: 'anjali.desai@outlook.com',
        phone: '+91-9876543215',
        courseEnrolled: 'UI/UX Design',
        batchId: 'UIX-2026-09',
        enrollmentDate: new Date('2026-09-03'),
        courseStartDate: new Date('2026-09-18'),
        assignedBdId: bd2.id,
        assignedCoordinatorId: coord2.id,
      },
    }),
    prisma.learner.create({
      data: {
        name: 'Rohit Gupta',
        email: 'rohit.gupta@gmail.com',
        phone: '+91-9876543216',
        courseEnrolled: 'Python Programming',
        batchId: 'PY-2026-09',
        enrollmentDate: new Date('2026-08-28'),
        courseStartDate: new Date('2026-09-12'),
        assignedBdId: bd3.id,
        assignedCoordinatorId: coord3.id,
      },
    }),
    prisma.learner.create({
      data: {
        name: 'Kavita Nair',
        email: 'kavita.nair@yahoo.com',
        phone: '+91-9876543217',
        courseEnrolled: 'Full Stack Development',
        batchId: 'FSD-2026-09',
        enrollmentDate: new Date('2026-09-18'),
        courseStartDate: new Date('2026-10-02'),
        assignedBdId: bd4.id,
        assignedCoordinatorId: coord4.id,
      },
    }),
  ]);

  // Create Payments
  console.log('💳 Creating payments...');
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        learnerId: learners[0].id,
        amount: BigInt(2500000), // ₹25,000
        paymentType: PaymentType.FULL,
        paymentMode: PaymentMode.UPI,
        paidAt: new Date('2026-09-01'),
        geekoinsUsed: 500,
        gstAmount: BigInt(450000),
      },
    }),
    prisma.payment.create({
      data: {
        learnerId: learners[1].id,
        amount: BigInt(3000000), // ₹30,000
        paymentType: PaymentType.FULL,
        paymentMode: PaymentMode.CARD,
        paidAt: new Date('2026-09-05'),
        geekoinsUsed: 1000,
        gstAmount: BigInt(540000),
      },
    }),
    prisma.payment.create({
      data: {
        learnerId: learners[2].id,
        amount: BigInt(1500000), // ₹15,000
        paymentType: PaymentType.DOWN_PAYMENT,
        paymentMode: PaymentMode.NETBANKING,
        paidAt: new Date('2026-09-08'),
        geekoinsUsed: 200,
        gstAmount: BigInt(270000),
      },
    }),
    prisma.payment.create({
      data: {
        learnerId: learners[3].id,
        amount: BigInt(2000000), // ₹20,000
        paymentType: PaymentType.INSTALLMENT,
        paymentMode: PaymentMode.EMI_PARTNER,
        paidAt: new Date('2026-09-12'),
        geekoinsUsed: 300,
        gstAmount: BigInt(360000),
        financingPartnerName: 'Bajaj Finserv',
      },
    }),
    prisma.payment.create({
      data: {
        learnerId: learners[4].id,
        amount: BigInt(2800000), // ₹28,000
        paymentType: PaymentType.FULL,
        paymentMode: PaymentMode.WALLET,
        paidAt: new Date('2026-09-15'),
        geekoinsUsed: 800,
        gstAmount: BigInt(504000),
      },
    }),
    prisma.payment.create({
      data: {
        learnerId: learners[5].id,
        amount: BigInt(1800000), // ₹18,000
        paymentType: PaymentType.FULL,
        paymentMode: PaymentMode.UPI,
        paidAt: new Date('2026-09-03'),
        geekoinsUsed: 400,
        gstAmount: BigInt(324000),
      },
    }),
    prisma.payment.create({
      data: {
        learnerId: learners[6].id,
        amount: BigInt(1200000), // ₹12,000
        paymentType: PaymentType.DOWN_PAYMENT,
        paymentMode: PaymentMode.CARD,
        paidAt: new Date('2026-08-28'),
        geekoinsUsed: 150,
        gstAmount: BigInt(216000),
      },
    }),
    prisma.payment.create({
      data: {
        learnerId: learners[7].id,
        amount: BigInt(2200000), // ₹22,000
        paymentType: PaymentType.INSTALLMENT,
        paymentMode: PaymentMode.EMI_PARTNER,
        paidAt: new Date('2026-09-18'),
        geekoinsUsed: 600,
        gstAmount: BigInt(396000),
        financingPartnerName: 'HDFC EMI',
      },
    }),
  ]);

  // Create Refund Requests with various statuses
  console.log('💰 Creating refund requests...');
  const refundRequests = await Promise.all([
    // LOGGED status
    prisma.refundRequest.create({
      data: {
        learnerId: learners[0].id,
        paymentId: payments[0].id,
        initiatedBy: coord1.id,
        initiatedVia: 'portal',
        refundReason: RefundReason.COURSE_QUALITY,
        otherReasonDetail: 'Course content not as expected',
        requestedAmount: BigInt(2500000),
        refundTo: 'original_payment_source',
        status: RefundStatus.LOGGED,
        slaDueAt: new Date('2026-09-20'),
        loggedAt: new Date('2026-09-05'),
      },
    }),
    // UNDER_REVIEW status
    prisma.refundRequest.create({
      data: {
        learnerId: learners[1].id,
        paymentId: payments[1].id,
        initiatedBy: coord2.id,
        initiatedVia: 'email',
        refundReason: RefundReason.CHANGE_OF_MIND,
        requestedAmount: BigInt(3000000),
        refundTo: 'original_payment_source',
        status: RefundStatus.UNDER_REVIEW,
        slaDueAt: new Date('2026-09-25'),
        loggedAt: new Date('2026-09-10'),
      },
    }),
    // APPROVED status
    prisma.refundRequest.create({
      data: {
        learnerId: learners[2].id,
        paymentId: payments[2].id,
        initiatedBy: coord3.id,
        initiatedVia: 'phone',
        refundReason: RefundReason.TECHNICAL_ISSUE,
        otherReasonDetail: 'Platform not working properly',
        requestedAmount: BigInt(1500000),
        eligibleAmount: BigInt(1450000),
        processingFeeDeducted: BigInt(5000),
        refundTo: 'original_payment_source',
        status: RefundStatus.APPROVED,
        slaDueAt: new Date('2026-09-20'),
        loggedAt: new Date('2026-09-12'),
        approvedBy: finance1.id,
      },
    }),
    // PROCESSING status
    prisma.refundRequest.create({
      data: {
        learnerId: learners[3].id,
        paymentId: payments[3].id,
        initiatedBy: coord4.id,
        initiatedVia: 'portal',
        refundReason: RefundReason.JOB_ASSURANCE_BREACH,
        otherReasonDetail: 'Job placement promises not met',
        requestedAmount: BigInt(2000000),
        eligibleAmount: BigInt(1800000),
        processingFeeDeducted: BigInt(5000),
        gstClawbackDeducted: BigInt(360000),
        geekoinsForfeited: 300,
        refundTo: 'financing_partner',
        status: RefundStatus.PROCESSING,
        slaDueAt: new Date('2026-09-25'),
        loggedAt: new Date('2026-09-15'),
        approvedBy: finance2.id,
      },
    }),
    // DISBURSED status
    prisma.refundRequest.create({
      data: {
        learnerId: learners[4].id,
        paymentId: payments[4].id,
        initiatedBy: coord1.id,
        initiatedVia: 'email',
        refundReason: RefundReason.DUPLICATE_PAYMENT,
        requestedAmount: BigInt(2800000),
        eligibleAmount: BigInt(2750000),
        processingFeeDeducted: BigInt(5000),
        refundTo: 'original_payment_source',
        status: RefundStatus.DISBURSED,
        slaDueAt: new Date('2026-09-30'),
        loggedAt: new Date('2026-09-15'),
        approvedBy: finance1.id,
        disbursedBy: finance2.id,
        resolvedAt: new Date('2026-09-18'),
      },
    }),
    // REJECTED status
    prisma.refundRequest.create({
      data: {
        learnerId: learners[5].id,
        paymentId: payments[5].id,
        initiatedBy: coord2.id,
        initiatedVia: 'portal',
        refundReason: RefundReason.CHANGE_OF_MIND,
        otherReasonDetail: 'Lost interest in the course',
        requestedAmount: BigInt(1800000),
        refundTo: 'original_payment_source',
        status: RefundStatus.REJECTED,
        rejectionReason: 'Request outside eligibility window (beyond 7 days from enrollment)',
        slaDueAt: new Date('2026-09-20'),
        loggedAt: new Date('2026-09-05'),
        approvedBy: finance1.id,
        resolvedAt: new Date('2026-09-08'),
      },
    }),
    // ON_HOLD status
    prisma.refundRequest.create({
      data: {
        learnerId: learners[6].id,
        paymentId: payments[6].id,
        initiatedBy: coord3.id,
        initiatedVia: 'phone',
        refundReason: RefundReason.WRONG_COURSE_ENROLLED,
        otherReasonDetail: 'Enrolled in wrong course by mistake',
        requestedAmount: BigInt(1200000),
        refundTo: 'original_payment_source',
        status: RefundStatus.ON_HOLD,
        slaDueAt: new Date('2026-09-20'),
        loggedAt: new Date('2026-09-03'),
      },
    }),
    // Another LOGGED for bulk operations testing
    prisma.refundRequest.create({
      data: {
        learnerId: learners[7].id,
        paymentId: payments[7].id,
        initiatedBy: coord4.id,
        initiatedVia: 'portal',
        refundReason: RefundReason.COURSE_QUALITY,
        requestedAmount: BigInt(2200000),
        refundTo: 'financing_partner',
        status: RefundStatus.LOGGED,
        slaDueAt: new Date('2026-10-05'),
        loggedAt: new Date('2026-09-18'),
      },
    }),
  ]);

  // Create Notes for some refund requests
  console.log('📝 Creating notes...');
  await Promise.all([
    prisma.note.create({
      data: {
        refundRequestId: refundRequests[0].id,
        createdBy: coord1.id,
        body: 'Initial request received via portal. Learner claims course content not meeting expectations.',
      },
    }),
    prisma.note.create({
      data: {
        refundRequestId: refundRequests[2].id,
        createdBy: finance1.id,
        body: 'Technical issue verified. Platform logs show downtime during claimed period.',
      },
    }),
    prisma.note.create({
      data: {
        refundRequestId: refundRequests[4].id,
        createdBy: finance2.id,
        body: 'Payment verification complete. Duplicate payment confirmed via transaction ID mismatch.',
      },
    }),
    prisma.note.create({
      data: {
        refundRequestId: refundRequests[5].id,
        createdBy: finance1.id,
        body: 'Request rejected as per policy - outside 7-day free look window.',
      },
    }),
  ]);

  // Create additional refund requests for better trend data
  console.log('💰 Creating additional refund requests for trends...');
  const additionalRefunds = await Promise.all([
    prisma.refundRequest.create({
      data: {
        learnerId: learners[0].id,
        paymentId: payments[0].id,
        initiatedBy: coord1.id,
        initiatedVia: 'portal',
        refundReason: RefundReason.OTHER,
        otherReasonDetail: 'Personal emergency',
        requestedAmount: BigInt(2500000),
        refundTo: 'original_payment_source',
        status: RefundStatus.DISBURSED,
        slaDueAt: new Date('2026-09-10'),
        loggedAt: new Date('2026-09-02'),
        approvedBy: finance1.id,
        disbursedBy: finance2.id,
        resolvedAt: new Date('2026-09-05'),
      },
    }),
    prisma.refundRequest.create({
      data: {
        learnerId: learners[1].id,
        paymentId: payments[1].id,
        initiatedBy: coord2.id,
        initiatedVia: 'email',
        refundReason: RefundReason.TECHNICAL_ISSUE,
        requestedAmount: BigInt(3000000),
        refundTo: 'original_payment_source',
        status: RefundStatus.REJECTED,
        rejectionReason: 'Could not verify technical issue',
        slaDueAt: new Date('2026-09-15'),
        loggedAt: new Date('2026-09-08'),
        approvedBy: finance2.id,
        resolvedAt: new Date('2026-09-12'),
      },
    }),
    prisma.refundRequest.create({
      data: {
        learnerId: learners[2].id,
        paymentId: payments[2].id,
        initiatedBy: coord3.id,
        initiatedVia: 'phone',
        refundReason: RefundReason.JOB_ASSURANCE_BREACH,
        requestedAmount: BigInt(1500000),
        refundTo: 'original_payment_source',
        status: RefundStatus.APPROVED,
        slaDueAt: new Date('2026-09-25'),
        loggedAt: new Date('2026-09-18'),
        approvedBy: finance1.id,
      },
    }),
  ]);

  // Create Audit Logs
  console.log('📋 Creating audit logs...');
  await Promise.all([
    prisma.auditLog.create({
      data: {
        refundRequestId: refundRequests[0].id,
        changedBy: coord1.id,
        fromStatus: null,
        toStatus: RefundStatus.LOGGED,
        fieldChanged: 'status',
        oldValue: null,
        newValue: 'LOGGED',
        remarks: 'Status transition via API',
      },
    }),
    prisma.auditLog.create({
      data: {
        refundRequestId: refundRequests[2].id,
        changedBy: coord3.id,
        fromStatus: null,
        toStatus: RefundStatus.LOGGED,
        fieldChanged: 'status',
        oldValue: null,
        newValue: 'LOGGED',
        remarks: 'Status transition via API',
      },
    }),
    prisma.auditLog.create({
      data: {
        refundRequestId: refundRequests[2].id,
        changedBy: finance1.id,
        fromStatus: RefundStatus.LOGGED,
        toStatus: RefundStatus.UNDER_REVIEW,
        fieldChanged: 'status',
        oldValue: 'LOGGED',
        newValue: 'UNDER_REVIEW',
        remarks: 'Status transition via API',
      },
    }),
    prisma.auditLog.create({
      data: {
        refundRequestId: refundRequests[2].id,
        changedBy: finance1.id,
        fromStatus: RefundStatus.UNDER_REVIEW,
        toStatus: RefundStatus.APPROVED,
        fieldChanged: 'status',
        oldValue: 'UNDER_REVIEW',
        newValue: 'APPROVED',
        remarks: 'Refund approved for processing',
      },
    }),
    prisma.auditLog.create({
      data: {
        refundRequestId: refundRequests[5].id,
        changedBy: finance1.id,
        fromStatus: RefundStatus.UNDER_REVIEW,
        toStatus: RefundStatus.REJECTED,
        fieldChanged: 'status',
        oldValue: 'UNDER_REVIEW',
        newValue: 'REJECTED',
        remarks: 'Refund rejected. Reason: Request outside eligibility window (beyond 7 days from enrollment)',
      },
    }),
  ]);

  console.log('✅ Seed completed successfully!');
  console.log('📊 Summary:');
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Learners: ${learners.length}`);
  console.log(`   - Payments: ${payments.length}`);
  console.log(`   - Refund Requests: ${refundRequests.length}`);
  console.log(`   - Notes: 4`);
  console.log(`   - Audit Logs: 5`);
  console.log(`   - Calendar Entries: ${holidays.length}`);
  console.log('');
  console.log('🔐 Test Accounts:');
  console.log('   Admin: admin1@guvi.in / password123');
  console.log('   Finance: finance1@guvi.in / password123');
  console.log('   Coordinator: coordinator1@guvi.in / password123');
  console.log('   BD: bd1@guvi.in / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });