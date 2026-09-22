import { RefundStatus } from '@prisma/client';

/**
 * Notification Service
 * Handles sending notifications (email, SMS) for refund status changes
 */

export interface NotificationPayload {
  recipientEmail: string;
  recipientName: string;
  refundId: number;
  status: RefundStatus;
  previousStatus?: RefundStatus;
  amount?: number;
  rejectionReason?: string;
}

/**
 * Email templates for different status changes
 */
const emailTemplates = {
  [RefundStatus.LOGGED]: (data: NotificationPayload) => ({
    subject: `Refund Request Logged - RF-${String(data.refundId).padStart(4, '0')}`,
    body: `Dear ${data.recipientName},

Your refund request (RF-${String(data.refundId).padStart(4, '0')}) has been successfully logged in our system.

Request Details:
- Refund ID: RF-${String(data.refundId).padStart(4, '0')}
- Amount: ₹${data.amount ? (Number(data.amount) / 100).toLocaleString('en-IN') : 'Pending'}
- Status: Logged

Our team will review your request and update you on the progress. You can track the status of your refund by contacting our support team.

Thank you for your patience.

Best regards,
GUVI Team`
  }),

  [RefundStatus.UNDER_REVIEW]: (data: NotificationPayload) => ({
    subject: `Refund Request Under Review - RF-${String(data.refundId).padStart(4, '0')}`,
    body: `Dear ${data.recipientName},

Your refund request (RF-${String(data.refundId).padStart(4, '0')}) is now under review by our finance team.

Request Details:
- Refund ID: RF-${String(data.refundId).padStart(4, '0')}
- Status: Under Review

We will complete our review within 3-5 business days and update you on the outcome.

Thank you for your patience.

Best regards,
GUVI Team`
  }),

  [RefundStatus.APPROVED]: (data: NotificationPayload) => ({
    subject: `Refund Request Approved - RF-${String(data.refundId).padStart(4, '0')}`,
    body: `Dear ${data.recipientName},

Great news! Your refund request (RF-${String(data.refundId).padStart(4, '0')}) has been approved.

Request Details:
- Refund ID: RF-${String(data.refundId).padStart(4, '0')}
- Amount: ₹${data.amount ? (Number(data.amount) / 100).toLocaleString('en-IN') : 'Pending'}
- Status: Approved

Our finance team is now processing your refund. The amount will be credited to your original payment source within 5-7 business days.

Thank you for your patience.

Best regards,
GUVI Team`
  }),

  [RefundStatus.PROCESSING]: (data: NotificationPayload) => ({
    subject: `Refund Processing in Progress - RF-${String(data.refundId).padStart(4, '0')}`,
    body: `Dear ${data.recipientName},

Your refund (RF-${String(data.refundId).padStart(4, '0')}) is now being processed.

Request Details:
- Refund ID: RF-${String(data.refundId).padStart(4, '0')}
- Amount: ₹${data.amount ? (Number(data.amount) / 100).toLocaleString('en-IN') : 'Pending'}
- Status: Processing

The refund amount will be credited to your account shortly. You should receive it within 2-3 business days.

Thank you for your patience.

Best regards,
GUVI Team`
  }),

  [RefundStatus.DISBURSED]: (data: NotificationPayload) => ({
    subject: `Refund Disbursed Successfully - RF-${String(data.refundId).padStart(4, '0')}`,
    body: `Dear ${data.recipientName},

Your refund has been successfully disbursed!

Request Details:
- Refund ID: RF-${String(data.refundId).padStart(4, '0')}
- Amount: ₹${data.amount ? (Number(data.amount) / 100).toLocaleString('en-IN') : 'Pending'}
- Status: Disbursed

The refund amount has been credited to your original payment source. Please check your bank account for the credit.

If you don't receive the amount within 3 business days, please contact our support team with your refund ID: RF-${String(data.refundId).padStart(4, '0')}

Thank you for your patience.

Best regards,
GUVI Team`
  }),

  [RefundStatus.REJECTED]: (data: NotificationPayload) => ({
    subject: `Refund Request Update - RF-${String(data.refundId).padStart(4, '0')}`,
    body: `Dear ${data.recipientName},

We have reviewed your refund request (RF-${String(data.refundId).padStart(4, '0')}) and unfortunately, it could not be approved at this time.

Request Details:
- Refund ID: RF-${String(data.refundId).padStart(4, '0')}
- Status: Rejected
${data.rejectionReason ? `Reason: ${data.rejectionReason}` : ''}

If you believe this decision was made in error or would like to provide additional information, please contact our support team with your refund ID: RF-${String(data.refundId).padStart(4, '0')}

We appreciate your understanding.

Best regards,
GUVI Team`
  }),

  [RefundStatus.ON_HOLD]: (data: NotificationPayload) => ({
    subject: `Refund Request On Hold - RF-${String(data.refundId).padStart(4, '0')}`,
    body: `Dear ${data.recipientName},

Your refund request (RF-${String(data.refundId).padStart(4, '0')}) has been placed on hold pending additional review.

Request Details:
- Refund ID: RF-${String(data.refundId).padStart(4, '0')}
- Status: On Hold

Our team requires additional information or documentation to process your request. We will contact you shortly with the details.

If you have any questions, please reach out to our support team with your refund ID: RF-${String(data.refundId).padStart(4, '0')}

Thank you for your patience.

Best regards,
GUVI Team`
  }),
};

