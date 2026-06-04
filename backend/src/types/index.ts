/**
 * Type Definitions
 * ================
 * Global TypeScript type definitions.
 */

// Define UserRole type (matches Prisma schema)
export type UserRole = 'USER' | 'ORGANIZER' | 'ADMIN';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
      };
    }
  }
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// OTP Email params
export interface OtpEmailParams {
  to: string;
  name: string;
  otp: string;
  expiryMinutes: number;
}

// Upload result
export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

// Time slot
export interface TimeSlot {
  startTime: string;
  endTime: string;
}

// Break hour
export interface BreakHour {
  start: string;
  end: string;
}
