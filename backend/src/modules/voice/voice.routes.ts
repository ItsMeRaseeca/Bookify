/**
 * Voice Agent Routes
 * ==================
 * Routes for voice-to-voice assistant functionality.
 */

import { Router } from 'express';
import { getVoiceContext, bookSlotVoice } from './voice.controller.js';
import { authenticate, requireUser } from '../../middleware/auth.js';

const router = Router();

// All routes require authentication and user role
router.use(authenticate, requireUser);

// Get context for voice agent system prompt
router.get('/context', getVoiceContext);

// Book a slot via voice agent
router.post('/book', bookSlotVoice);

export default router;
