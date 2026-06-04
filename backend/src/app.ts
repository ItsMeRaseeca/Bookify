/**
 * Express Application Setup
 * =========================
 * Main Express app configuration with middleware and routes.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { corsOptions, rateLimitConfig } from './config/index.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import serviceRoutes, { organizerRouter } from './modules/service/service.routes.js';
import bookingRoutes from './modules/booking/booking.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import voiceRoutes from './modules/voice/voice.routes.js';
import ivrRoutes from './modules/ivr/ivr.routes.js';

// Create Express app
const app = express();

// ============================================
// PROXY TRUST (for ngrok, load balancers, etc.)
// ============================================
// Required when running behind a reverse proxy (ngrok, nginx, etc.)
// This allows express-rate-limit to correctly identify clients
app.set('trust proxy', 1);

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet());

// CORS configuration using cors package
app.use(cors(corsOptions));

// Rate limiting
app.use(rateLimit(rateLimitConfig));

// ============================================
// BODY PARSING
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API ROUTES
// ============================================

// Auth routes
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/user', userRoutes);

// Service routes (public)
app.use('/api/services', serviceRoutes);

// Organizer routes
app.use('/api/organizer', organizerRouter);

// Booking routes
app.use('/api/bookings', bookingRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Upload routes
app.use('/api/upload', uploadRoutes);

// Payment routes
app.use('/api/payment', paymentRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

// Voice agent routes
app.use('/api/voice', voiceRoutes);

// IVR routes (Twilio webhooks)
app.use('/api/ivr', ivrRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
