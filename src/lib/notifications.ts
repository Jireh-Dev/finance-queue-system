import nodemailer, { Transporter } from 'nodemailer';

interface SendNotificationOptions {
  to: string;
  recipientName: string;
  type: 'BOOKING_CONFIRMATION' | 'QUEUE_CALLED' | 'APPOINTMENT_COMPLETED' | 'APPOINTMENT_CANCELLED';
  details: {
    purpose?: string;
    appointmentDate?: string;
    timeSlot?: string;
    queueNumber?: number | string | null;
    counterName?: string | null;
    token?: string;
    remarks?: string | null;
  };
}

let cachedTransporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter | null> {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return cachedTransporter;
  }

  // Fallback to test ethereal account or graceful development console log
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return cachedTransporter;
  } catch (err) {
    console.warn('Could not initialize ethereal email transport; falling back to logged alerts.');
    return null;
  }
}

export async function sendQueueNotification({
  to,
  recipientName,
  type,
  details,
}: SendNotificationOptions) {
  try {
    let subject = '';
    let bodyHtml = '';

    switch (type) {
      case 'BOOKING_CONFIRMATION':
        subject = `[UA Finance] Appointment Confirmation - ${details.purpose}`;
        bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #003876; margin: 0;">University of the Assumption</h2>
              <p style="color: #64748b; font-size: 14px; margin: 4px 0;">Finance & Accounting Office</p>
            </div>
            <div style="background-color: #f0f7ff; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #003876; margin-top: 0;">Appointment Confirmed</h3>
              <p style="margin: 4px 0;">Hello <strong>${recipientName}</strong>,</p>
              <p style="margin: 4px 0;">Your finance appointment has been scheduled successfully.</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; color: #64748b;">Purpose:</td><td style="font-weight: bold; text-align: right;">${details.purpose || 'Finance Service'}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Date:</td><td style="font-weight: bold; text-align: right;">${details.appointmentDate || 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Time Slot:</td><td style="font-weight: bold; text-align: right;">${details.timeSlot || 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Verification Token:</td><td style="font-family: monospace; font-size: 11px; text-align: right;">${details.token ? details.token.slice(0, 16) + '...' : 'Verified'}</td></tr>
            </table>
            <p style="font-size: 13px; color: #475569;">Present your QR code ticket from your dashboard when arriving at the finance counter.</p>
          </div>
        `;
        break;

      case 'QUEUE_CALLED':
        subject = `[UA Finance Alert] NOW SERVING: Queue #${details.queueNumber} at ${details.counterName || 'Cashier Counter'}`;
        bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #EAA023; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 16px;">
              <h2 style="color: #003876; margin: 0;">University of the Assumption</h2>
              <p style="color: #64748b; font-size: 13px;">Finance & Accounting Office</p>
            </div>
            <div style="background-color: #FEF9EE; border-left: 4px solid #EAA023; padding: 16px; border-radius: 4px; text-align: center;">
              <h1 style="color: #003876; font-size: 36px; margin: 8px 0;">Q-${details.queueNumber}</h1>
              <h3 style="color: #B45309; margin: 4px 0;">Please Proceed to ${details.counterName || 'Cashier Window'}</h3>
              <p style="color: #475569; margin: 6px 0;">Hello <strong>${recipientName}</strong>, your turn has arrived!</p>
            </div>
          </div>
        `;
        break;

      case 'APPOINTMENT_COMPLETED':
        subject = `[UA Finance] Transaction Completed - Queue #${details.queueNumber || 'Done'}`;
        bodyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #003876;">University of the Assumption</h2>
            <p>Hello <strong>${recipientName}</strong>,</p>
            <p>Your transaction at <strong>${details.counterName || 'Finance Window'}</strong> has been completed.</p>
            ${details.remarks ? `<p style="background: #f8fafc; padding: 10px; border-radius: 4px;"><strong>Cashier Notes:</strong> ${details.remarks}</p>` : ''}
            <p style="color: #64748b; font-size: 12px;">Thank you for using the UA Finance Queue System.</p>
          </div>
        `;
        break;

      default:
        subject = `[UA Finance] Notification for ${recipientName}`;
        bodyHtml = `<p>Hello ${recipientName}, you have an update regarding your finance appointment.</p>`;
    }

    const transporter = await getTransporter();
    if (transporter) {
      const fromAddress = process.env.SMTP_FROM || '"UA Finance Office" <finance@ua.edu.ph>';
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html: bodyHtml,
      });
      console.log(`[Notification Sent] Type: ${type} | To: ${to} | MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`[Notification Logged (No SMTP)] Type: ${type} | To: ${to} | Subject: ${subject}`);
      return { success: true, simulated: true };
    }
  } catch (error) {
    console.error('Failed to dispatch queue notification:', error);
    return { success: false, error };
  }
}
