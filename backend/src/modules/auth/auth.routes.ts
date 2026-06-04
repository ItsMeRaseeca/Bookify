/**
 * Auth Routes
 * ===========
 * Authentication and authorization endpoints.
 */

import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { 
  signupSchema, 
  loginSchema, 
  verifyOtpSchema, 
  resendOtpSchema,
  forgotPasswordSchema,
  verifyPasswordResetOtpSchema,
  resetPasswordSchema,
} from '../../lib/schemas.js';
import rateLimit from 'express-rate-limit';
import { otpRateLimitConfig } from '../../config/index.js';

const router = Router();

// Rate limit for OTP endpoints (stricter)
const otpLimiter = rateLimit(otpRateLimitConfig);

/**
 * POST /auth/signup
 * Register a new user
 */
router.post(
  '/signup',
  otpLimiter,
  validateBody(signupSchema),
  asyncHandler(authController.signup)
);

/**
 * POST /auth/verify-otp
 * Verify OTP and activate account
 */
router.post(
  '/verify-otp',
  otpLimiter,
  validateBody(verifyOtpSchema),
  asyncHandler(authController.verifyOtp)
);

/**
 * POST /auth/resend-otp
 * Resend OTP for verification
 */
router.post(
  '/resend-otp',
  otpLimiter,
  validateBody(resendOtpSchema),
  asyncHandler(authController.resendOtp)
);

/**
 * POST /auth/login
 * Login user
 */
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(authController.login)
);

/**
 * GET /auth/me
 * Get current user profile (protected)
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(authController.me)
);

/**
 * POST /auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  otpLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);

/**
 * POST /auth/verify-password-reset-otp
 * Verify password reset OTP (optional step)
 */
router.post(
  '/verify-password-reset-otp',
  otpLimiter,
  validateBody(verifyPasswordResetOtpSchema),
  asyncHandler(authController.verifyPasswordResetOtp)
);

/**
 * POST /auth/reset-password
 * Reset password with OTP
 */
router.post(
  '/reset-password',
  otpLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

export default router;
