/**
 * Server Entry Point
 * ==================
 * Application bootstrap and server startup.
 */

import 'dotenv/config';

import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './lib/prisma.js';
import { releaseExpiredHolds } from './modules/booking/booking.service.js';

const PORT = config.PORT;

/**
 * Start the server
 */
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start the server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`   Environment: ${config.NODE_ENV}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });

    // Setup periodic cleanup of expired holds (every minute)
    setInterval(async () => {
      try {
        const result = await releaseExpiredHolds();
        if (result.released > 0) {
          console.log(`🧹 Released ${result.released} expired slot holds`);
        }
      } catch (error) {
        console.error('Error releasing expired holds:', error);
      }
    }, 60 * 1000); // Run every minute

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
start();
