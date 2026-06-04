/**
 * Centralized Configuration
 * =========================
 * All environment variables and configuration values in one place.
 * Validates required variables on startup.
 */

import { z } from 'zod';

// Environment variable schema - validates all required env vars
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // OTP
  OTP_EXPIRY_MINUTES: z.string().transform(Number).default('5'),

  // SMTP (Gmail)
  SMTP_EMAIL: z.string().email('SMTP_EMAIL must be a valid email'),
  SMTP_APP_PASSWORD: z.string().min(1, 'SMTP_APP_PASSWORD is required'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // Server
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      console.error('❌ Environment validation failed:');
      missingVars.forEach((v) => console.error(`   - ${v}`));
      process.exit(1);
    }
    throw error;
  }
};

export const config = parseEnv();

// Derived configuration values
export const isProd = config.NODE_ENV === 'production';
export const isDev = config.NODE_ENV === 'development';

// Allowed origins for CORS (deduplicated)
const originSet = new Set([
  config.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3001',
  'http://localhost:8081',
]);
export const allowedOrigins = Array.from(originSet);

// CORS configuration
export const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 100 : 1000, // Limit each IP
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
};

// OTP rate limiting (stricter)
export const otpRateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 OTP requests per minute
  message: {
    success: false,
    message: 'Too many OTP requests, please wait before trying again.',
  },
};
