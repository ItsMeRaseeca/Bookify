/**
 * Booking Service
 * ===============
 * Business logic for booking operations with race-condition safety.
 * Uses Prisma transactions for atomic operations.
 */

import { prisma, type PrismaTransaction } from '../../lib/prisma.js';
import { getHoldExpiry, simulatePayment, formatPrice, formatDate } from '../../lib/utils.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { sendBookingConfirmationEmail } from '../../services/email.service.js';
import { sendBookingConfirmationWhatsApp } from '../../services/whatsapp.service.js';
import { generateReceiptPdf } from '../../services/pdf.service.js';
import type { HoldSlotInput, ConfirmBookingInput } from '../../lib/schemas.js';

// Hold expiry time in minutes
const HOLD_EXPIRY_MINUTES = 5;

/**
 * Hold a slot for booking
 * Uses transaction to prevent race conditions
 */
export async function holdSlot(_userId: string, data: HoldSlotInput) {
  const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
    // Get slot with pessimistic locking simulation
    // Check current status atomically
    const slot = await tx.slot.findUnique({
      where: { id: data.slotId },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            price: true,
            published: true,
          },
        },
      },
    });

    if (!slot) {
      throw new NotFoundError('Slot not found');
    }

    if (!slot.service.published) {
      throw new BadRequestError('Service is not available');
    }

    // Check if slot is available
    if (slot.status !== 'AVAILABLE') {
      if (slot.status === 'HOLD') {
        throw new BadRequestError('Slot is temporarily held by another user');
      }
      throw new BadRequestError('Slot is already booked');
    }

    // Check if date is not in the past
    const slotDate = new Date(slot.date);
    slotDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      throw new BadRequestError('Cannot book slots in the past');
    }

    // Update slot to HOLD status atomically
    const holdExpiry = getHoldExpiry();
    
    const updatedSlot = await tx.slot.update({
      where: {
        id: slot.id,
        status: 'AVAILABLE', // Extra safety: only update if still AVAILABLE
      },
      data: {
        status: 'HOLD',
        holdExpiry,
      },
    });

    return {
      slot: updatedSlot,
      service: slot.service,
      holdExpiry,
      expiresInMinutes: HOLD_EXPIRY_MINUTES,
    };
  });

  return result;
}

/**
 * Confirm a booking
 * Handles both ONLINE (with mock payment) and CASH payment modes
 */
export async function confirmBooking(userId: string, data: ConfirmBookingInput) {
  const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
    // Get slot with service details
    const slot = await tx.slot.findUnique({
      where: { id: data.slotId },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            category: true,
            price: true,
            published: true,
            address: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        },
        booking: true,
      },
    });

    if (!slot) {
      throw new NotFoundError('Slot not found');
    }

    // Check if already booked
    if (slot.booking) {
      throw new BadRequestError('Slot already booked');
    }

    // For ONLINE payment, slot must be in HOLD status
    if (data.paymentMode === 'ONLINE') {
      if (slot.status !== 'HOLD') {
        throw new BadRequestError('Slot must be held before confirming payment');
      }

      // Check if hold has expired
      if (slot.holdExpiry && new Date() > slot.holdExpiry) {
        // Release the slot
        await tx.slot.update({
          where: { id: slot.id },
          data: { status: 'AVAILABLE', holdExpiry: null },
        });
        throw new BadRequestError('Hold expired. Please try again.');
      }
    }

    // For CASH payment, slot can be AVAILABLE or HOLD
    if (data.paymentMode === 'CASH' && slot.status === 'BOOKED') {
      throw new BadRequestError('Slot is already booked');
    }

    // Get user details
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Process payment based on mode
    let paymentStatus: 'SUCCESS' | 'FAILED';

    if (data.paymentMode === 'ONLINE') {
      // Simulate online payment (mock)
      const paymentResult = simulatePayment();
      paymentStatus = paymentResult.success ? 'SUCCESS' : 'FAILED';

      if (!paymentResult.success) {
        // Payment failed - release slot back to available
        await tx.slot.update({
          where: { id: slot.id },
          data: { status: 'AVAILABLE', holdExpiry: null },
        });

        throw new BadRequestError('Payment failed. Please try again.');
      }
    } else {
      // CASH payment - always successful at booking time
      paymentStatus = 'SUCCESS';
    }

    // Create booking
    const booking = await tx.booking.create({
      data: {
        userId,
        serviceId: slot.service.id,
        slotId: slot.id,
        paymentMode: data.paymentMode,
        paymentStatus,
        amount: slot.service.price,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        service: {
          select: {
            id: true,
            title: true,
            category: true,
            address: true,
            city: true,
          },
        },
        slot: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // Update slot to BOOKED
    await tx.slot.update({
      where: { id: slot.id },
      data: { status: 'BOOKED', holdExpiry: null },
    });

    return booking;
  });

  // Send confirmation email (outside transaction)
  try {
    await sendBookingConfirmationEmail({
      to: result.user.email,
      name: result.user.name,
      serviceName: result.service.title,
      date: formatDate(result.slot.date),
      time: `${result.slot.startTime} - ${result.slot.endTime}`,
      amount: formatPrice(result.amount),
      paymentMode: result.paymentMode,
      bookingId: result.id,
    });
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    // Don't fail the booking if email fails
  }

  // Send WhatsApp notification (if phone available)
  if (result.user.phone) {
    try {
      await sendBookingConfirmationWhatsApp({
        phone: result.user.phone,
        name: result.user.name,
        serviceName: result.service.title,
        date: formatDate(result.slot.date),
        time: `${result.slot.startTime} - ${result.slot.endTime}`,
        amount: formatPrice(result.amount),
        paymentMode: result.paymentMode,
        bookingId: result.id,
      });
    } catch (error) {
      console.error('Failed to send WhatsApp confirmation:', error);
      // Don't fail the booking if WhatsApp fails
    }
  }

  return result;
}

