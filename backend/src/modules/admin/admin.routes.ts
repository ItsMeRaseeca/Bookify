/**
 * Admin Routes
 * ============
 * Routes for admin dashboard and operations.
 */

import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = Router();

// All routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /admin/metrics
 * Get platform-wide metrics
 */
router.get(
  '/metrics',
  asyncHandler(adminController.getMetrics)
);

/**
 * GET /admin/services
 * Get all services (read-only)
 */
router.get(
  '/services',
  asyncHandler(adminController.getAllServices)
);

/**
 * GET /admin/users
 * Get all users
 */
router.get(
  '/users',
  asyncHandler(adminController.getAllUsers)
);

/**
 * GET /admin/bookings
 * Get all bookings
 */
router.get(
  '/bookings',
  asyncHandler(adminController.getAllBookings)
);

/**
 * GET /admin/activity
 * Get recent activity
 */
router.get(
  '/activity',
  asyncHandler(adminController.getRecentActivity)
);

export default router;
