/**
 * User Routes
 * ===========
 * User profile management endpoints.
 */

import { Router } from 'express';
import * as userController from './user.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { updateProfileSchema } from '../../lib/schemas.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /user/me
 * Get current user profile
 */
router.get(
  '/me',
  asyncHandler(userController.getProfile)
);

/**
 * PATCH /user/me
 * Update current user profile (only name)
 */
router.patch(
  '/me',
  validateBody(updateProfileSchema),
  asyncHandler(userController.updateProfile)
);

/**
 * GET /user/bookings
 * Get all bookings for current user
 */
router.get(
  '/bookings',
  asyncHandler(userController.getBookings)
);

export default router;
