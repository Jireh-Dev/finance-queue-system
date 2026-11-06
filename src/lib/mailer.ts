import nodemailer from 'nodemailer';

/**
 * Configure standard Nodemailer transporter.
 * Prioritizes Gmail SMTP credentials (GMAIL_USER / GMAIL_APP_PASSWORD or SMTP_USER / SMTP_PASS).
 * Gracefully falls back to console logging in development if credentials are not configured.
 */
function createTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  // Fallback to custom SMTP host if defined
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: user || '',
        pass: pass || '',
      },
    });
  }

  return null;
}

export interface SendPasswordResetEmailParams {
  to: string;
  recipientName: string;
  resetUrl: string;
}

/**
 * Sends a password reset email containing a secure one-time link.
 */
export async function sendPasswordResetEmail({
  to,
  recipientName,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; messageId?: string; error?: any }> {
  try {
    const transporter = createTransporter();
    const fromAddress =
      process.env.SMTP_FROM ||
      (process.env.GMAIL_USER ? `"UA Finance Portal" <${process.env.GMAIL_USER}>` : '"UA Finance Portal" <no-reply@ua.edu.ph>');

    const subject = '[UA Finance] Reset Your Account Password';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #003876; margin: 0; font-size: 22px;">University of the Assumption</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0;">Finance & Queue Management Portal</p>
        </div>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #003876; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
          <h3 style="color: #003876; margin: 0 0 8px 0; font-size: 16px;">Password Reset Request</h3>
          <p style="margin: 0; font-size: 14px; color: #334155;">
            Hello <strong>${recipientName}</strong>,
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #334155;">
            We received a request to reset your password for the UA Finance Portal. Click the button below to set a new password:
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" 
             style="background-color: #003876; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(0, 56, 118, 0.2);">
            Reset Password
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.
        </p>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; word-break: break-all;">
          <p style="margin: 0 0 4px 0;">If the button doesn't work, copy and paste this URL into your browser:</p>
          <a href="${resetUrl}" style="color: #003876; text-decoration: underline;">${resetUrl}</a>
        </div>
      </div>
    `;

    if (transporter) {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });
      console.log(`[Password Reset Email Sent] To: ${to} | MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`[Password Reset Simulated (No SMTP Configured)] To: ${to} | Reset Link: ${resetUrl}`);
      return { success: true };
    }
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error };
  }
}

