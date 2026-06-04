/**
 * PhonePe Payment Gateway Service
 * ================================
 * Integration with PhonePe v2 API for payment processing.
 */

import axios from 'axios';
import crypto from 'crypto';
import { BadRequestError } from '../../lib/errors.js';

// PhonePe configuration from environment
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID!;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET!;
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || '1';
const PHONEPE_BASE_URL = process.env.PHONEPE_BASE_URL!;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Cache for access token
let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get PhonePe OAuth access token
 * Tokens are cached and refreshed when expired
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 1 minute buffer)
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  try {
    const response = await axios.post(
      `${PHONEPE_BASE_URL}/v1/oauth/token`,
      new URLSearchParams({
        client_id: PHONEPE_CLIENT_ID,
        client_secret: PHONEPE_CLIENT_SECRET,
        client_version: PHONEPE_CLIENT_VERSION,
        grant_type: 'client_credentials',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = response.data.access_token;
    // Token typically expires in 20 minutes, we'll cache for 15 minutes
    tokenExpiry = Date.now() + 15 * 60 * 1000;

    console.log(`[PhonePe] Access token obtained successfully`);
    return accessToken!;
  } catch (error: any) {
    console.error('[PhonePe] Failed to get access token:', error.response?.data || error.message);
    throw new BadRequestError('Payment service temporarily unavailable');
  }
}

/**
 * Initiate a PhonePe payment
 * Returns a redirect URL for the user to complete payment
 */
export async function initiatePayment(params: {
  bookingId: string;
  slotId: string;
  amount: number; // Amount in INR (will be converted to paise)
  userId: string;
}): Promise<{ redirectUrl: string; merchantOrderId: string }> {
  const { bookingId, slotId, amount, userId } = params;

  // Create unique merchant order ID
  const merchantOrderId = `BOOKING_${bookingId}_${Date.now()}`;
  const amountPaise = Math.round(amount * 100);

  console.log(`[PhonePe] Initiating payment - Order: ${merchantOrderId}, Amount: ₹${amount}`);

  try {
    const token = await getAccessToken();

    const payload = {
      merchantOrderId,
      amount: amountPaise,
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: `Booking payment for slot ${slotId}`,
        merchantUrls: {
          redirectUrl: `${FRONTEND_URL}/payment/status?orderId=${merchantOrderId}&bookingId=${bookingId}`,
        },
      },
      // Store metadata for webhook processing
      merchantContext: {
        bookingId,
        slotId,
        userId,
      },
    };

    const response = await axios.post(
      `${PHONEPE_BASE_URL}/checkout/v2/pay`,
      payload,
      {
        headers: {
          Authorization: `O-Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[PhonePe] Payment initiated - Redirect URL generated for Order: ${merchantOrderId}`);

    return {
      redirectUrl: response.data.redirectUrl,
      merchantOrderId,
    };
  } catch (error: any) {
    console.error('[PhonePe] Payment initiation failed:', error.response?.data || error.message);
    throw new BadRequestError(
      error.response?.data?.message || 'Failed to initiate payment. Please try again.'
    );
  }
}

/**
 * Check payment status from PhonePe
 */
export async function checkPaymentStatus(merchantOrderId: string): Promise<{
  state: 'COMPLETED' | 'FAILED' | 'PENDING' | 'UNKNOWN';
  orderId: string | null;
  transactionId: string | null;
  amount: number | null;
  paymentMode: string | null;
}> {
  console.log(`[PhonePe] Checking payment status for Order: ${merchantOrderId}`);

  try {
    const token = await getAccessToken();

    const response = await axios.get(
      `${PHONEPE_BASE_URL}/checkout/v2/order/${merchantOrderId}/status?details=true`,
      {
        headers: {
          Authorization: `O-Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;
    const paymentDetails = data.paymentDetails || [];

    const result = {
      state: (data.state as 'COMPLETED' | 'FAILED' | 'PENDING') || 'UNKNOWN',
      orderId: data.orderId || null,
      transactionId: paymentDetails[0]?.transactionId || null,
      amount: data.amount ? data.amount / 100 : null,
      paymentMode: paymentDetails[0]?.paymentMode || null,
    };

    console.log(`[PhonePe] Payment status for ${merchantOrderId}:`, result.state);

    return result;
  } catch (error: any) {
    console.error('[PhonePe] Status check failed:', error.response?.data || error.message);
    return {
      state: 'UNKNOWN',
      orderId: null,
      transactionId: null,
      amount: null,
      paymentMode: null,
    };
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  authHeader: string | undefined,
  webhookUsername: string,
  webhookPassword: string
): boolean {
  if (!authHeader) {
    return false;
  }

  const expectedHash = crypto
    .createHash('sha256')
    .update(`${webhookUsername}:${webhookPassword}`)
    .digest('hex');

  return authHeader === expectedHash;
}

/**
 * Parse merchant order ID to extract booking ID
 */
export function parseBookingIdFromOrderId(merchantOrderId: string): string | null {
  // Format: BOOKING_{bookingId}_{timestamp}
  const match = merchantOrderId.match(/^BOOKING_([a-z0-9]+)_/i);
  return match ? match[1]! : null;
}
