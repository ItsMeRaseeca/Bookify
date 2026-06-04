/**
 * Chat Controller
 * ===============
 * HTTP handlers for the chat API endpoints.
 */

import type { Request, Response, NextFunction } from 'express';
import { processMessage, clearConversation } from './chat.service.js';
import { randomUUID } from 'crypto';

/**
 * Send a message to the chatbot
 * POST /api/chat/message
 */
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Use provided sessionId or generate a new one
    const chatSessionId = sessionId || randomUUID();

    // Process the message
    const response = await processMessage(chatSessionId, userId!, message);

    return res.json({
      success: true,
      data: {
        sessionId: chatSessionId,
        message: response,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Clear chat history
 * POST /api/chat/clear
 */
export async function clearChat(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      clearConversation(sessionId);
    }

    return res.json({
      success: true,
      message: 'Chat history cleared',
    });
  } catch (error) {
    next(error);
  }
}
