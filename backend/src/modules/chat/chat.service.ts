/**
 * Chat Service - AI-powered Service Assistant
 * ============================================
 * Uses OpenAI Agents SDK with Groq provider to help users discover and book services.
 * All service/slot data is embedded in the system prompt for natural conversation.
 */

import { Agent, run, tool } from '@openai/agents';
import { aisdk } from '@openai/agents-extensions';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { sendBookingConfirmationEmail } from '../../services/email.service.js';
import { sendBookingConfirmationWhatsApp } from '../../services/whatsapp.service.js';
import { formatDate, formatPrice } from '../../lib/utils.js';

// Initialize Groq provider
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Store current user context for tool execution
let currentUserId: string | null = null;

// Tool: Book a slot for the user (the ONLY tool needed)
const bookSlot = tool({
  name: 'book_slot',
  description: 'Book a specific time slot for the user. Use this ONLY when user confirms they want to book. This creates a booking with CASH payment method.',
  parameters: z.object({
    slotId: z.string().describe('The exact slot ID from the available slots data'),
  }),
  execute: async ({ slotId }) => {
    const userId = currentUserId;

    if (!userId) {
      return { success: false, error: 'User not authenticated. Please log in to book.' };
    }

    try {
      // Get slot with service details
      const slot = await prisma.slot.findUnique({
        where: { id: slotId },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              price: true,
              published: true,
            },
          },
          booking: true,
        },
      });

      if (!slot) {
        return { success: false, error: 'Slot not found. Please check the slot ID.' };
      }

      if (!slot.service.published) {
        return { success: false, error: 'Service is not available' };
      }

      if (slot.status !== 'AVAILABLE' || slot.booking) {
        return { success: false, error: 'This slot is no longer available. Please choose another time.' };
      }

      // Check if date is not in the past
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (slotDate < today) {
        return { success: false, error: 'Cannot book slots in the past' };
      }

      // Get user details for notifications
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, phone: true },
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Create booking with CASH payment
      const booking = await prisma.$transaction(async (tx) => {
        const newBooking = await tx.booking.create({
          data: {
            userId,
            serviceId: slot.service.id,
            slotId: slot.id,
            paymentMode: 'CASH',
            paymentStatus: 'SUCCESS',
            amount: slot.service.price,
          },
        });

        await tx.slot.update({
          where: { id: slotId },
          data: { status: 'BOOKED', holdExpiry: null },
        });

        return newBooking;
      });

      // Send confirmation email
      try {
        await sendBookingConfirmationEmail({
          to: user.email,
          name: user.name,
          serviceName: slot.service.title,
          date: formatDate(slot.date),
          time: `${slot.startTime} - ${slot.endTime}`,
          amount: formatPrice(slot.service.price),
          paymentMode: 'CASH',
          bookingId: booking.id,
        });
      } catch (error) {
        console.error('Failed to send booking confirmation email:', error);
      }

      // Send WhatsApp notification
      if (user.phone) {
        try {
          await sendBookingConfirmationWhatsApp({
            phone: user.phone,
            name: user.name,
            serviceName: slot.service.title,
            date: formatDate(slot.date),
            time: `${slot.startTime} - ${slot.endTime}`,
            amount: formatPrice(slot.service.price),
            paymentMode: 'CASH',
            bookingId: booking.id,
          });
        } catch (error) {
          console.error('Failed to send WhatsApp confirmation:', error);
        }
      }

      // Format the date nicely
      const bookingDate = new Date(slot.date);
      const formattedDate = bookingDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return {
        success: true,
        bookingId: booking.id,
        service: slot.service.title,
        date: formattedDate,
        time: `${slot.startTime} - ${slot.endTime}`,
        amount: `₹${slot.service.price}`,
        paymentMode: 'Cash on arrival',
      };
    } catch (error) {
      console.error('Booking error:', error);
      return { success: false, error: 'Failed to create booking. Please try again.' };
    }
  },
});

/**
 * Fetch all services with their available slots for the next 14 days
 */
async function getServicesContext(): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

  const services = await prisma.service.findMany({
    where: { published: true },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      price: true,
      address: true,
      city: true,
      state: true,
      slots: {
        where: {
          status: 'AVAILABLE',
          date: {
            gte: today,
            lte: twoWeeksLater,
          },
        },
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      },
    },
    orderBy: { title: 'asc' },
  });

  if (services.length === 0) {
    return 'NO SERVICES AVAILABLE: There are currently no published services.';
  }

  // Format services data for the prompt
  const servicesData = services.map(service => {
    // Group slots by date
    const slotsByDate: Record<string, Array<{ id: string; time: string }>> = {};
    
    for (const slot of service.slots) {
      const dateStr = new Date(slot.date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      
      if (!slotsByDate[dateStr]) {
        slotsByDate[dateStr] = [];
      }
      
      slotsByDate[dateStr].push({
        id: slot.id,
        time: `${slot.startTime} - ${slot.endTime}`,
      });
    }

    const slotsInfo = Object.entries(slotsByDate)
      .map(([date, slots]) => {
        const slotsList = slots.map(s => `    - ${s.time} (Slot ID: ${s.id})`).join('\n');
        return `  ${date}:\n${slotsList}`;
      })
      .join('\n');

    return `
SERVICE: ${service.title}
- ID: ${service.id}
- Category: ${service.category}
- Price: ₹${service.price}
- Location: ${service.address}, ${service.city}, ${service.state}
- Description: ${service.description || 'No description'}
- Available Slots (${service.slots.length} total):
${slotsInfo || '  No available slots'}
`;
  }).join('\n---\n');

  return servicesData;
}

