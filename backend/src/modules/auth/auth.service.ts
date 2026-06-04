/**
 * Auth Service
 * ============
 * Business logic for authentication operations.
 */

import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/index.js';
import { generateToken } from '../../middleware/auth.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../../services/email.service.js';
import { generateOtp, getOtpExpiry, isExpired, sanitizeUser } from '../../lib/utils.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors.js';
import type { 
  SignupInput, 
  LoginInput, 
  VerifyOtpInput,
  ForgotPasswordInput,
  VerifyPasswordResetOtpInput,
  ResetPasswordInput,
} from '../../lib/schemas.js';

const SALT_ROUNDS = 12;

/**
 * Register a new user
 */
export async function signup(data: SignupInput) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    if (existingUser.verified) {
      throw new ConflictError('Email already registered');
    }
    // User exists but not verified - delete old user and OTPs
    await prisma.otp.deleteMany({ where: { userId: existingUser.id } });
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      role: data.role,
      verified: false,
    },
  });

  // Generate and store OTP
  const otp = generateOtp();
  const expiresAt = getOtpExpiry(config.OTP_EXPIRY_MINUTES);

  await prisma.otp.create({
    data: {
      code: otp,
      expiresAt,
      userId: user.id,
    },
  });

  // Log OTP in development mode for testing
  if (config.NODE_ENV === 'development') {
    console.log('\n🔐 ============================================');
    console.log(`📧 OTP for ${user.email}: ${otp}`);
    console.log('🔐 ============================================\n');
  }

  // Send OTP email
  try {
    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      expiryMinutes: config.OTP_EXPIRY_MINUTES,
    });
    console.log(`📧 OTP email sent to ${user.email}`);
  } catch (error: any) {
    console.error(`❌ Failed to send OTP email to ${user.email}:`, error.message);
    console.error('   Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
    });
    // Don't throw - allow user to resend OTP later
    // The OTP is still saved in database
  }

  return {
    message: 'Registration successful. Please check your email for OTP.',
    email: user.email,
  };
}

/**
 * Verify OTP and activate account
 */
export async function verifyOtp(data: VerifyOtpInput) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      otps: {
        where: { type: 'VERIFICATION' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.verified) {
    throw new BadRequestError('Account already verified');
  }

  // Check if OTP exists
  const latestOtp = user.otps[0];
  if (!latestOtp) {
    throw new BadRequestError('No OTP found. Please request a new one.');
  }

  // Check OTP expiry
  if (isExpired(latestOtp.expiresAt)) {
    throw new BadRequestError('OTP has expired. Please request a new one.');
  }

  // Verify OTP code
  if (latestOtp.code !== data.otp) {
    throw new BadRequestError('Invalid OTP');
  }

  // Mark user as verified and delete all OTPs
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { verified: true },
    }),
    prisma.otp.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  // Generate JWT
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    message: 'Email verified successfully',
    token,
    user: sanitizeUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }),
  };
}

/**
 * Resend OTP for verification
 */
export async function resendOtp(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.verified) {
    throw new BadRequestError('Account already verified');
  }

  // Delete existing OTPs
  await prisma.otp.deleteMany({
    where: { userId: user.id },
  });

  // Generate new OTP
  const otp = generateOtp();
  const expiresAt = getOtpExpiry(config.OTP_EXPIRY_MINUTES);

  await prisma.otp.create({
    data: {
      code: otp,
      type: 'VERIFICATION',
      expiresAt,
      userId: user.id,
    },
  });

  // Log OTP in development mode for testing
  if (config.NODE_ENV === 'development') {
    console.log('\n🔐 ============================================');
    console.log(`📧 Resend OTP for ${user.email}: ${otp}`);
    console.log('🔐 ============================================\n');
  }

  // Send OTP email
  try {
    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      expiryMinutes: config.OTP_EXPIRY_MINUTES,
    });
    console.log(`📧 OTP resend email sent to ${user.email}`);
  } catch (error: any) {
    console.error(`❌ Failed to resend OTP email to ${user.email}:`, error.message);
    console.error('   Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
    });
    // Don't throw - allow user to try again
    // The OTP is still saved in database
  }

  return {
    message: 'OTP sent successfully. Please check your email.',
  };
}

