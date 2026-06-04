/**
 * IVR Booking Service
 * ===================
 * Business logic for IVR-based bookings with database context.
 * Handles voice-based appointment booking through Twilio.
 */

import { prisma, type PrismaTransaction } from '../../lib/prisma.js';
import { getHoldExpiry, formatPrice, formatDate } from '../../lib/utils.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import { sendBookingConfirmationEmail } from '../../services/email.service.js';
import { sendBookingConfirmationWhatsApp } from '../../services/whatsapp.service.js';
import type { ServiceForIVR, SlotForIVR, IVRBookingResult, BookingIntent, ConversationState } from './ivr.types.js';
import { normalizePhoneNumber } from './twilio.utils.js';
import { format, parse, startOfDay, addDays, isAfter, isBefore } from 'date-fns';

// Store conversation states per call
const conversationStates = new Map<string, ConversationState>();

// ============================================
// CONVERSATION STATE MANAGEMENT
// ============================================

/**
 * Get or create conversation state for a call
 */
export function getConversationState(callSid: string): ConversationState | undefined {
  return conversationStates.get(callSid);
}

/**
 * Create a new conversation state
 */
export function createConversationState(callSid: string, from: string): ConversationState {
  const state: ConversationState = {
    callSid,
    from,
    messages: [],
    bookingIntent: {},
    createdAt: new Date(),
    lastActivityAt: new Date(),
  };
  conversationStates.set(callSid, state);
  return state;
}

/**
 * Update conversation state
 */
export function updateConversationState(
  callSid: string,
  updates: Partial<ConversationState>
): ConversationState | undefined {
  const state = conversationStates.get(callSid);
  if (!state) return undefined;

  const updatedState = {
    ...state,
    ...updates,
    lastActivityAt: new Date(),
  };
  conversationStates.set(callSid, updatedState);
  return updatedState;
}

/**
 * Clear conversation state
 */
export function clearConversationState(callSid: string): void {
  conversationStates.delete(callSid);
}

// ============================================
// SERVICE DISCOVERY FOR IVR
// ============================================

/**
 * Get all published services formatted for IVR
 */
export async function getServicesForIVR(): Promise<ServiceForIVR[]> {
  try {
    const services = await prisma.service.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        price: true,
        address: true,
        city: true,
      },
      orderBy: { title: 'asc' },
    });
    return services;
  } catch (error) {
    console.error('[IVR] Error getting services:', error);
    return [];
  }
}

/**
 * Format services for voice output
 */
export function formatServicesForVoice(services: ServiceForIVR[]): string {
  if (services.length === 0) {
    return 'Sorry, there are no available services at the moment.';
  }

  if (services.length === 1) {
    const svc = services[0]!;
    return `We have one service available: ${svc.title}. ${svc.description || ''} The price is ${formatPrice(svc.price)}.`;
  }

  let message = `We have ${services.length} services available. `;
  services.slice(0, 5).forEach((svc, index) => {
    message += `${index + 1}. ${svc.title} for ${formatPrice(svc.price)}. `;
  });

  if (services.length > 5) {
    message += `And ${services.length - 5} more services available.`;
  }

  return message;
}

/**
 * Get a service by ID
 */
export async function getServiceById(serviceId: string): Promise<ServiceForIVR | null> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      address: true,
      city: true,
    },
  });
  return service;
}

/**
 * Find service by title (fuzzy match)
 */
export async function findServiceByTitle(searchTerm: string): Promise<ServiceForIVR | null> {
  const services = await prisma.service.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      address: true,
      city: true,
    },
    take: 1,
  });
  return services[0] || null;
}

// ============================================
// SLOT AVAILABILITY FOR IVR
// ============================================

/**
 * Get available slots for a service on a specific date
 */
