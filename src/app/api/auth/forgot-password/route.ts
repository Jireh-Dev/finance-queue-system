import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.email || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();

    // 1. Role-Agnostic User Lookup: find any user regardless of role (STUDENT, PARENT, STAFF, ADMIN)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Privacy-preserving response if user doesn't exist
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email address, a password reset link has been sent.',
      });
    }

    // 2. Token Generation using Node's native crypto.randomBytes(32).toString('hex')
    const token = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // 3. Database Update
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiry,
      },
    });

    // 4. Nodemailer SMTP Configuration for smtp.gmail.com
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.error(
        '[SMTP Error] GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment variables.'
      );
      return NextResponse.json(
        { error: 'Email delivery service is currently not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const recipientName = `${user.firstName} ${user.lastName}`.trim() || 'User';

    const htmlContent = `
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
            We received a request to reset the password for your account. Click the button below to set a new password:
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" 
             style="background-color: #003876; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(0, 56, 118, 0.2);">
            Reset Password
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          This link is valid for <strong>1 hour</strong>. If you did not request this password change, no further action is required and your account remains secure.
        </p>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; word-break: break-all;">
          <p style="margin: 0 0 4px 0;">If the button above does not work, copy and paste this link into your browser:</p>
          <a href="${resetUrl}" style="color: #003876; text-decoration: underline;">${resetUrl}</a>
        </div>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"UA Finance Portal" <${gmailUser}>`,
        to: user.email,
        subject: '[UA Finance] Reset Your Account Password',
        html: htmlContent,
      });

      console.log(`[Reset Email Sent] To: ${user.email} | Message ID: ${info.messageId}`);
    } catch (smtpErr: any) {
      console.error('[SMTP Error] Failed to send password reset email:', {
        message: smtpErr.message,
        code: smtpErr.code,
        command: smtpErr.command,
        response: smtpErr.response,
      });
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('[Forgot Password Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
