/**
 * Service Module - Service Layer
 * ==============================
 * Business logic for service management (ORGANIZER operations).
 */

import { prisma, type PrismaTransaction } from '../../lib/prisma.js';
import { generateTimeSlots, getDateRange } from '../../lib/utils.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../lib/errors.js';
import type { CreateServiceInput, UpdateServiceInput, PublishServiceInput, PaginationInput } from '../../lib/schemas.js';

/**
 * Create a new service with schedule and slots
 */
export async function createService(organizerId: string, data: CreateServiceInput) {
  const { schedule, published, ...serviceData } = data;

  // Use transaction to ensure data integrity
  const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
    // Create service
    const service = await tx.service.create({
      data: {
        ...serviceData,
        organizerId,
        published: published || false,
      },
    });

    // Get first enabled day for schedule record (for backward compatibility)
    const firstDay = schedule.days[0]!;

    // Create schedule (store first day's times for backward compatibility)
    const serviceSchedule = await tx.serviceSchedule.create({
      data: {
        serviceId: service.id,
        startDate: new Date(schedule.startDate),
        endDate: new Date(schedule.endDate),
        startTime: firstDay.startTime,
        endTime: firstDay.endTime,
        slotDuration: schedule.slotDuration,
        breakHours: firstDay.breaks || [],
      },
    });

    // Generate all dates in the range
    const dateRange = getDateRange(
      new Date(schedule.startDate),
      new Date(schedule.endDate)
    );

    // Create a map of dayOfWeek -> day configuration for quick lookup
    const dayConfigMap = new Map(
      schedule.days.map((day) => [day.dayOfWeek, day])
    );

    // Generate slots only for enabled days with their specific times
    const slotsToCreate: Array<{
      serviceId: string;
      date: Date;
      startTime: string;
      endTime: string;
      status: 'AVAILABLE';
    }> = [];

    for (const date of dateRange) {
      const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const dayConfig = dayConfigMap.get(dayOfWeek);

      // Skip if this day of week is not enabled
      if (!dayConfig) continue;

      // Generate time slots for this specific day's configuration
      const timeSlots = generateTimeSlots(
        dayConfig.startTime,
        dayConfig.endTime,
        schedule.slotDuration,
        dayConfig.breaks || []
      );

      // Add slots for this date
      for (const slot of timeSlots) {
        slotsToCreate.push({
          serviceId: service.id,
          date: date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'AVAILABLE' as const,
        });
      }
    }

    // Batch create slots
    if (slotsToCreate.length > 0) {
      await tx.slot.createMany({
        data: slotsToCreate,
      });
    }

    return {
      service,
      schedule: serviceSchedule,
      slotsCreated: slotsToCreate.length,
    };
  });

  return result;
}

/**
 * Get all services for an organizer
 */
export async function getOrganizerServices(organizerId: string) {
  const services = await prisma.service.findMany({
    where: { organizerId },
    include: {
      schedules: true,
      _count: {
        select: {
          slots: true,
          bookings: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return services;
}

/**
 * Get a specific service owned by organizer
 */
export async function getOrganizerService(organizerId: string, serviceId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      schedules: true,
      slots: {
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      },
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!service) {
    throw new NotFoundError('Service not found');
  }

  if (service.organizerId !== organizerId) {
    throw new ForbiddenError('You do not have access to this service');
  }

  return service;
}

/**
 * Update a service
 */
export async function updateService(
  organizerId: string,
  serviceId: string,
  data: UpdateServiceInput
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new NotFoundError('Service not found');
  }

  if (service.organizerId !== organizerId) {
    throw new ForbiddenError('You do not have access to this service');
  }

  const updatedService = await prisma.service.update({
    where: { id: serviceId },
    data,
    include: {
      schedules: true,
    },
  });

  return updatedService;
}

/**
 * Publish or unpublish a service
 */
export async function publishService(
  organizerId: string,
  serviceId: string,
  data: PublishServiceInput
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      schedules: true,
      slots: {
        where: { status: 'AVAILABLE' },
        take: 1,
      },
    },
  });

  if (!service) {
    throw new NotFoundError('Service not found');
  }

  if (service.organizerId !== organizerId) {
    throw new ForbiddenError('You do not have access to this service');
  }

  // Can't publish without schedule
  if (data.published && service.schedules.length === 0) {
    throw new BadRequestError('Cannot publish service without a schedule');
  }

  // Can't publish without available slots
  if (data.published && service.slots.length === 0) {
    throw new BadRequestError('Cannot publish service without available slots');
  }

  const updatedService = await prisma.service.update({
    where: { id: serviceId },
    data: { published: data.published },
  });

  return updatedService;
}

/**
 * Delete a service
 */
export async function deleteService(organizerId: string, serviceId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      bookings: {
        where: {
          paymentStatus: 'SUCCESS',
        },
        take: 1,
      },
    },
  });

  if (!service) {
    throw new NotFoundError('Service not found');
  }

  if (service.organizerId !== organizerId) {
    throw new ForbiddenError('You do not have access to this service');
  }

  // Cannot delete service with confirmed bookings
  if (service.bookings.length > 0) {
    throw new BadRequestError('Cannot delete service with confirmed bookings');
  }

  // Delete service (cascades to slots, schedules, and unconfirmed bookings)
  await prisma.service.delete({
    where: { id: serviceId },
  });

  return { message: 'Service deleted successfully' };
}

