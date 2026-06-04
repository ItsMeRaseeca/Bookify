/**
 * Booking Controller
 * ==================
 * HTTP request handlers for booking operations.
 */

import { Request, Response } from 'express';
import * as bookingService from './booking.service.js';
import * as phonePeService from '../payment/phonepe.service.js';

/**
 * POST /bookings/hold
 * Hold a slot for booking
 */
export async function holdSlot(req: Request, res: Response) {
  const result = await bookingService.holdSlot(req.user!.id, req.body);
  
  res.status(200).json({
    success: true,
    message: `Slot held for ${result.expiresInMinutes} minutes`,
    ...result,
  });
}

/**
 * POST /bookings/confirm
 * Confirm a booking with payment
 */
export async function confirmBooking(req: Request, res: Response) {
  const booking = await bookingService.confirmBooking(req.user!.id, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Booking confirmed successfully',
    booking,
  });
}

/**
 * POST /bookings/cancel-hold
 * Cancel a held slot (release hold)
 */
export async function cancelHold(req: Request, res: Response) {
  const slot = await bookingService.cancelHold(req.user!.id, req.body.slotId);
  
  res.status(200).json({
    success: true,
    message: 'Hold cancelled',
    slot,
  });
}

/**
 * GET /bookings
 * Get all bookings for current user
 */
export async function getUserBookings(req: Request, res: Response) {
  const bookings = await bookingService.getUserBookings(req.user!.id);
  
  res.status(200).json({
    success: true,
    bookings,
  });
}

/**
 * GET /bookings/:id
 * Get a single booking
 */
export async function getBooking(req: Request, res: Response) {
  const booking = await bookingService.getBooking(req.user!.id, req.params.id!);
  
  res.status(200).json({
    success: true,
    booking,
  });
}

/**
 * POST /bookings/:id/receipt
 * Generate and download PDF receipt
 */
export async function generateReceipt(req: Request, res: Response) {
  const { buffer, filename } = await bookingService.generateReceipt(
    req.user!.id,
    req.params.id!
  );
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

/**
 * POST /bookings/cleanup
 * Release expired holds (admin/cron endpoint)
 */
export async function releaseExpiredHolds(_req: Request, res: Response) {
  const result = await bookingService.releaseExpiredHolds();
  
  res.status(200).json({
    success: true,
    message: `Released ${result.released} expired holds`,
    ...result,
  });
}

/**
 * POST /bookings/initiate-payment
 * Create a pending booking and initiate PhonePe payment
 */
export async function initiatePayment(req: Request, res: Response) {
  const { slotId } = req.body;
  const userId = req.user!.id;

  // Create pending booking with slot on hold
  const { booking, service, holdExpiry } = await bookingService.createPendingBooking(
    userId,
    slotId
  );

  // Initiate PhonePe payment
  const { redirectUrl, merchantOrderId } = await phonePeService.initiatePayment({
    bookingId: booking.id,
    slotId,
    amount: service.price,
    userId,
  });

  res.status(200).json({
    success: true,
    message: 'Payment initiated',
    redirectUrl,
    merchantOrderId,
    bookingId: booking.id,
    holdExpiry,
  });
}
