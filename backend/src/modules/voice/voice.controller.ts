/**
 * Voice Agent Controller
 * ======================
 * Backend endpoints for the voice-to-voice assistant.
 * Provides COMPACT context data and booking functionality for Gemini Live.
 */

import { Response, NextFunction, Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { sendBookingConfirmationEmail } from '../../services/email.service.js';
import { sendBookingConfirmationWhatsApp } from '../../services/whatsapp.service.js';
import { formatDate, formatPrice } from '../../lib/utils.js';

/**
 * Get COMPACT context data for voice agent (optimized for speed)
 */
export async function getVoiceContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only fetch next 3 days for voice (keeps context small and fast)
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    // Get published services with available slots (limited for speed)
    const services = await prisma.service.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        city: true,
        address: true,
        organizer: {
          select: {
            name: true,
            phone: true,
          },
        },
        slots: {
          where: {
            status: 'AVAILABLE',
            date: { gte: today, lte: threeDaysLater },
          },
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          take: 8,
        },
      },
      orderBy: { title: 'asc' },
      take: 5,
    });

    // Format services with description and organizer
    let servicesContext = 'No services available.';
    
    if (services.length > 0) {
      servicesContext = services.map(service => {
        const slots = service.slots.map(slot => {
          const d = new Date(slot.date);
          const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
          return `${day} ${slot.startTime}-${slot.endTime} [${slot.id}]`;
        }).join(', ');

        const desc = service.description ? ` - ${service.description.substring(0, 100)}` : '';
        const provider = service.organizer?.name || 'Unknown';

        return `${service.title} by ${provider} | ₹${service.price} | ${service.address}, ${service.city}${desc}\nSlots: ${slots || 'None available'}`;
      }).join('\n\n');
    }

    const bookingCount = await prisma.booking.count({ where: { userId } });

    const todayStr = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    res.json({
      success: true,
      data: { services: servicesContext, bookingCount, todayStr },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Book a slot via voice agent
 */
export async function bookSlotVoice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { slotId } = req.body;

    if (!slotId) {
      res.status(400).json({
        success: false,
        data: { success: false, error: 'Slot ID is required' },
      });
      return;
    }

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        service: { select: { id: true, title: true, price: true, published: true } },
        booking: true,
      },
    });

    if (!slot) {
      res.json({ success: true, data: { success: false, error: 'Slot not found' } });
      return;
    }

    if (!slot.service.published) {
      res.json({ success: true, data: { success: false, error: 'Service not available' } });
      return;
    }

    if (slot.status !== 'AVAILABLE' || slot.booking) {
      res.json({ success: true, data: { success: false, error: 'Slot no longer available' } });
      return;
    }

    const slotDate = new Date(slot.date);
    slotDate.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (slotDate < todayDate) {
      res.json({ success: true, data: { success: false, error: 'Cannot book past slots' } });
      return;
    }

    // Get user details for notifications
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });

    if (!user) {
      res.json({ success: true, data: { success: false, error: 'User not found' } });
      return;
    }

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

    const formattedDate = new Date(slot.date).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    res.json({
      success: true,
      data: {
        success: true,
        bookingId: booking.id,
        service: slot.service.title,
        date: formattedDate,
        time: `${slot.startTime}-${slot.endTime}`,
        amount: `₹${slot.service.price}`,
      },
    });
  } catch (error) {
    next(error);
  }
}
