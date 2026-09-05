const app = require('./app');
const env = require('./config/env');
const { pool, checkHealth } = require('./config/db');
const { migrateSchema } = require('./db/migrate');
const { seedDatabase } = require('./db/seed');

const PORT = env.PORT || 3000;

const startServer = async () => {
  console.log('====================================================');
  console.log(`Starting Secure Grant Portal API in ${env.NODE_ENV} mode...`);
  console.log('====================================================');

  try {
    // 1. Verify DB Connection
    console.log('[Startup] Checking database connectivity...');
    let retries = 5;
    let connected = false;

    while (retries > 0 && !connected) {
      connected = await checkHealth();
      if (!connected) {
        retries -= 1;
        console.log(`[Startup] Database not ready yet, retrying in 2s... (${retries} attempts left)`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (connected) {
      console.log('[Startup] PostgreSQL database connection established.');
      
      // 2. Run Database Migration & Seeding
      try {
        await migrateSchema();
        await seedDatabase();
      } catch (migrationErr) {
        console.error('[Startup] Warning: Auto-migration/seeding encountered an issue:', migrationErr.message);
      }
    } else {
      console.warn('[Startup] PostgreSQL connection could not be verified on startup. Running in degraded mode.');
    }

    // 3. Start Express Server
    const server = app.listen(PORT, () => {
      console.log(`[Server] Secure Grant Portal API listening on http://localhost:${PORT}`);
      console.log(`[Server] Health Check available at http://localhost:${PORT}/api/health`);
    });

    // Graceful Shutdown
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully terminating...`);
      server.close(async () => {
        try {
          await pool.end();
          console.log('[Server] Database pool closed.');
        } catch (e) {
          // ignore
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (error) {
    console.error('[Startup] Critical error during server bootstrap:', error);
    process.exit(1);
  }
};

startServer();