/**
 * Login user
 */
export async function login(data: LoginInput) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Compare password
  const isValidPassword = await bcrypt.compare(data.password, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if verified
  if (!user.verified) {
    // Resend OTP for unverified accounts
    await resendOtp(user.email);
    throw new BadRequestError('Email not verified. A new OTP has been sent to your email.');
  }

  // Generate JWT
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    message: 'Login successful',
    token,
    user: sanitizeUser({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    }),
  };
}

/**
 * Get current user profile
 */
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      verified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

/**
 * Request password reset - sends OTP to user's email
 */
export async function forgotPassword(data: ForgotPasswordInput) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  // Security: Don't reveal if user exists or not
  // Always return success message
  if (!user) {
    // Return success to prevent email enumeration
    return {
      message: 'If an account exists with this email, a password reset code has been sent.',
    };
  }

  // Only allow password reset for verified accounts
  if (!user.verified) {
    throw new BadRequestError('Please verify your email first before resetting your password.');
  }

  // Delete existing password reset OTPs
  await prisma.otp.deleteMany({
    where: {
      userId: user.id,
      type: 'PASSWORD_RESET',
    },
  });

  // Generate new password reset OTP
  const otp = generateOtp();
  const expiresAt = getOtpExpiry(config.OTP_EXPIRY_MINUTES);

  await prisma.otp.create({
    data: {
      code: otp,
      type: 'PASSWORD_RESET',
      expiresAt,
      userId: user.id,
    },
  });

  // Log OTP in development mode for testing
  if (config.NODE_ENV === 'development') {
    console.log('\n🔐 ============================================');
    console.log(`🔒 Password Reset OTP for ${user.email}: ${otp}`);
    console.log('🔐 ============================================\n');
  }

  // Send password reset email
  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      otp,
      expiryMinutes: config.OTP_EXPIRY_MINUTES,
    });
    console.log(`📧 Password reset email sent to ${user.email}`);
  } catch (error: any) {
    console.error(`❌ Failed to send password reset email to ${user.email}:`, error.message);
    console.error('   Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
    });
    // Don't throw - allow user to try again
    // The OTP is still saved in database
  }

  return {
    message: 'If an account exists with this email, a password reset code has been sent.',
  };
}

/**
 * Verify password reset OTP (optional step - can be combined with reset)
 */
export async function verifyPasswordResetOtp(data: VerifyPasswordResetOtpInput) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      otps: {
        where: { type: 'PASSWORD_RESET' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.verified) {
    throw new BadRequestError('Account not verified');
  }

  // Check if OTP exists
  const latestOtp = user.otps[0];
  if (!latestOtp) {
    throw new BadRequestError('No password reset code found. Please request a new one.');
  }

  // Check OTP expiry
  if (isExpired(latestOtp.expiresAt)) {
    throw new BadRequestError('Password reset code has expired. Please request a new one.');
  }

  // Verify OTP code
  if (latestOtp.code !== data.otp) {
    throw new BadRequestError('Invalid password reset code');
  }

  return {
    message: 'Password reset code verified successfully',
  };
}

/**
 * Reset password with OTP
 */
export async function resetPassword(data: ResetPasswordInput) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      otps: {
        where: { type: 'PASSWORD_RESET' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.verified) {
    throw new BadRequestError('Account not verified');
  }

  // Check if OTP exists
  const latestOtp = user.otps[0];
  if (!latestOtp) {
    throw new BadRequestError('No password reset code found. Please request a new one.');
  }

  // Check OTP expiry
  if (isExpired(latestOtp.expiresAt)) {
    throw new BadRequestError('Password reset code has expired. Please request a new one.');
  }

  // Verify OTP code
  if (latestOtp.code !== data.otp) {
    throw new BadRequestError('Invalid password reset code');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

  // Update password and delete all OTPs for user
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    }),
    prisma.otp.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  return {
    message: 'Password reset successfully. You can now login with your new password.',
  };
}
