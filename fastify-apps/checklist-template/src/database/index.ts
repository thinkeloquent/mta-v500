/**
 * Database module exports
 * Centralized access to database connection and utilities
 */

export { sequelize, testConnection, closeConnection, syncDatabase } from './connection.js';
export { checkDatabaseHealth } from './health.js';
export { config as databaseConfig } from './config.js';
export type { DatabaseHealth } from './health.js';
