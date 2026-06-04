/**
 * User Service
 * ============
 * Business logic for user profile operations.
 */

import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import type { UpdateProfileInput } from '../../lib/schemas.js';

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      verified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

/**
 * Update user profile
 * Only name can be updated
 */
export async function updateUserProfile(userId: string, data: UpdateProfileInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      verified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
}

/**
 * Get user bookings
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
