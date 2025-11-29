import { sequelize } from './connection.js';

/**
 * Database health check
 * Returns status and connection information
 */
export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  database: string;
  latency?: number;
  error?: string;
}

/**
 * Check database health
 * Performs a simple query to verify connectivity
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = Date.now();

  try {
    // Execute a simple query to test connection
    await sequelize.authenticate();

    const latency = Date.now() - startTime;

    return {
      status: 'healthy',
      database: sequelize.getDatabaseName(),
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      database: sequelize.getDatabaseName(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
