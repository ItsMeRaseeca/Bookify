/**
 * Booking Routes
 * ==============
 * Routes for slot booking operations.
 */

import { Router } from 'express';
import * as bookingController from './booking.controller.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { authenticate, requireUser, requireAdmin } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { holdSlotSchema, confirmBookingSchema } from '../../lib/schemas.js';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Param validation schema
const idParamSchema = z.object({
  id: z.string().cuid('Invalid booking ID'),
});

// Cancel hold schema
const cancelHoldSchema = z.object({
  slotId: z.string().cuid('Invalid slot ID'),
}).strict();

// Initiate payment schema
const initiatePaymentSchema = z.object({
  slotId: z.string().cuid('Invalid slot ID'),
}).strict();

/**
 * POST /bookings/hold
 * Hold a slot for booking (USER only)
 */
router.post(
  '/hold',
  requireUser,
  validateBody(holdSlotSchema),
  asyncHandler(bookingController.holdSlot)
);

/**
 * POST /bookings/confirm
 * Confirm a booking with payment (USER only)
 */
router.post(
  '/confirm',
  requireUser,
  validateBody(confirmBookingSchema),
  asyncHandler(bookingController.confirmBooking)
);

/**
 * POST /bookings/cancel-hold
 * Cancel a held slot (USER only)
 */
router.post(
  '/cancel-hold',
  requireUser,
  validateBody(cancelHoldSchema),
  asyncHandler(bookingController.cancelHold)
);

/**
 * GET /bookings
 * Get all bookings for current user
 */
router.get(
  '/',
  asyncHandler(bookingController.getUserBookings)
);

/**
 * GET /bookings/:id
 * Get a single booking
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(bookingController.getBooking)
);

/**
 * POST /bookings/:id/receipt
 * Generate and download PDF receipt
 */
router.post(
  '/:id/receipt',
  validateParams(idParamSchema),
  asyncHandler(bookingController.generateReceipt)
);

/**
 * POST /bookings/cleanup
 * Release expired holds (ADMIN only - for cron/manual cleanup)
 */
router.post(
  '/cleanup',
  requireAdmin,
  asyncHandler(bookingController.releaseExpiredHolds)
);

/**
 * POST /bookings/initiate-payment
 * Create pending booking and initiate PhonePe payment (USER only)
 */
router.post(
  '/initiate-payment',
  requireUser,
  validateBody(initiatePaymentSchema),
  asyncHandler(bookingController.initiatePayment)
);

export default router;
