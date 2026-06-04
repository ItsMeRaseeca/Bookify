/**
 * User Controller
 * ===============
 * HTTP request handlers for user profile endpoints.
 */

import { Request, Response } from 'express';
import * as userService from './user.service.js';

/**
 * GET /user/me
 * Get current user profile
 */
export async function getProfile(req: Request, res: Response) {
  const user = await userService.getUserProfile(req.user!.id);
  
  res.status(200).json({
    success: true,
    user,
  });
}

/**
 * PATCH /user/me
 * Update current user profile (only name)
 */
export async function updateProfile(req: Request, res: Response) {
  const user = await userService.updateUserProfile(req.user!.id, req.body);
  
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user,
  });
}

/**
 * GET /user/bookings
 * Get all bookings for current user
 */
export async function getBookings(req: Request, res: Response) {
  const bookings = await userService.getUserBookings(req.user!.id);
  
  res.status(200).json({
    success: true,
    bookings,
  });
}