/**
 * Send notification for refund status change
 * This is a placeholder implementation that logs to console
 * In production, this would integrate with email service (SendGrid, AWS SES, etc.)
 */
export const sendStatusChangeNotification = async (payload: NotificationPayload): Promise<void> => {
  try {
    const template = emailTemplates[payload.status];
    if (!template) {
      console.warn(`No email template found for status: ${payload.status}`);
      return;
    }

    const { subject, body } = template(payload);

    // TODO: Integrate with actual email service
    // For now, log to console
    console.log('📧 EMAIL NOTIFICATION:', {
      to: payload.recipientEmail,
      subject,
      body: body.replace(/\n/g, ' ').substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
    });

    // Example integration with SendGrid (commented out):
    // await sgMail.send({
    //   to: payload.recipientEmail,
    //   from: 'refunds@guvi.in',
    //   subject,
    //   text: body,
    // });

    // Example integration with AWS SES (commented out):
    // await ses.sendEmail({
    //   Source: 'refunds@guvi.in',
    //   Destination: { ToAddresses: [payload.recipientEmail] },
    //   Message: {
    //     Subject: { Data: subject },
    //     Body: { Text: { Data: body } }
    //   }
    // }).promise();

  } catch (error) {
    console.error('Failed to send notification:', error);
    // Don't throw - we don't want notification failures to break the refund process
  }
};

/**
 * Send notification to internal team for SLA breaches
 */
export const sendSLABreachNotification = async (refundId: number, assigneeEmail: string): Promise<void> => {
  try {
    const subject = `SLA Breach Alert - RF-${String(refundId).padStart(4, '0')}`;
    const body = `ALERT: Refund request RF-${String(refundId).padStart(4, '0')} has breached its SLA deadline.

Please prioritize this request immediately to ensure timely resolution.

Refund ID: RF-${String(refundId).padStart(4, '0')}
Assigned to: ${assigneeEmail}
Breach time: ${new Date().toISOString()}

This is an automated alert from the GUVI Refund System.`;

    console.log('🚨 SLA BREACH NOTIFICATION:', {
      to: assigneeEmail,
      subject,
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with actual email service for internal alerts
  } catch (error) {
    console.error('Failed to send SLA breach notification:', error);
  }
};

/**
 * Send notification for new refund assignment
 */
export const sendAssignmentNotification = async (assigneeEmail: string, refundId: number, learnerName: string): Promise<void> => {
  try {
    const subject = `New Refund Assigned - RF-${String(refundId).padStart(4, '0')}`;
    const body = `A new refund request has been assigned to you.

Refund ID: RF-${String(refundId).padStart(4, '0')}
Learner: ${learnerName}

Please review and process this request at your earliest convenience.

This is an automated notification from the GUVI Refund System.`;

    console.log('📋 ASSIGNMENT NOTIFICATION:', {
      to: assigneeEmail,
      subject,
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with actual email service
  } catch (error) {
    console.error('Failed to send assignment notification:', error);
  }
};