/**
 * Get user's existing bookings
 */
async function getUserBookingsContext(userId: string): Promise<string> {
  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: {
      service: {
        select: { title: true, category: true },
      },
      slot: {
        select: { date: true, startTime: true, endTime: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (bookings.length === 0) {
    return 'USER BOOKINGS: No bookings yet.';
  }

  const bookingsData = bookings.map(b => {
    const date = new Date(b.slot.date).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `- ${b.service.title} (${b.service.category}) on ${date} at ${b.slot.startTime} - ${b.slot.endTime} | ₹${b.amount} | ${b.paymentMode} | Status: ${b.paymentStatus}`;
  }).join('\n');

  return `USER'S RECENT BOOKINGS:\n${bookingsData}`;
}

/**
 * Build the dynamic system prompt with all context
 */
async function buildSystemPrompt(userId: string): Promise<string> {
  const [servicesContext, bookingsContext] = await Promise.all([
    getServicesContext(),
    getUserBookingsContext(userId),
  ]);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `You are Bookify Assistant, a friendly and proactive AI assistant for Bookify - a service booking platform.

TODAY'S DATE: ${todayStr}

=== AVAILABLE SERVICES & SLOTS ===
${servicesContext}

=== ${bookingsContext} ===

PERSONALITY & BEHAVIOR:
- Be warm, friendly, and PROACTIVE - don't wait for users to ask what you can do
- On first interaction or greetings (hi, hello, hey, etc.), introduce yourself briefly and immediately mention what services are available
- Use emojis sparingly to keep it friendly 😊
- Keep responses concise but helpful

CONVERSATION FLOW:
1. GREETING: When user greets you, respond warmly AND proactively share available services
   Example: "Hey there! 👋 I'm your Bookify Assistant. I can help you book appointments! Right now we have [service name] available for ₹[price]. Would you like to know more?"

2. SERVICE INTEREST: When user shows interest, share key details (price, location, description) and show available dates/times
   
3. SLOT SELECTION: When user picks a date/time, confirm the EXACT slot details before booking
   Example: "Great choice! Just to confirm - you want to book [Service] on [Date] at [StartTime - EndTime] for ₹[Price]. Should I book this for you?"

4. BOOKING: Only call book_slot AFTER user explicitly confirms (yes, confirm, book it, etc.)

5. POST-BOOKING: Congratulate them and remind about cash payment on arrival

CRITICAL BOOKING RULES:
⚠️ ALWAYS book exactly ONE slot per booking request
⚠️ Each slot has a specific start and end time (e.g., "09:30 - 10:00" is ONE slot)
⚠️ When user says a time like "9:30 to 10" or "9:30-10:00", match it to the SINGLE slot that starts at 09:30
⚠️ NEVER book multiple slots unless user explicitly asks for multiple appointments
⚠️ Always confirm the exact slot before calling book_slot
⚠️ Use the EXACT Slot ID from the data above when booking

WHAT YOU KNOW:
- All services, their prices, locations, and descriptions
- All available time slots with their exact Slot IDs
- User's previous bookings (if any)

WHAT YOU CAN DO:
- Answer questions about services
- Help users find suitable time slots
- Book ONE slot at a time using the book_slot tool (CASH payment only)

If no slots are available for a requested date, suggest alternative dates from the available slots.`;
}

// Store conversation histories in memory (session-based)
const conversationHistories = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

/**
 * Process a chat message and return the assistant's response
 */
export async function processMessage(
  sessionId: string,
  userId: string,
  message: string
): Promise<string> {
  // Set current user context for the booking tool
  currentUserId = userId;

  // Build dynamic system prompt with fresh data
  const systemPrompt = await buildSystemPrompt(userId);

  // Create agent with dynamic instructions
  const bookingAgent = new Agent({
    name: 'Bookify Assistant',
    model: aisdk(groq('meta-llama/llama-4-scout-17b-16e-instruct')),
    instructions: systemPrompt,
    tools: [bookSlot],
  });

  // Get or create conversation history
  if (!conversationHistories.has(sessionId)) {
    conversationHistories.set(sessionId, []);
  }

  const history = conversationHistories.get(sessionId)!;

  // Add user message to history
  history.push({ role: 'user', content: message });

  // Build the conversation for the agent
  const conversationContext = history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  try {
    // Run the agent
    const result = await run(bookingAgent, conversationContext);

    // Extract the final response
    const response = result.finalOutput || "I'm sorry, I couldn't process that. Could you please try again?";

    // Add assistant response to history
    history.push({ role: 'assistant', content: response });

    // Keep history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    return response;
  } catch (error) {
    console.error('Chat agent error:', error);
    return "I'm having trouble processing your request right now. Please try again in a moment.";
  } finally {
    // Clear current user context
    currentUserId = null;
  }
}

/**
 * Clear conversation history for a session
 */
export function clearConversation(sessionId: string): void {
  conversationHistories.delete(sessionId);
}