/**
 * Get organizer dashboard stats
 */
export async function getOrganizerStats(organizerId: string) {
  const [
    totalServices,
    publishedServices,
    totalBookings,
    totalRevenue,
  ] = await Promise.all([
    prisma.service.count({ where: { organizerId } }),
    prisma.service.count({ where: { organizerId, published: true } }),
    prisma.booking.count({
      where: {
        service: { organizerId },
        paymentStatus: 'SUCCESS',
      },
    }),
    prisma.booking.aggregate({
      where: {
        service: { organizerId },
        paymentStatus: 'SUCCESS',
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalServices,
    publishedServices,
    unpublishedServices: totalServices - publishedServices,
    totalBookings,
    totalRevenue: totalRevenue._sum.amount || 0,
  };
}

/**
 * Get organizer calendar bookings for a specific month
 */
export async function getOrganizerCalendarBookings(
  organizerId: string,
  year: number,
  month: number
) {
  // Create date range for the month
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Last day of month

  const bookings = await prisma.booking.findMany({
    where: {
      service: { organizerId },
      paymentStatus: 'SUCCESS',
      slot: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
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
          category: true,
          price: true,
        },
      },
      slot: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: [
      { slot: { date: 'asc' } },
      { slot: { startTime: 'asc' } },
    ],
  });

  // Group bookings by date
  const bookingsByDate: Record<string, typeof bookings> = {};
  
  for (const booking of bookings) {
    const dateStr = new Date(booking.slot.date).toISOString().split('T')[0]!;
    if (!bookingsByDate[dateStr]) {
      bookingsByDate[dateStr] = [];
    }
    bookingsByDate[dateStr].push(booking);
  }

  return {
    year,
    month,
    bookingsByDate,
    totalBookings: bookings.length,
  };
}

// ============================================
// PUBLIC SERVICE DISCOVERY
// ============================================

/**
 * Get all published services (for users)
 */
export async function getPublishedServices(query: PaginationInput) {
  const { page, limit, search, category, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {
    published: true,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category = category;
  }

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
        schedules: true,
        _count: {
          select: {
            slots: {
              where: { status: 'AVAILABLE' },
            },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.service.count({ where }),
  ]);

  return {
    services,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single published service with available slots
 */
export async function getPublishedService(serviceId: string, date?: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
        },
      },
      schedules: true,
    },
  });

  if (!service) {
    throw new NotFoundError('Service not found');
  }

  if (!service.published) {
    throw new NotFoundError('Service not found');
  }

  // Get slots - optionally filtered by date
  // For date comparison, we need to handle timezone issues
  // We'll query all slots and filter in memory for now, or use a date range
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  
  // Also handle if slots were stored in local timezone (IST = UTC+5:30)
  // By setting the range to start from yesterday 18:30 UTC (which is today 00:00 IST)
  const todayStartIST = new Date(todayStart);
  todayStartIST.setUTCHours(-6, 0, 0, 0); // Roughly covers IST timezone offset
  
  // Fetch ALL slots (including BOOKED) so frontend can show them greyed out
  let slotWhere: Record<string, unknown> = {
    serviceId,
    date: { gte: todayStartIST }, // Use earlier time to account for timezone
  };

  if (date) {
    // Parse the date string (yyyy-MM-dd) 
    const [year, month, day] = date.split('-').map(Number);
    
    // Create date range that covers the entire day regardless of timezone
    // Start: target date at 00:00 UTC - 12 hours (to cover all timezones)
    // End: target date at 00:00 UTC + 36 hours (to cover all timezones)
    const targetStart = new Date(Date.UTC(year!, month! - 1, day!, 0, 0, 0, 0));
    targetStart.setUTCHours(-12); // Go back 12 hours
    
    const targetEnd = new Date(Date.UTC(year!, month! - 1, day!, 0, 0, 0, 0));
    targetEnd.setUTCHours(36); // Go forward 36 hours
    
    slotWhere = {
      serviceId,
      date: {
        gte: targetStart,
        lt: targetEnd,
      },
    };
  }

  const slots = await prisma.slot.findMany({
    where: slotWhere,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  // Group slots by date
  // Use a helper to extract the date part regardless of timezone
  type SlotType = (typeof slots)[number];
  const slotsByDate: Record<string, SlotType[]> = {};
  
  for (const slot of slots) {
    // Get date in both UTC and local format to handle both storage methods
    const utcDate = slot.date.toISOString().split('T')[0]!;
    // Also check the date as it would appear in IST (+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in ms
    const istDate = new Date(slot.date.getTime() + istOffset).toISOString().split('T')[0]!;
    
    // If a specific date was requested, use that as the key if it matches either format
    let dateKey = utcDate;
    if (date) {
      if (date === utcDate || date === istDate) {
        dateKey = date;
      } else {
        // Skip slots that don't match the requested date
        continue;
      }
    }
    
    if (!slotsByDate[dateKey]) {
      slotsByDate[dateKey] = [];
    }
    slotsByDate[dateKey]!.push(slot);
  }

  return {
    ...service,
    slotsByDate,
  };
}

/**
 * Get all unique categories
 */
export async function getCategories() {
  const categories = await prisma.service.findMany({
    where: { published: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return categories.map((c: { category: string }) => c.category);
}