export async function getAvailableSlotsForIVR(
  serviceId: string,
  date: Date
): Promise<SlotForIVR[]> {
  try {
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);

    const slots = await prisma.slot.findMany({
      where: {
        serviceId,
        status: 'AVAILABLE',
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Filter out past slots for today
    const now = new Date();
    const today = startOfDay(now);
    
    if (dayStart.getTime() === today.getTime()) {
      const currentTime = format(now, 'HH:mm');
      return slots.filter((slot) => slot.startTime > currentTime) as SlotForIVR[];
    }

    return slots as SlotForIVR[];
  } catch (error) {
    console.error('[IVR] Error getting available slots:', error);
    return [];
  }
}

/**
 * Format slots for voice output
 */
export function formatSlotsForVoice(slots: SlotForIVR[], date: Date): string {
  if (slots.length === 0) {
    const dateStr = format(date, 'EEEE, MMMM d, yyyy');
    return `Sorry, there are no available slots on ${dateStr}.`;
  }

  const dateStr = format(date, 'EEEE, MMMM d, yyyy');
  let message = `On ${dateStr}, we have ${slots.length} available slot${slots.length > 1 ? 's' : ''}. `;

  const slotsToList = slots.slice(0, 5);
  slotsToList.forEach((slot, index) => {
    const timeStr = formatTimeForVoice(slot.startTime);
    message += `${index + 1}. ${timeStr}. `;
  });

  if (slots.length > 5) {
    message += `And ${slots.length - 5} more slots available.`;
  }

  return message;
}

/**
 * Format time for voice (e.g., "14:30" -> "2:30 PM")
 */
export function formatTimeForVoice(time: string): string {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours! >= 12 ? 'PM' : 'AM';
    const displayHours = hours! % 12 || 12;
    return `${displayHours}:${minutes!.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time;
  }
}

/**
 * Find slot by time string
 */
export function findSlotByTime(
  slots: SlotForIVR[],
  timeInput: string
): SlotForIVR | null {
  const normalized = timeInput.toLowerCase().trim();

  for (const slot of slots) {
    const slotTimeVoice = formatTimeForVoice(slot.startTime).toLowerCase();
    const slotTime24 = slot.startTime;

    // Check various formats
    if (
      normalized.includes(slotTimeVoice) ||
      normalized.includes(slotTime24) ||
      normalized.includes(slotTime24.replace(':', ' '))
    ) {
      return slot;
    }

    // Check for just the hour
    const [hours] = slot.startTime.split(':').map(Number);
    const hour12 = hours! % 12 || 12;
    if (
      normalized.includes(`${hour12} pm`) ||
      normalized.includes(`${hour12} am`) ||
      normalized.includes(`${hours}`)
    ) {
      return slot;
    }
  }

  return null;
}

/**
 * Parse date from natural language
 */
export function parseDateFromInput(input: string): Date | null {
  const normalized = input.toLowerCase().trim();
  const today = startOfDay(new Date());

  if (normalized.includes('today')) {
    return today;
  }

  if (normalized.includes('tomorrow')) {
    return addDays(today, 1);
  }

  // Try to parse day names
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < dayNames.length; i++) {
    if (normalized.includes(dayNames[i]!)) {
      let daysToAdd = (i - today.getDay() + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // Next week's same day
      return addDays(today, daysToAdd);
    }
  }

  // Try to parse as date string (YYYY-MM-DD, MM/DD/YYYY, etc.)
  try {
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return startOfDay(parsed);
    }
  } catch {
    // Ignore parsing error
  }

  return null;
}

// ============================================
// USER MANAGEMENT FOR IVR
// ============================================

/**
 * Find or create user by phone number
 */
export async function findOrCreateUserByPhone(
  phone: string,
  name?: string
): Promise<{ id: string; name: string; email: string; phone: string | null } | null> {
  const normalizedPhone = normalizePhoneNumber(phone);

  try {
    // First, try to find existing user
    let user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (user) {
      // Update name if provided and different
      if (name && name.trim() && name.toLowerCase() !== user.name.toLowerCase()) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: name.trim() },
          select: { id: true, name: true, email: true, phone: true },
        });
      }
      return user;
    }

    // Create guest user
    const guestEmail = `guest_${normalizedPhone.replace(/\D/g, '')}@ivr.booking`;
    const userName = name?.trim() || 'IVR Guest';

    user = await prisma.user.create({
      data: {
        email: guestEmail,
        password: '', // Empty password - they can set one later if they want
        name: userName,
        phone: normalizedPhone,
        role: 'USER',
        verified: false,
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    console.log(`[IVR] Created guest user for phone: ${normalizedPhone}`);
    return user;
  } catch (error) {
    console.error('[IVR] Error finding/creating user:', error);
    return null;
  }
}

// ============================================
// BOOKING CREATION
// ============================================

/**
 * Create booking from IVR intent
 */
export async function createBookingFromIntent(
  intent: BookingIntent,
  callSid: string,
  from: string
): Promise<IVRBookingResult> {
  try {
    // Validate required fields
    if (!intent.serviceId || !intent.date || !intent.time) {
      return { success: false, error: 'Missing required booking information' };
    }

    // Get service
    const service = await prisma.service.findUnique({
      where: { id: intent.serviceId },
      select: { id: true, title: true, price: true, published: true },
    });

    if (!service) {
      return { success: false, error: 'Service not found' };
    }

    if (!service.published) {
      return { success: false, error: 'Service is not available for booking' };
    }

    // Parse date
    const bookingDate = parseDateFromInput(intent.date) || new Date(intent.date);
    if (!bookingDate || isNaN(bookingDate.getTime())) {
      return { success: false, error: 'Invalid date provided' };
    }

    // Validate date is not in the past
    if (isBefore(bookingDate, startOfDay(new Date()))) {
      return { success: false, error: 'Cannot book appointments in the past' };
    }

    // Get available slots
    const slots = await getAvailableSlotsForIVR(intent.serviceId, bookingDate);
    if (slots.length === 0) {
      return { success: false, error: 'No available slots on the selected date' };
    }

    // Find the selected slot
    const selectedSlot = findSlotByTime(slots, intent.time);
    if (!selectedSlot) {
      return { success: false, error: 'The selected time slot is no longer available' };
    }

    // Find or create user
    const user = await findOrCreateUserByPhone(from, intent.userName);
    if (!user) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Create booking in transaction
    const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
      // Double-check slot availability
      const slot = await tx.slot.findUnique({
        where: { id: selectedSlot.id },
      });

      if (!slot || slot.status !== 'AVAILABLE') {
        throw new BadRequestError('Slot is no longer available');
      }

      // Create booking
      const booking = await tx.booking.create({
        data: {
          userId: user.id,
          serviceId: intent.serviceId!,
          slotId: selectedSlot.id,
          paymentMode: 'CASH', // IVR bookings default to cash
          paymentStatus: 'PENDING', // Will be paid at location
          amount: service.price,
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          service: { select: { id: true, title: true, address: true, city: true } },
          slot: { select: { date: true, startTime: true, endTime: true } },
        },
      });

      // Update slot to BOOKED
      await tx.slot.update({
        where: { id: selectedSlot.id },
        data: { status: 'BOOKED', holdExpiry: null },
      });

      return booking;
    });

    // Send notifications (non-blocking)
    sendNotifications(result).catch(console.error);

    const dateStr = format(result.slot.date, 'EEEE, MMMM d, yyyy');
    const timeStr = formatTimeForVoice(result.slot.startTime);

    return {
      success: true,
      bookingId: result.id,
      message: `Your appointment for ${result.service.title} is scheduled for ${dateStr} at ${timeStr}. Payment of ${formatPrice(result.amount)} will be collected when you arrive.`,
    };
  } catch (error) {
    console.error('[IVR] Error creating booking:', error);
    
    if (error instanceof BadRequestError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An error occurred while creating your booking' };
  }
}

/**
 * Send booking notifications
 */
async function sendNotifications(booking: {
  id: string;
  amount: number;
  paymentMode: string;
  user: { name: string; email: string; phone: string | null };
  service: { title: string; address: string | null; city: string | null };
  slot: { date: Date; startTime: string; endTime: string };
}) {
  // Send email
  try {
    await sendBookingConfirmationEmail({
      to: booking.user.email,
      name: booking.user.name,
      serviceName: booking.service.title,
      date: formatDate(booking.slot.date),
      time: `${booking.slot.startTime} - ${booking.slot.endTime}`,
      amount: formatPrice(booking.amount),
      paymentMode: booking.paymentMode as 'ONLINE' | 'CASH',
      bookingId: booking.id,
    });
  } catch (error) {
    console.error('[IVR] Failed to send email:', error);
  }

  // Send WhatsApp
  if (booking.user.phone) {
    try {
      await sendBookingConfirmationWhatsApp({
        phone: booking.user.phone,
        name: booking.user.name,
        serviceName: booking.service.title,
        date: formatDate(booking.slot.date),
        time: `${booking.slot.startTime} - ${booking.slot.endTime}`,
        amount: formatPrice(booking.amount),
        paymentMode: booking.paymentMode as 'ONLINE' | 'CASH',
        bookingId: booking.id,
      });
    } catch (error) {
      console.error('[IVR] Failed to send WhatsApp:', error);
    }
  }
}

// ============================================
// SYSTEM PROMPT GENERATION
// ============================================

/**
 * Generate system prompt with current context
 */
export async function generateSystemPrompt(): Promise<string> {
  try {
    const services = await getServicesForIVR();
    const servicesText = formatServicesForVoice(services);
    const now = new Date();
    const today = format(now, 'EEEE, MMMM d, yyyy');
    const currentTime = format(now, 'h:mm a');

    return `You are a fast, efficient appointment booking assistant for our service booking platform. Users are in a hurry - be QUICK and CONCISE.

Current date and time: ${today} at ${currentTime}

Available services:
${servicesText}

CRITICAL: Users are busy. Keep responses SHORT (1-2 sentences max). No long explanations. Get straight to the point.

Your process:
1. Quick greeting: "Hello! I can help you book an appointment. What service would you like?"
2. If booking: Ask ONLY - service type, date, time, and name. Nothing else.
3. If checking availability: Ask service type and date, then list available times immediately.
4. Verify briefly: "Confirm: [service] on [date] at [time] for [name]?"
5. Book immediately when confirmed.

Rules:
- Keep every response under 15 words when possible
- Skip pleasantries after the first greeting
- No explanations unless asked
- Payment is cash on arrival - mention once, then move on
- Do NOT ask for phone or email - automatically captured from caller ID
- Speak fast but clearly
- Get to booking ASAP - users are in a hurry

When booking, collect ONLY:
- Service type (match to available services)
- Date and time
- Name

Be direct. Be fast. Get it done.`;
  } catch (error) {
    console.error('[IVR] Error generating system prompt:', error);
    return 'You are a helpful appointment booking assistant. Help users check availability and book appointments.';
  }
}

// ============================================
// INTENT EXTRACTION
// ============================================

/**
 * Extract booking intent from conversation using AI
 */
export async function extractBookingIntent(
  callSid: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  availableServices: ServiceForIVR[]
): Promise<Partial<BookingIntent>> {
  try {
    // Simple pattern-based extraction (can be enhanced with AI later)
    const fullConversation = conversationHistory
      .map((m) => m.content)
      .join(' ')
      .toLowerCase();

    const intent: Partial<BookingIntent> = {};

    // Extract service
    for (const service of availableServices) {
      if (
        fullConversation.includes(service.title.toLowerCase()) ||
        fullConversation.includes(service.category.toLowerCase())
      ) {
        intent.serviceId = service.id;
        break;
      }
    }

    // Extract date
    if (fullConversation.includes('today')) {
      intent.date = format(new Date(), 'yyyy-MM-dd');
    } else if (fullConversation.includes('tomorrow')) {
      intent.date = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    }

    // Extract time (basic pattern)
    const timeMatch = fullConversation.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      intent.time = timeMatch[0];
    }

    // Extract name
    const namePatterns = [
      /(?:my name is|i'm|i am|this is|it's|call me|name's)\s+([a-z]+(?:\s+[a-z]+)?)/i,
    ];
    for (const pattern of namePatterns) {
      const match = fullConversation.match(pattern);
      if (match && match[1]) {
        intent.userName = match[1].trim();
        break;
      }
    }

    // Check for confirmation
    if (
      fullConversation.includes('yes') ||
      fullConversation.includes('confirm') ||
      fullConversation.includes('book it') ||
      fullConversation.includes('proceed')
    ) {
      intent.confirmed = true;
    }

    return intent;
  } catch (error) {
    console.error(`[IVR ${callSid}] Error extracting intent:`, error);
    return {};
  }
}

