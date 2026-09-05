const { Pool } = require('pg');
const env = require('./env');

let poolConfig;

if (env.DB.URL && env.DB.URL.includes('@')) {
  poolConfig = {
    connectionString: env.DB.URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
} else {
  poolConfig = {
    host: env.DB.HOST,
    port: env.DB.PORT,
    user: env.DB.USER,
    password: env.DB.PASSWORD,
    database: env.DB.NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle database client:', err.message);
});

/**
 * Execute a parameterized query against PostgreSQL
 * @param {string} text 
 * @param {Array} params 
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      console.log(`[SQL Query] duration=${duration}ms rows=${res.rowCount}`);
    }
    return res;
  } catch (error) {
    console.error(`[SQL Error] Query failed: "${text.substring(0, 80)}..."`, error.message);
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = async () => {
  return await pool.connect();
};

/**
 * Check database health
 * @returns {Promise<boolean>}
 */
const checkHealth = async () => {
  try {
    const res = await pool.query('SELECT 1 AS healthy');
    return res.rows[0]?.healthy === 1;
  } catch (error) {
    return false;
  }
};

module.exports = {
  pool,
  query,
  getClient,
  checkHealth,
};
