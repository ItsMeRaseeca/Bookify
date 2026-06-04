/**
 * Admin Service
 * =============
 * Business logic for admin dashboard and operations.
 */

import { prisma } from '../../lib/prisma.js';

/**
 * Get platform-wide metrics for admin dashboard
 */
export async function getMetrics() {
  const [
    totalUsers,
    totalOrganizers,
    totalAdmins,
    totalServices,
    publishedServices,
    totalSlots,
    bookedSlots,
    availableSlots,
    totalBookings,
    successfulBookings,
    failedBookings,
    totalRevenue,
    onlinePayments,
    cashPayments,
    bookedSlotsWithDetails,
  ] = await Promise.all([
    // User counts by role
    prisma.user.count({ where: { role: 'USER', verified: true } }),
    prisma.user.count({ where: { role: 'ORGANIZER', verified: true } }),
    prisma.user.count({ where: { role: 'ADMIN', verified: true } }),

    // Service counts
    prisma.service.count(),
    prisma.service.count({ where: { published: true } }),

    // Slot counts
    prisma.slot.count(),
    prisma.slot.count({ where: { status: 'BOOKED' } }),
    prisma.slot.count({ where: { status: 'AVAILABLE' } }),

    // Booking counts
    prisma.booking.count(),
    prisma.booking.count({ where: { paymentStatus: 'SUCCESS' } }),
    prisma.booking.count({ where: { paymentStatus: 'FAILED' } }),

    // Revenue
    prisma.booking.aggregate({
      where: { paymentStatus: 'SUCCESS' },
      _sum: { amount: true },
    }),

    // Payment mode breakdown
    prisma.booking.count({ where: { paymentMode: 'ONLINE', paymentStatus: 'SUCCESS' } }),
    prisma.booking.count({ where: { paymentMode: 'CASH', paymentStatus: 'SUCCESS' } }),

    // Get all booked slots for analytics
    prisma.slot.findMany({
      where: { status: 'BOOKED' },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        service: { select: { title: true } },
      },
    }),
  ]);

  // Calculate popular day of week
  const dayOfWeekCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dateCounts: Record<string, number> = {};
  const timeSlotCounts: Record<string, { count: number; startTime: string; endTime: string }> = {};

  for (const slot of bookedSlotsWithDetails) {
    const date = new Date(slot.date);
    const dayOfWeek = date.getDay();
    dayOfWeekCounts[dayOfWeek]++;

    const dateStr = date.toISOString().split('T')[0];
    dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;

    const timeKey = `${slot.startTime}-${slot.endTime}`;
    if (!timeSlotCounts[timeKey]) {
      timeSlotCounts[timeKey] = { count: 0, startTime: slot.startTime, endTime: slot.endTime };
    }
    timeSlotCounts[timeKey].count++;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const popularDayOfWeek = Object.entries(dayOfWeekCounts).reduce((a, b) => 
    b[1] > a[1] ? b : a, ['0', 0]
  );
  
  const popularDate = Object.entries(dateCounts).reduce((a, b) => 
    b[1] > a[1] ? b : a, ['', 0]
  );

  const popularTimeSlot = Object.entries(timeSlotCounts).reduce((a, b) => 
    b[1].count > (a[1]?.count || 0) ? b : a, ['', { count: 0, startTime: '', endTime: '' }]
  );

  return {
    users: {
      total: totalUsers + totalOrganizers + totalAdmins,
      users: totalUsers,
      organizers: totalOrganizers,
      admins: totalAdmins,
    },
    services: {
      total: totalServices,
      published: publishedServices,
      unpublished: totalServices - publishedServices,
    },
    slots: {
      total: totalSlots,
      booked: bookedSlots,
      available: availableSlots,
      hold: totalSlots - bookedSlots - availableSlots,
    },
    bookings: {
      total: totalBookings,
      successful: successfulBookings,
      failed: failedBookings,
    },
    revenue: {
      total: totalRevenue._sum.amount || 0,
      onlinePayments,
      cashPayments,
    },
    analytics: {
      popularDayOfWeek: {
        day: dayNames[parseInt(popularDayOfWeek[0])],
        count: popularDayOfWeek[1] as number,
      },
      popularDate: {
        date: popularDate[0],
        count: popularDate[1] as number,
      },
      popularTimeSlot: {
        time: popularTimeSlot[1].startTime && popularTimeSlot[1].endTime 
          ? `${popularTimeSlot[1].startTime} - ${popularTimeSlot[1].endTime}` 
          : 'N/A',
        count: popularTimeSlot[1].count,
      },
      dayOfWeekBreakdown: dayNames.map((name, idx) => ({
        day: name,
        count: dayOfWeekCounts[idx],
      })),
    },
  };
}

/**
 * Get all services (for admin read-only access)
 */
export async function getAllServices(query: { page: number; limit: number }) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            slots: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.service.count(),
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
 * Get all users (for admin)
 */
export async function getAllUsers(query: { page: number; limit: number; role?: string }) {
  const { page, limit, role } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { verified: true };
  if (role && ['USER', 'ORGANIZER', 'ADMIN'].includes(role)) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            services: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get all bookings (for admin)
 */
export async function getAllBookings(query: { page: number; limit: number; status?: string }) {
  const { page, limit, status } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status && ['SUCCESS', 'FAILED'].includes(status)) {
    where.paymentStatus = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            category: true,
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
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get recent activity for admin dashboard
 */
export async function getRecentActivity() {
  const [recentBookings, recentUsers, recentServices] = await Promise.all([
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        service: { select: { title: true } },
      },
    }),
    prisma.user.findMany({
      where: { verified: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.service.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        published: true,
        createdAt: true,
        organizer: { select: { name: true } },
      },
    }),
  ]);

  return {
    recentBookings,
    recentUsers,
    recentServices,
  };
}
