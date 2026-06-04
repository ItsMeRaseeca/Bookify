/**
 * Service Routes
 * ==============
 * Routes for service management (both organizer and public).
 */

import { Router } from 'express';
import * as serviceController from './service.controller.js';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate.js';
import { authenticate, requireOrganizer } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  createServiceSchema,
  updateServiceSchema,
  publishServiceSchema,
  paginationSchema,
  serviceSlotsQuerySchema,
} from '../../lib/schemas.js';
import { z } from 'zod';

const router = Router();

// Param validation schema
const idParamSchema = z.object({
  id: z.string().cuid('Invalid service ID'),
});

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

/**
 * GET /services/categories
 * Get all unique service categories
 */
router.get(
  '/categories',
  asyncHandler(serviceController.getCategories)
);

/**
 * GET /services
 * Get all published services (paginated)
 */
router.get(
  '/',
  validateQuery(paginationSchema),
  asyncHandler(serviceController.getPublishedServices)
);

/**
 * GET /services/:id
 * Get a single published service with available slots
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  validateQuery(serviceSlotsQuerySchema),
  asyncHandler(serviceController.getPublishedService)
);

export default router;

// ============================================
// ORGANIZER ROUTES (separate router)
// ============================================

export const organizerRouter = Router();

// All routes require authentication + organizer role
organizerRouter.use(authenticate);
organizerRouter.use(requireOrganizer);

/**
 * GET /organizer/stats
 * Get organizer dashboard statistics
 */
organizerRouter.get(
  '/stats',
  asyncHandler(serviceController.getOrganizerStats)
);

/**
 * GET /organizer/calendar
 * Get organizer calendar bookings for a specific month
 */
organizerRouter.get(
  '/calendar',
  asyncHandler(serviceController.getOrganizerCalendar)
);

/**
 * POST /organizer/services
 * Create a new service
 */
organizerRouter.post(
  '/services',
  validateBody(createServiceSchema),
  asyncHandler(serviceController.createService)
);

/**
 * GET /organizer/services
 * Get all services for the current organizer
 */
organizerRouter.get(
  '/services',
  asyncHandler(serviceController.getOrganizerServices)
);

/**
 * GET /organizer/services/:id
 * Get a specific service owned by organizer
 */
organizerRouter.get(
  '/services/:id',
  validateParams(idParamSchema),
  asyncHandler(serviceController.getOrganizerService)
);

/**
 * PATCH /organizer/services/:id
 * Update a service
 */
organizerRouter.patch(
  '/services/:id',
  validateParams(idParamSchema),
  validateBody(updateServiceSchema),
  asyncHandler(serviceController.updateService)
);

/**
 * PATCH /organizer/services/:id/publish
 * Publish or unpublish a service
 */
organizerRouter.patch(
  '/services/:id/publish',
  validateParams(idParamSchema),
  validateBody(publishServiceSchema),
  asyncHandler(serviceController.publishService)
);

/**
 * DELETE /organizer/services/:id
 * Delete a service
 */
organizerRouter.delete(
  '/services/:id',
  validateParams(idParamSchema),
  asyncHandler(serviceController.deleteService)
);
