/**
 * IVR Routes
 * ==========
 * Express routes for Twilio IVR webhooks.
 */

import { Router } from 'express';
import {
  handleIncomingCall,
  handleGather,
  handleCallStatus,
  getSystemPromptHandler,
} from './ivr.controller.js';

const router = Router();

// Twilio sends application/x-www-form-urlencoded
// Body is already parsed by express.urlencoded() middleware in app.ts

/**
 * POST /api/ivr/incoming-call
 * Twilio webhook for incoming calls
 */
router.post('/incoming-call', handleIncomingCall);

/**
 * GET /api/ivr/incoming-call
 * Twilio sometimes sends GET for status checks
 */
router.get('/incoming-call', handleIncomingCall);

/**
 * POST /api/ivr/gather
 * Twilio webhook for speech/DTMF input
 */
router.post('/gather', handleGather);

/**
 * GET /api/ivr/gather
 * Support GET for Twilio redirects
 */
router.get('/gather', handleGather);

/**
 * POST /api/ivr/status
 * Twilio webhook for call status updates
 */
router.post('/status', handleCallStatus);

/**
 * GET /api/ivr/system-prompt
 * Get the current system prompt (for debugging/testing)
 */
router.get('/system-prompt', getSystemPromptHandler);

export default router;

