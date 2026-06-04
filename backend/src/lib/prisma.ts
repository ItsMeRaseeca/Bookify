/**
 * Prisma Client Singleton
 * =======================
 * Creates a single Prisma client instance to be reused across the application.
 * Prevents multiple instances during development hot-reloading.
 */

import { PrismaClient } from '@prisma/client';
import { isDev } from '../config/index.js';

// Export Prisma transaction type for use in services
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Declare global type for Prisma singleton
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create Prisma client with logging in development
export const prisma = globalThis.prisma ?? new PrismaClient({
  log: isDev ? ['query', 'error', 'warn'] : ['error'],
});

// Store in global to prevent multiple instances in development
if (isDev) {
  globalThis.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
