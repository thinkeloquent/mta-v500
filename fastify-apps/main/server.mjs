import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import basicAuth from '@fastify/basic-auth';
import { createServer, launchServer } from '@thinkeloquent/skeleton';
import aiSdkExamplesPlugin from '../ai-sdk-examples/src/index.mjs';
import { authServiceApp } from './modules/auth-service.mjs';
import { userServiceApp } from './modules/user-service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration with defensive error handling
let config;
try {
  const configPath = join(__dirname, 'mta-prisma.config.json');

  if (!existsSync(configPath)) {
    console.error(`❌ Configuration file not found: ${configPath}`);
    console.error('Please ensure mta-prisma.config.json exists in the project root.');
    process.exit(1);
  }

  const configContent = readFileSync(configPath, 'utf-8');

  if (!configContent.trim()) {
    console.error(`❌ Configuration file is empty: ${configPath}`);
    process.exit(1);
  }

  config = JSON.parse(configContent);

  if (!config.apps || !Array.isArray(config.apps)) {
    console.error("❌ Invalid configuration: 'apps' must be an array");
    process.exit(1);
  }
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error('❌ Configuration file contains invalid JSON:', error.message);
  } else {
    console.error('❌ Failed to load configuration:', error.message);
  }
  process.exit(1);
}

// Build DATABASE_URL from environment variables
const buildDatabaseUrl = () => {
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST;
  const port = process.env.POSTGRES_PORT;
  const database = process.env.POSTGRES_DB;

  // Return explicit DATABASE_URL if set, otherwise build from components
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (!user || !password) {
    return undefined;
  }

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const DATABASE_URL = buildDatabaseUrl();

// Create Fastify instance with CORS configured via skeleton
const isProduction = process.env.NODE_ENV === 'production';
const fastify = await createServer({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  prettyPrint: !isProduction,
  // CORS: allow any localhost in dev, use CORS_ALLOW_ORIGINS in production
  corsAllowLocalhost: !isProduction,
});


// Log database configuration status with safe URL masking
if (DATABASE_URL) {
  let maskedUrl;
  try {
    // Safely mask password in URL
    maskedUrl = DATABASE_URL.replace(/:([^:@]+)@/, ':***@');
  } catch (error) {
    // Fallback if regex fails on malformed URL
    maskedUrl = '[malformed URL - password hidden]';
    fastify.log.warn({ error }, 'Failed to mask database URL');
  }
  fastify.log.info(`Database URL configured: ${maskedUrl}`);
} else {
  fastify.log.warn(
    '⚠ Database URL not configured. Set POSTGRES_USER and POSTGRES_PASSWORD, or DATABASE_URL',
  );
}

// ============================================================================
// Under Construction Middleware - Protect application with Basic Auth
// ============================================================================
// When UNDER_CONSTRUCTION_KEY environment variable is set, all routes except
// health endpoints require basic authentication where both username and password
// must match the UNDER_CONSTRUCTION_KEY value.
// Health endpoints (/health, /status, /ping) are always exempt to allow monitoring.
// ============================================================================

const underConstructionKey = process.env.UNDER_CONSTRUCTION_KEY;

if (underConstructionKey) {
  fastify.log.info(
    '🚧 Under Construction mode enabled - BasicAuth required for all routes except health checks',
  );

  // Define paths that are exempt from authentication
  const EXEMPT_PATHS = new Set(['/', '/health', '/status', '/ping']);

  // Define path prefixes that are exempt from authentication
  const EXEMPT_PREFIXES = ['/sys/status/', '/documentation/'];

  // Helper function to check if path is exempt
  const isExemptPath = (path) => {
    // Exact match for exempt paths
    if (EXEMPT_PATHS.has(path)) {
      return true;
    }

    // Prefix match for exempt prefixes
    for (const prefix of EXEMPT_PREFIXES) {
      if (path.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  };

  // Register basic auth plugin
  await fastify.register(basicAuth, {
    validate: async (username, password, _req, _reply) => {
      // Both username and password must match the construction key
      // Use constant-time comparison to prevent timing attacks
      try {
        const usernameBuffer = Buffer.from(username, 'utf8');
        const passwordBuffer = Buffer.from(password, 'utf8');
        const keyBuffer = Buffer.from(underConstructionKey, 'utf8');

        // Ensure buffers are same length for timingSafeEqual
        const usernameMatches =
          usernameBuffer.length === keyBuffer.length && timingSafeEqual(usernameBuffer, keyBuffer);

        const passwordMatches =
          passwordBuffer.length === keyBuffer.length && timingSafeEqual(passwordBuffer, keyBuffer);

        if (!usernameMatches || !passwordMatches) {
          return new Error('Invalid credentials');
        }
      } catch {
        return new Error('Invalid credentials');
      }
    },
    authenticate: { realm: 'Under Construction' },
  });

  // Add global hook to enforce authentication on non-exempt routes
  fastify.addHook('onRequest', async (request, _reply) => {
    // Skip authentication for exempt paths
    if (isExemptPath(request.url)) {
      return;
    }

    // Require basic authentication for all other routes
    await request.basicAuth();
  });
}

// Register internal service modules
await fastify.apps.registerAll([
  {
    name: 'auth-service',
    plugin: authServiceApp,
    options: {}, // No prefix - routes define their own paths
    metadata: {
      version: '1.0.0',
      description: 'Authentication service',
      dependencies: [], // No dependencies - loads first
    },
  },
  {
    name: 'user-service',
    plugin: userServiceApp,
    options: {}, // No prefix - routes define their own paths
    metadata: {
      version: '1.0.0',
      description: 'User management service',
      dependencies: ['auth-service'], // Depends on auth
    },
  },
  {
    name: 'ai-sdk-examples',
    plugin: aiSdkExamplesPlugin,
    options: {
      apiPrefix: '/api/ai-sdk-examples',
      frontendPrefix: '/apps/ai-sdk-examples',
      useFastifyPlugin: false, // Plugin is already wrapped
    },
    metadata: {
      version: '1.0.0',
      description: 'AI SDK streaming examples with multi-provider support',
      tags: ['ai', 'streaming', 'examples'],
      dependencies: [], // No dependencies
    },
  },
]);

// Dynamically load and register apps from config, then load static assets
const loadApps = async () => {
  if (config.apps && config.apps.length > 0) {
    const result = await fastify.apps.loadApps(config.apps, DATABASE_URL);
    await result.loadAppStaticAssets();
  }
};

// Load apps before starting server
const appLoadStartTime = Date.now();
await loadApps();
const totalLoadTime = Date.now() - appLoadStartTime;

fastify.log.info(
  {
    totalLoadTimeMs: totalLoadTime,
  },
  `Apps and static assets loaded in ${totalLoadTime}ms`,
);

// Start server using skeleton's launchServer function
const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

fastify.get('/', async (_request, _reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/health', async (_request, _reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

await launchServer(fastify, {
  port,
  host,
  metadata: {
    appsLoaded: fastify.apps.list().map((app) => app.name),
  },
});

console.log('\n🚀 User-Auth Service is running!');
console.log('📝 Try these endpoints:');
console.log(`   - http://${host}:${port}/api/auth/login`);
console.log(`   - http://${host}:${port}/api/auth/verify`);
console.log(`   - http://${host}:${port}/api/users (requires auth)`);
console.log('\n💡 Get a token first:');
console.log(`   curl http://localhost:${port}/api/auth/login`);
console.log('\n💡 Then use it:');
console.log(`   curl -H "Authorization: Bearer valid-token" http://localhost:${port}/api/users`);
