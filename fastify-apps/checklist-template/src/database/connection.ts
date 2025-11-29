import { Sequelize } from 'sequelize';

import { config } from './config.js';

/**
 * Sequelize instance for database operations
 * Connection pool and configuration managed here
 */
const sequelize = new Sequelize(config);

/**
 * Test database connection
 * @returns Promise that resolves if connection is successful
 * @throws Error if connection fails
 */
export async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

/**
 * Close database connection
 * Should be called during graceful shutdown
 */
export async function closeConnection(): Promise<void> {
  try {
    await sequelize.close();
    console.log('Database connection closed successfully.');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}

/**
 * Sync database models (development only)
 * WARNING: Do not use in production - use migrations instead
 */
export async function syncDatabase(force = false): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database sync is not allowed in production. Use migrations instead.');
  }

  try {
    await sequelize.sync({ force });
    console.log(`Database synced successfully${force ? ' (force mode)' : ''}.`);
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
}

export { sequelize };
export default sequelize;
