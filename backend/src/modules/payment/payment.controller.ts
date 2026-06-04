/**
 * Payment Module - Controller
 * ============================
 * Handles payment-related HTTP requests.
 */

import { Request, Response } from 'express';
import * as phonePeService from './phonepe.service.js';
import * as bookingService from '../booking/booking.service.js';

/**
 * Check payment status and update booking
 * GET /api/payment/status/:merchantOrderId
 */
export async function getPaymentStatus(req: Request, res: Response) {
  const { merchantOrderId } = req.params;

  const status = await phonePeService.checkPaymentStatus(merchantOrderId);

  // If payment is completed, update the booking
  if (status.state === 'COMPLETED') {
    const bookingId = phonePeService.parseBookingIdFromOrderId(merchantOrderId);
    if (bookingId) {
      try {
        await bookingService.updateBookingPaymentStatus(bookingId, {
          paymentStatus: 'SUCCESS',
          transactionId: status.transactionId || undefined,
        });
      } catch (error) {
        console.error('[Payment] Failed to update booking:', error);
      }
    }
  } else if (status.state === 'FAILED') {
    const bookingId = phonePeService.parseBookingIdFromOrderId(merchantOrderId);
    if (bookingId) {
      try {
        await bookingService.updateBookingPaymentStatus(bookingId, {
          paymentStatus: 'FAILED',
        });
      } catch (error) {
        console.error('[Payment] Failed to update booking:', error);
      }
    }
  }

  res.json({
    success: true,
    data: status,
  });
}

/**
 * PhonePe Webhook Handler
 * POST /api/payment/webhook/phonepe
 */
export async function phonePeWebhook(req: Request, res: Response) {
  console.log('[PhonePe Webhook] Received:', JSON.stringify(req.body, null, 2));

  try {
    // Verify webhook signature
    const authHeader = req.headers.authorization || req.headers['x-authorization'];
    const webhookUsername = process.env.PHONEPE_WEBHOOK_USERNAME;
    const webhookPassword = process.env.PHONEPE_WEBHOOK_PASSWORD;

    if (webhookUsername && webhookPassword) {
      const isValid = phonePeService.verifyWebhookSignature(
        authHeader as string,
        webhookUsername,
        webhookPassword
      );
      if (!isValid) {
        console.warn('[PhonePe Webhook] Invalid signature');
        // Still process for sandbox/testing, but log warning
      }
    }

    // Parse webhook payload
    const webhookData = req.body;
    const payload = webhookData.payload || webhookData.data || webhookData;
    const merchantOrderId = payload.merchantOrderId || webhookData.merchantOrderId;
    const state = payload.state || webhookData.state;
    const paymentDetails = payload.paymentDetails || [];
    const transactionId = paymentDetails[0]?.transactionId || null;

    if (!merchantOrderId) {
      console.error('[PhonePe Webhook] Missing merchantOrderId');
      return res.status(200).json({ success: false, message: 'Missing merchantOrderId' });
    }

    // Extract booking ID from merchant order ID
    const bookingId = phonePeService.parseBookingIdFromOrderId(merchantOrderId);

    if (!bookingId) {
      console.error('[PhonePe Webhook] Could not parse bookingId from:', merchantOrderId);
      return res.status(200).json({ success: false, message: 'Invalid merchantOrderId format' });
    }

    // Update booking based on payment state
    if (state === 'COMPLETED') {
      console.log(`[PhonePe Webhook] Payment SUCCESS for booking: ${bookingId}`);
      await bookingService.updateBookingPaymentStatus(bookingId, {
        paymentStatus: 'SUCCESS',
        transactionId: transactionId || undefined,
      });
    } else if (state === 'FAILED') {
      console.log(`[PhonePe Webhook] Payment FAILED for booking: ${bookingId}`);
      await bookingService.updateBookingPaymentStatus(bookingId, {
        paymentStatus: 'FAILED',
      });
    } else {
      console.log(`[PhonePe Webhook] Payment PENDING for booking: ${bookingId}, state: ${state}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('[PhonePe Webhook] Processing error:', error);
    // Still return 200 to prevent retries
    res.status(200).json({ success: false, message: 'Processing error' });
  }
}
