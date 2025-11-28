/**
 * Application configuration using Settings class pattern.
 * Mirrors FastAPI app/config.py - uses process.env directly (no .env files).
 *
 * Environment variables:
 * - POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_SCHEMA
 * - REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_USERNAME, REDIS_PASSWORD
 * - PORT, HOST, LOG_LEVEL, NODE_ENV
 * - GEMINI_API_KEY, OPENAI_API_KEY, FIGMA_TOKEN
 * - UNDER_CONSTRUCTION_KEY
 * - AI_DEFAULT_MODEL, OPENAI_BASE_URL, GOOGLE_BASE_URL
 */

class Settings {
  constructor() {
    // ==========================================================================
    // Database Configuration
    // ==========================================================================
    this.POSTGRES_HOST = process.env.POSTGRES_HOST ?? "localhost";
    this.POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT ?? "5432", 10);
    this.POSTGRES_USER = process.env.POSTGRES_USER ?? "postgres";
    this.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
    this.POSTGRES_DB = process.env.POSTGRES_DB ?? "app";
    this.POSTGRES_SCHEMA = process.env.POSTGRES_SCHEMA ?? "public";

    // ==========================================================================
    // Redis Configuration
    // ==========================================================================
    this.REDIS_HOST = process.env.REDIS_HOST ?? "localhost";
    this.REDIS_PORT = parseInt(process.env.REDIS_PORT ?? "6379", 10);
    this.REDIS_USERNAME = process.env.REDIS_USERNAME ?? null;
    this.REDIS_PASSWORD = process.env.REDIS_PASSWORD;
    this.REDIS_DB = parseInt(process.env.REDIS_DB ?? "0", 10);

    // ==========================================================================
    // Server Configuration
    // ==========================================================================
    this.PORT = parseInt(process.env.PORT ?? "3000", 10);
    this.HOST = process.env.HOST ?? "0.0.0.0";
    this.LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
    this.NODE_ENV = process.env.NODE_ENV ?? "development";

    // ==========================================================================
    // API Keys
    // ==========================================================================
    this.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? null;
    this.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? null;
    this.FIGMA_TOKEN = process.env.FIGMA_TOKEN ?? null;

    // ==========================================================================
    // Auth Configuration
    // ==========================================================================
    this.UNDER_CONSTRUCTION_KEY = process.env.UNDER_CONSTRUCTION_KEY ?? null;

    // ==========================================================================
    // AI Provider Configuration
    // ==========================================================================
    this.AI_DEFAULT_MODEL =
      process.env.AI_DEFAULT_MODEL ?? "gemini-2.0-flash-lite";
    this.OPENAI_BASE_URL =
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    this.GOOGLE_BASE_URL =
      process.env.GOOGLE_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta/openai";
  }

  // ==========================================================================
  // Computed Properties (Getters)
  // ==========================================================================

  /**
   * Construct PostgreSQL database URL
   * @returns {string}
   */
  get databaseUrl() {
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }
    return `postgresql://${this.POSTGRES_USER}:${this.POSTGRES_PASSWORD}@${this.POSTGRES_HOST}:${this.POSTGRES_PORT}/${this.POSTGRES_DB}`;
  }

  /**
   * Construct Redis connection URL
   * Format: redis://[username:password@]host:port/db
   * @returns {string}
   */
  get redisUrl() {
    let auth = "";
    if (this.REDIS_USERNAME && this.REDIS_PASSWORD) {
      auth = `${this.REDIS_USERNAME}:${this.REDIS_PASSWORD}@`;
    } else if (this.REDIS_PASSWORD) {
      auth = `:${this.REDIS_PASSWORD}@`;
    }
    return `redis://${auth}${this.REDIS_HOST}:${this.REDIS_PORT}/${this.REDIS_DB}`;
  }

  /**
   * Check if running in production mode
   * @returns {boolean}
   */
  get isProduction() {
    return this.NODE_ENV === "production";
  }

  /**
   * Check if running in development mode
   * @returns {boolean}
   */
  get isDevelopment() {
    return this.NODE_ENV === "development";
  }

  /**
   * Check if database credentials are configured
   * @returns {boolean}
   */
  get hasDatabaseCredentials() {
    return Boolean(this.POSTGRES_USER && this.POSTGRES_PASSWORD);
  }
}

// =============================================================================
// Singleton Pattern
// =============================================================================

let _instance = null;

/**
 * Get cached settings instance (singleton)
 * @returns {Settings}
 */
export function getSettings() {
  if (!_instance) {
    _instance = new Settings();
  }
  return _instance;
}

// Export singleton instance
export const settings = getSettings();

// Export class for testing/extension
export { Settings };

// Default export
export default settings;