/**
 * Cancel a held slot (release hold)
 */
export async function cancelHold(_userId: string, slotId: string) {
  const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
    const slot = await tx.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundError('Slot not found');
    }

    if (slot.status !== 'HOLD') {
      throw new BadRequestError('Slot is not on hold');
    }

    // Release the slot
    const updatedSlot = await tx.slot.update({
      where: { id: slotId },
      data: {
        status: 'AVAILABLE',
        holdExpiry: null,
      },
    });

    return updatedSlot;
  });

  return result;
}

/**
 * Get user's bookings
 */
export async function getUserBookings(userId: string) {
  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: {
      service: {
        select: {
          id: true,
          title: true,
          category: true,
          imageUrl: true,
          address: true,
          city: true,
          state: true,
        },
      },
      slot: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return bookings;
}

/**
 * Get a single booking
 */
export async function getBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      service: {
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          imageUrl: true,
          address: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
        },
      },
      slot: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // Check ownership
  if (booking.userId !== userId) {
    throw new ForbiddenError('Access denied');
  }

  return booking;
}

/**
 * Generate PDF receipt for a booking
 */
export async function generateReceipt(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      service: {
        select: {
          title: true,
          category: true,
          address: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
        },
      },
      slot: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // Check ownership
  if (booking.userId !== userId) {
    throw new ForbiddenError('Access denied');
  }

  // Generate PDF
  const pdfBuffer = await generateReceiptPdf({
    bookingId: booking.id,
    user: booking.user,
    service: booking.service,
    slot: booking.slot,
    amount: booking.amount,
    paymentMode: booking.paymentMode,
    paymentStatus: booking.paymentStatus,
    createdAt: booking.createdAt,
  });

  return {
    buffer: pdfBuffer,
    filename: `receipt-${booking.id}.pdf`,
  };
}

/**
 * Release expired holds and clean up stale pending bookings
 * Should be called periodically (cron job)
 */
export async function releaseExpiredHolds() {
  // 1. Release slots with expired holds (no booking)
  const slotsReleased = await prisma.slot.updateMany({
    where: {
      status: 'HOLD',
      holdExpiry: {
        lt: new Date(),
      },
      booking: null, // Only slots without bookings
    },
    data: {
      status: 'AVAILABLE',
      holdExpiry: null,
    },
  });

  // 2. Find pending bookings with expired hold slots and mark as FAILED
  const stalePendingBookings = await prisma.booking.findMany({
    where: {
      paymentStatus: 'PENDING',
      slot: {
        holdExpiry: {
          lt: new Date(),
        },
      },
    },
    select: { id: true, slotId: true },
  });

  // 3. Update stale pending bookings to FAILED and release their slots
  for (const booking of stalePendingBookings) {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'FAILED' },
      });
      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: 'AVAILABLE', holdExpiry: null },
      });
    });
    console.log(`[Cleanup] Released stale pending booking ${booking.id}`);
  }

  return {
    released: slotsReleased.count + stalePendingBookings.length,
    slotsReleased: slotsReleased.count,
    stalePendingBookings: stalePendingBookings.length,
  };
}

/**
 * Update booking payment status (for PhonePe webhook/status check)
 */
