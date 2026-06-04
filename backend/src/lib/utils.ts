/**
 * Utility Functions
 * =================
 * Common helper functions used across the application.
 */

import crypto from 'crypto';

/**
 * Generate a random 6-digit OTP
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Calculate OTP expiry time
 */
export function getOtpExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Check if a date has expired
 */
export function isExpired(date: Date): boolean {
  return new Date() > date;
}

/**
 * Parse time string (HH:mm) to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours! * 60 + minutes!;
}

/**
 * Convert minutes from midnight to time string (HH:mm)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Generate slots for a given schedule
 * Takes into account break hours
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDuration: number,
  breakHours: Array<{ start: string; end: string }> = []
): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  // Convert break hours to minutes
  const breaks = breakHours.map((b) => ({
    start: timeToMinutes(b.start),
    end: timeToMinutes(b.end),
  }));

  let currentStart = startMinutes;

  while (currentStart + slotDuration <= endMinutes) {
    const currentEnd = currentStart + slotDuration;

    // Check if this slot overlaps with any break
    const overlapsBreak = breaks.some(
      (breakPeriod) =>
        (currentStart >= breakPeriod.start && currentStart < breakPeriod.end) ||
        (currentEnd > breakPeriod.start && currentEnd <= breakPeriod.end) ||
        (currentStart <= breakPeriod.start && currentEnd >= breakPeriod.end)
    );

    if (!overlapsBreak) {
      slots.push({
        startTime: minutesToTime(currentStart),
        endTime: minutesToTime(currentEnd),
      });
      currentStart = currentEnd;
    } else {
      // Skip to end of overlapping break
      const overlappingBreak = breaks.find(
        (b) => currentStart >= b.start && currentStart < b.end
      );
      if (overlappingBreak) {
        currentStart = overlappingBreak.end;
      } else {
        currentStart += slotDuration;
      }
    }
  }

  return slots;
}

/**
 * Generate all dates between two dates (inclusive)
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Format price to INR currency string
 */
export function formatPrice(price: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `Rs. ${formatted}`;
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Simulate payment processing (mock)
 * Returns success ~70% of the time
 */
export function simulatePayment(): { success: boolean; transactionId: string } {
  const success = Math.random() < 0.7;
  const transactionId = `TXN${Date.now()}${crypto.randomInt(1000, 9999)}`;
  return { success, transactionId };
}

/**
 * Sanitize user object (remove sensitive fields)
 */
export function sanitizeUser<T extends Record<string, unknown>>(user: T): Omit<T, 'password'> {
  const { password: _password, ...sanitized } = user as T & { password?: unknown };
  return sanitized as Omit<T, 'password'>;
}

/**
 * Calculate hold expiry time (5 minutes from now)
 */
export function getHoldExpiry(): Date {
  return new Date(Date.now() + 5 * 60 * 1000);
}
