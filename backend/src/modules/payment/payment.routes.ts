/**
 * Payment Module - Routes
 * ========================
 * Payment-related API endpoints.
 */

import { Router } from 'express';
import * as paymentController from './payment.controller.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = Router();

// Check payment status
router.get('/status/:merchantOrderId', asyncHandler(paymentController.getPaymentStatus));

// PhonePe webhook (no auth required - PhonePe sends directly)
router.post('/webhook/phonepe', asyncHandler(paymentController.phonePeWebhook));

// GET endpoint for webhook verification
router.get('/webhook/phonepe', (_req, res) => {
  res.json({ message: 'PhonePe webhook endpoint is accessible' });
});

export default router;
