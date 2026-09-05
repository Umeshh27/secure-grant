const { checkHealth: checkDbHealth } = require('../config/db');
const { cache } = require('../config/redis');

const HealthController = {
  /**
   * Health check endpoint for container orchestrators and evaluation
   * GET /api/health
   */
  async check(req, res) {
    const dbHealthy = await checkDbHealth();
    const redisHealthy = await cache.checkHealth();

    const isHealthy = dbHealthy; // DB is core, Redis fallback is active if redis is down

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        cache: redisHealthy ? 'connected' : 'fallback_mode',
      }
    };

    if (!isHealthy) {
      return res.status(503).json(response);
    }

    return res.status(200).json(response);
  }
};

module.exports = HealthController;
