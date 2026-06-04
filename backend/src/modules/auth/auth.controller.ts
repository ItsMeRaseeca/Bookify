/**
 * Auth Controller
 * ===============
 * HTTP request handlers for authentication endpoints.
 */

import { Request, Response } from 'express';
import * as authService from './auth.service.js';

/**
 * POST /auth/signup
 * Register a new user
 */
export async function signup(req: Request, res: Response) {
  const result = await authService.signup(req.body);
  
  res.status(201).json({
    success: true,
    ...result,
  });
}

/**
 * POST /auth/verify-otp
 * Verify OTP and activate account
 */
export async function verifyOtp(req: Request, res: Response) {
  const result = await authService.verifyOtp(req.body);
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * POST /auth/resend-otp
 * Resend OTP for verification
 */
export async function resendOtp(req: Request, res: Response) {
  const result = await authService.resendOtp(req.body.email);
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * POST /auth/login
 * Login user
 */
export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * GET /auth/me
 * Get current user profile
 */
export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id);
  
  res.status(200).json({
    success: true,
    user,
  });
}

/**
 * POST /auth/forgot-password
 * Request password reset
 */
export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.forgotPassword(req.body);
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * POST /auth/verify-password-reset-otp
 * Verify password reset OTP
 */
export async function verifyPasswordResetOtp(req: Request, res: Response) {
  const result = await authService.verifyPasswordResetOtp(req.body);
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * POST /auth/reset-password
 * Reset password with OTP
 */
export async function resetPassword(req: Request, res: Response) {
  const result = await authService.resetPassword(req.body);
  
  res.status(200).json({
    success: true,
    ...result,
  });
}