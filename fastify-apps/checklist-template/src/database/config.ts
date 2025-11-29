import { Options } from 'sequelize';

/**
 * Database configuration for different environments
 * Uses MTA-V500 POSTGRES_* environment variables
 */
interface DatabaseConfig {
  development: Options;
  test: Options;
  production: Options;
}

const baseConfig: Partial<Options> = {
  dialect: 'postgres',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  pool: {
    max: Number(process.env.DB_POOL_MAX) || 5,
    min: Number(process.env.DB_POOL_MIN) || 0,
    acquire: Number(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: Number(process.env.DB_POOL_IDLE) || 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
};

const databaseConfig: DatabaseConfig = {
  development: {
    ...baseConfig,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || 'checklist_template_dev',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    schema: process.env.POSTGRES_SCHEMA || 'public',
  },
  test: {
    ...baseConfig,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB_TEST || 'checklist_template_test',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    schema: process.env.POSTGRES_SCHEMA || 'public',
    logging: false,
  },
  production: {
    ...baseConfig,
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    schema: process.env.POSTGRES_SCHEMA || 'public',
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
    logging: false,
  },
};

export default databaseConfig;

// Export the appropriate config based on NODE_ENV
const env = (process.env.NODE_ENV || 'development') as keyof DatabaseConfig;
export const config = databaseConfig[env];
