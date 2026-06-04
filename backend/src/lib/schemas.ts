/**
 * Zod Validation Schemas
 * ======================
 * Central source of truth for all request validation.
 * Strict validation with detailed error messages.
 */

import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

/**
 * Name validation:
 * - 2-50 characters
 * - Only alphabets and spaces
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must not exceed 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces');

/**
 * Email validation:
 * - Strict email format
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim();

/**
 * Password validation:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

/**
 * Indian phone number validation:
 * - 10 digits OR +91 followed by 10 digits
 */
export const phoneSchema = z
  .string()
  .regex(
    /^(\+91)?[6-9]\d{9}$/,
    'Phone must be a valid Indian number (10 digits or +91 followed by 10 digits)'
  )
  .optional();

/**
 * OTP validation:
 * - Exactly 6 digits
 */
export const otpSchema = z
  .string()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only digits');

/**
 * Price validation (INR):
 * - Must be positive
 * - Maximum 2 decimal places
 */
export const priceSchema = z
  .number()
  .positive('Price must be greater than 0')
  .refine(
    (val) => {
      const decimalPlaces = (val.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2;
    },
    { message: 'Price can have maximum 2 decimal places' }
  );

/**
 * CUID validation for IDs
 */
export const idSchema = z.string().cuid('Invalid ID format');

// ============================================
// AUTH SCHEMAS
// ============================================

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  role: z.enum(['USER', 'ORGANIZER']).default('USER'),
}).strict(); // Reject unknown fields

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
}).strict();

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
}).strict();

export const resendOtpSchema = z.object({
  email: emailSchema,
}).strict();

// ============================================
// PASSWORD RESET SCHEMAS
// ============================================

export const forgotPasswordSchema = z.object({
  email: emailSchema,
}).strict();

export const verifyPasswordResetOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
}).strict();

export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
}).strict();

// ============================================
// USER SCHEMAS
// ============================================

export const updateProfileSchema = z.object({
  name: nameSchema,
}).strict();

// ============================================
// SERVICE SCHEMAS
// ============================================

/**
 * Time format: HH:mm (24-hour)
 */
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');

/**
 * Break hours schema
 */
const breakHourSchema = z.object({
  start: timeSchema,
  end: timeSchema,
}).refine(
  (data) => data.start < data.end,
  { message: 'Break end time must be after start time' }
);

/**
 * Date string schema - accepts any valid date string and transforms to ISO
 */
const dateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' }
).transform((val) => new Date(val).toISOString());

/**
 * Per-day schedule schema (for individual day configuration)
 */
const dayConfigSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday, 6 = Saturday
  startTime: timeSchema,
  endTime: timeSchema,
  breaks: z.array(breakHourSchema).optional(),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'End time must be after start time for each day' }
);

/**
 * Service schedule schema - supports per-day configuration
 */
export const scheduleSchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  slotDuration: z.number().int().min(15, 'Slot duration must be at least 15 minutes').max(480, 'Slot duration cannot exceed 8 hours'),
  days: z.array(dayConfigSchema).min(1, 'At least one day must be enabled'),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'End date must be after or equal to start date' }
);

/**
 * Create service schema
 */
export const createServiceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description cannot exceed 2000 characters'),
  category: z.string().min(2, 'Category is required').max(50, 'Category cannot exceed 50 characters'),
  price: priceSchema,
  imageUrl: z.string().url('Invalid image URL').optional(),
  address: z.string().max(200, 'Address cannot exceed 200 characters').optional(),
  city: z.string().max(50, 'City cannot exceed 50 characters').optional(),
  state: z.string().max(50, 'State cannot exceed 50 characters').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  published: z.boolean().optional().default(false),
  schedule: scheduleSchema,
}).strict();

/**
 * Update service schema (partial)
 */
export const updateServiceSchema = createServiceSchema.partial().omit({ schedule: true });

/**
 * Publish/Unpublish service schema
 */
export const publishServiceSchema = z.object({
  published: z.boolean(),
}).strict();

// ============================================
// BOOKING SCHEMAS
// ============================================

export const holdSlotSchema = z.object({
  slotId: idSchema,
}).strict();

export const confirmBookingSchema = z.object({
  slotId: idSchema,
  paymentMode: z.enum(['ONLINE', 'CASH']),
}).strict();

// ============================================
// QUERY SCHEMAS (for GET requests)
// ============================================

export const paginationSchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.enum(['createdAt', 'price', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const serviceSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

// ============================================
// TYPE EXPORTS (inferred from schemas)
// ============================================

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyPasswordResetOtpInput = z.infer<typeof verifyPasswordResetOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type PublishServiceInput = z.infer<typeof publishServiceSchema>;
export type HoldSlotInput = z.infer<typeof holdSlotSchema>;
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
