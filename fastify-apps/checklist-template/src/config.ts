import { z } from 'zod';

/**
 * Environment configuration schema
 * Validates all required environment variables at startup
 */
const ConfigSchema = z.object({
  // Application
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(3000),
  host: z.string().default('0.0.0.0'),

  // CORS
  cors: z.object({
    origin: z.string().default('http://localhost:5173'),
    credentials: z.coerce.boolean().default(true),
  }),

  // Logging
  logging: z.object({
    level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    pretty: z.coerce.boolean().default(true),
  }),

  // API
  api: z.object({
    prefix: z.string().default('/api'),
    version: z.string().default('v1'),
  }),

  // Rate Limiting
  rateLimit: z.object({
    max: z.coerce.number().int().positive().default(100),
    timeWindow: z.coerce.number().int().positive().default(60000),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Parse and validate configuration from environment variables
 */
function loadConfig(): Config {
  try {
    return ConfigSchema.parse({
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      host: process.env.HOST,

      cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: process.env.CORS_CREDENTIALS,
      },

      logging: {
        level: process.env.LOG_LEVEL,
        pretty: process.env.LOG_PRETTY,
      },

      api: {
        prefix: process.env.API_PREFIX,
        version: process.env.API_VERSION,
      },

      rateLimit: {
        max: process.env.RATE_LIMIT_MAX,
        timeWindow: process.env.RATE_LIMIT_TIMEWINDOW,
      },
    });
  } catch (error) {
    console.error('Configuration validation failed:');
    if (error instanceof z.ZodError) {
      console.error(error.errors);
    }
    throw error;
  }
}

export const config = loadConfig();
