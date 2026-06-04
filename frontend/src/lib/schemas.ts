import { z } from 'zod';

// Name validation: 2-50 chars, alphabets and spaces only
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must not exceed 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain alphabets and spaces');

// Email validation: RFC-compliant
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(255, 'Email must not exceed 255 characters');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least 1 number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least 1 special character');

// Phone validation: India format
export const phoneSchema = z
  .string()
  .regex(
    /^(\+91)?[6-9]\d{9}$/,
    'Please enter a valid Indian phone number (10 digits or +91 followed by 10 digits)'
  );

// OTP validation: exactly 6 digits
export const otpSchema = z
  .string()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

// Slot duration: positive integer (minutes)
export const slotDurationSchema = z
  .number()
  .int('Duration must be a whole number')
  .positive('Duration must be greater than 0')
  .max(480, 'Duration cannot exceed 8 hours');

// Price validation: float, INR, > 0, up to 2 decimals
export const priceSchema = z
  .number()
  .positive('Price must be greater than 0')
  .refine(
    (val) => {
      const decimalPlaces = (val.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2;
    },
    { message: 'Price can have up to 2 decimal places' }
  );

// Time validation
export const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format');

// Date validation
export const dateSchema = z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date');

// Signup form schema
export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  role: z.enum(['user', 'organizer']),
  password: passwordSchema,
});

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// OTP verification schema
export const otpVerificationSchema = z.object({
  otp: otpSchema,
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Profile update schema
export const profileUpdateSchema = z.object({
  name: nameSchema,
});

// Service creation schema
export const serviceSchema = z.object({
  name: z.string().min(3, 'Service name must be at least 3 characters').max(100, 'Service name too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description too long'),
  slotDuration: slotDurationSchema,
  price: priceSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  isPublished: z.boolean(),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional().or(z.nan().transform(() => undefined)),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional().or(z.nan().transform(() => undefined)),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'Start date must be before end date', path: ['endDate'] }
);

// Day schedule schema
export const dayScheduleSchema = z.object({
  day: z.string(),
  enabled: z.boolean(),
  startTime: timeSchema,
  endTime: timeSchema,
  breaks: z.array(z.object({
    id: z.string(),
    startTime: timeSchema,
    endTime: timeSchema,
  })),
}).refine(
  (data) => !data.enabled || data.startTime < data.endTime,
  { message: 'End time must be after start time', path: ['endTime'] }
);

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type OtpFormData = z.infer<typeof otpVerificationSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
