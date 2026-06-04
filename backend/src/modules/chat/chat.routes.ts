/**
 * Chat Routes
 * ===========
 * API routes for the chatbot feature.
 */

import { Router } from 'express';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { sendMessage, clearChat } from './chat.controller.js';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// Only users can use the chatbot
router.use(requireUser);

// Send a message to the chatbot
router.post('/message', sendMessage);

// Clear chat history
router.post('/clear', clearChat);

export default router;
