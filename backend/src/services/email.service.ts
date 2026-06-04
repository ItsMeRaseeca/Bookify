/**
 * Email Service
 * =============
 * Nodemailer configuration with Gmail SMTP using App Password.
 * Used for sending OTP verification emails.
 */

import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

// Create transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: config.SMTP_EMAIL,
    pass: config.SMTP_APP_PASSWORD,
  },
});

// Verify transporter connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error.message);
  } else {
    console.log('✅ Email transporter ready');
  }
});

interface OtpEmailParams {
  to: string;
  name: string;
  otp: string;
  expiryMinutes: number;
}

/**
 * Send OTP verification email
 */
export async function sendOtpEmail({ to, name, otp, expiryMinutes }: OtpEmailParams): Promise<void> {
  const subject = 'Verify Your Account - Service Booking Platform';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Account</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Email Verification</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Thank you for registering! Please use the following OTP to verify your email address:
        </p>
        
        <div style="background: #4f46e5; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
          ${otp}
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 20px;">
          ⏰ This code will expire in <strong>${expiryMinutes} minutes</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #6b7280; margin: 0;">
          If you didn't request this verification, please ignore this email.
        </p>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
          Best regards,<br>
          <strong>Service Booking Platform Team</strong>
        </p>
      </div>
      
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
        This is an automated message. Please do not reply to this email.
      </p>
    </body>
    </html>
  `;

  const textContent = `
Hello ${name},

Thank you for registering! Please use the following OTP to verify your email address:

${otp}

This code will expire in ${expiryMinutes} minutes.

If you didn't request this verification, please ignore this email.

Best regards,
Service Booking Platform Team
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Service Booking Platform" <${config.SMTP_EMAIL}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });
    
    console.log('✅ OTP email sent successfully:', {
      messageId: info.messageId,
      to,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error: any) {
    console.error('❌ Failed to send OTP email:', {
      to,
      error: error.message,
      code: error.code,
      response: error.response,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

interface BookingConfirmationParams {
  to: string;
  name: string;
  serviceName: string;
  date: string;
  time: string;
  amount: string;
  paymentMode: string;
  bookingId: string;
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmationEmail(params: BookingConfirmationParams): Promise<void> {
  const { to, name, serviceName, date, time, amount, paymentMode, bookingId } = params;
  
  const subject = 'Booking Confirmed - Service Booking Platform';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">✅ Booking Confirmed</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Your booking has been confirmed! Here are the details:
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Booking ID</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; text-align: right;">${bookingId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Service</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; text-align: right;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; text-align: right;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Time</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; text-align: right;">${time}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Payment Mode</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; text-align: right;">${paymentMode}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280;">Amount</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #10b981; font-size: 18px;">${amount}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
          Best regards,<br>
          <strong>Service Booking Platform Team</strong>
        </p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Service Booking Platform" <${config.SMTP_EMAIL}>`,
    to,
    subject,
    html: htmlContent,
  });
}

interface PasswordResetEmailParams {
  to: string;
  name: string;
  otp: string;
  expiryMinutes: number;
}

/**
 * Send password reset OTP email
 */
export async function sendPasswordResetEmail({ to, name, otp, expiryMinutes }: PasswordResetEmailParams): Promise<void> {
  const subject = 'Reset Your Password - Service Booking Platform';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password Reset</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          We received a request to reset your password. Use the following OTP to complete the password reset:
        </p>
        
        <div style="background: #dc2626; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
          ${otp}
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 20px;">
          ⏰ This code will expire in <strong>${expiryMinutes} minutes</strong>
        </p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="font-size: 14px; color: #991b1b; margin: 0;">
            <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #6b7280; margin: 0;">
          For security reasons, this code can only be used once and will expire shortly.
        </p>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
          Best regards,<br>
          <strong>Service Booking Platform Team</strong>
        </p>
      </div>
      
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
        This is an automated message. Please do not reply to this email.
      </p>
    </body>
    </html>
  `;

  const textContent = `
Hello ${name},

We received a request to reset your password. Use the following OTP to complete the password reset:

${otp}

This code will expire in ${expiryMinutes} minutes.

⚠️ Security Notice: If you didn't request this password reset, please ignore this email. Your account remains secure.

For security reasons, this code can only be used once and will expire shortly.

Best regards,
Service Booking Platform Team
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Service Booking Platform" <${config.SMTP_EMAIL}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });
    
    console.log('✅ Password reset email sent successfully:', {
      messageId: info.messageId,
      to,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error: any) {
    console.error('❌ Failed to send password reset email:', {
      to,
      error: error.message,
      code: error.code,
      response: error.response,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
}