export async function updateBookingPaymentStatus(
  bookingId: string,
  data: { paymentStatus: 'SUCCESS' | 'FAILED'; transactionId?: string }
) {
  let statusChanged = false;
  
  const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        slot: true,
        user: { select: { email: true, name: true, phone: true } },
        service: { select: { title: true } },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Skip if already in final state (prevents duplicate notifications)
    if (booking.paymentStatus === 'SUCCESS' || booking.paymentStatus === 'FAILED') {
      console.log(`[Booking] Booking ${bookingId} already in final state: ${booking.paymentStatus}, skipping update`);
      return booking;
    }
    
    // Mark that we're actually changing the status
    statusChanged = true;

    // Update booking payment status
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: data.paymentStatus,
        ...(data.transactionId && { transactionId: data.transactionId }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, title: true, category: true, address: true, city: true } },
        slot: { select: { id: true, date: true, startTime: true, endTime: true } },
      },
    });

    // Update slot status based on payment result
    if (data.paymentStatus === 'SUCCESS') {
      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: 'BOOKED', holdExpiry: null },
      });
      console.log(`[Booking] Payment SUCCESS for booking ${bookingId} - slot marked as BOOKED`);
    } else if (data.paymentStatus === 'FAILED') {
      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: 'AVAILABLE', holdExpiry: null },
      });
      console.log(`[Booking] Payment FAILED for booking ${bookingId} - slot released`);
    }

    return updatedBooking;
  });

  // Send confirmation email for successful payments (only if status actually changed)
  if (statusChanged && data.paymentStatus === 'SUCCESS') {
    try {
      await sendBookingConfirmationEmail({
        to: result.user.email,
        name: result.user.name,
        serviceName: result.service.title,
        date: formatDate(result.slot.date),
        time: `${result.slot.startTime} - ${result.slot.endTime}`,
        amount: formatPrice(result.amount),
        paymentMode: result.paymentMode,
        bookingId: result.id,
      });
    } catch (error) {
      console.error('Failed to send booking confirmation email:', error);
    }

    // Send WhatsApp notification (if phone available)
    if (result.user.phone) {
      try {
        await sendBookingConfirmationWhatsApp({
          phone: result.user.phone,
          name: result.user.name,
          serviceName: result.service.title,
          date: formatDate(result.slot.date),
          time: `${result.slot.startTime} - ${result.slot.endTime}`,
          amount: formatPrice(result.amount),
          paymentMode: result.paymentMode,
          bookingId: result.id,
        });
      } catch (error) {
        console.error('Failed to send WhatsApp confirmation:', error);
      }
    }
  }

  return result;
}

/**
 * Create a pending booking for PhonePe payment
 * Slot will be held and booking created with PENDING status
 */
export async function createPendingBooking(userId: string, slotId: string) {
  const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
    // Get slot with service details
    const slot = await tx.slot.findUnique({
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
      throw new NotFoundError('Slot not found');
    }

    if (!slot.service.published) {
      throw new BadRequestError('Service is not available');
    }

    // Check if already booked with SUCCESS status
    if (slot.booking && slot.booking.paymentStatus === 'SUCCESS') {
      throw new BadRequestError('Slot already booked');
    }

    // If there's a FAILED or PENDING booking, delete it to allow rebooking
    if (slot.booking && (slot.booking.paymentStatus === 'FAILED' || slot.booking.paymentStatus === 'PENDING')) {
      console.log(`[Booking] Cleaning up previous ${slot.booking.paymentStatus} booking ${slot.booking.id} for slot ${slotId}`);
      await tx.booking.delete({
        where: { id: slot.booking.id },
      });
    }

    // Check if slot is available or on hold (we'll take it)
    if (slot.status === 'BOOKED') {
      throw new BadRequestError('Slot is already booked');
    }

    // Check if date is not in the past
    const slotDate = new Date(slot.date);
    slotDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      throw new BadRequestError('Cannot book slots in the past');
    }

    // Create booking with PENDING status
    const booking = await tx.booking.create({
      data: {
        userId,
        serviceId: slot.service.id,
        slotId: slot.id,
        paymentMode: 'ONLINE',
        paymentStatus: 'PENDING',
        amount: slot.service.price,
      },
    });

    // Update slot to HOLD status
    const holdExpiry = getHoldExpiry();
    await tx.slot.update({
      where: { id: slotId },
      data: {
        status: 'HOLD',
        holdExpiry,
      },
    });

    return {
      booking,
      service: slot.service,
      holdExpiry,
    };
  });

  return result;
}

