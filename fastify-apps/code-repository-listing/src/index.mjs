/**
 * Code Repository Listing - Fastify Plugin
 * Provides API routes for the main Fastify server
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyPlugin from 'fastify-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Mock Data for Repositories ---
const mockRepoData = [
  {
    type: 'Docker',
    name: 'postgres',
    description: "The world's most advanced open source relational database.",
    stars: 15200,
    forks: 4100,
    health: 98,
    isVerified: true,
    isTrending: true,
    tags: ['database', 'sql', 'postgres', 'storage'],
  },
  {
    type: 'NPM',
    name: 'fastify',
    description: 'Fast and low overhead web framework, for Node.js.',
    stars: 29900,
    forks: 2200,
    health: 95,
    isVerified: true,
    isTrending: true,
    tags: ['web', 'framework', 'node', 'performance'],
  },
  {
    type: 'Python',
    name: 'pandas',
    description: 'Flexible and powerful data analysis / manipulation library for Python.',
    stars: 42100,
    forks: 17800,
    health: 99,
    isVerified: true,
    isTrending: false,
    tags: ['data-science', 'python', 'analysis', 'ml'],
  },
  {
    type: 'Docker',
    name: 'nginx',
    description: 'Official build of Nginx. High-performance HTTP server and reverse proxy.',
    stars: 19500,
    forks: 6700,
    health: 99,
    isVerified: true,
    isTrending: false,
    tags: ['web-server', 'proxy', 'load-balancer', 'http'],
  },
  {
    type: 'NPM',
    name: 'react',
    description: 'A JavaScript library for building user interfaces.',
    stars: 221000,
    forks: 45000,
    health: 92,
    isVerified: true,
    isTrending: true,
    tags: ['ui', 'frontend', 'javascript', 'library'],
  },
  {
    type: 'Python',
    name: 'scikit-learn',
    description: 'Machine learning in Python. Simple and efficient tools for predictive data analysis.',
    stars: 58300,
    forks: 25400,
    health: 96,
    isVerified: true,
    isTrending: true,
    tags: ['machine-learning', 'python', 'statistics', 'ml'],
  },
];


/**
 * Code Repository Listing Plugin
 * Registers API endpoints
 *
 * @param {object} fastify - Fastify instance
 * @param {object} _options - Plugin options
 * @param {string} [_options.frontendPrefix] - URL prefix for serving frontend static files
 * @param {string} [_options.apiPrefix] - URL prefix for API routes
 */
async function codeRepositoryListingPlugin(fastify, _options) {
  fastify.log.info('→ Initializing Code Repository Listing plugin...');

  // Health check endpoint
  fastify.get('/api/code-repository-listing', async (_request, _reply) => {
    return {
      status: 'ok',
      service: 'code-repository-listing',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: 'GET /api/code-repository-listing',
        repositories: 'GET /api/code-repository-listing/repositories',
        hello: 'GET /api/code-repository-listing/hello',
        echo: 'POST /api/code-repository-listing/echo',
      },
    };
  });
  fastify.log.info('  ✓ Registered route: GET /api/code-repository-listing (health check)');

  // New endpoint for repositories
  fastify.get('/api/code-repository-listing/repositories', async (request, reply) => {
    // In a real app, you'd fetch this from a database
    // You could also add filtering/pagination based on request.query
    return reply.send(mockRepoData);
  });
  fastify.log.info('  ✓ Registered route: GET /api/code-repository-listing/repositories');

  // DELETE endpoint to remove a repository
  fastify.delete('/api/code-repository-listing/repositories/:name', async (request, reply) => {
    const { name } = request.params;
    const index = mockRepoData.findIndex(repo => repo.name === name);

    if (index === -1) {
      return reply.code(404).send({ message: 'Repository not found' });
    }

    // Remove the item from the array
    mockRepoData.splice(index, 1);

    fastify.log.info(`  ✓ Deleted repository: ${name}`);
    return reply.code(200).send({ message: `Repository '${name}' deleted successfully` });
  });
  fastify.log.info('  ✓ Registered route: DELETE /api/code-repository-listing/repositories/:name');

  // POST endpoint to create a new repository
  fastify.post('/api/code-repository-listing/repositories', async (request, reply) => {
    const newRepo = request.body;
    
    // Basic validation
    if (!newRepo || !newRepo.name || !newRepo.description) {
      return reply.code(400).send({ message: 'Missing required fields: name, description' });
    }

    // Check for duplicates
    if (mockRepoData.some(repo => repo.name === newRepo.name)) {
        return reply.code(409).send({ message: `Repository '${newRepo.name}' already exists.` });
    }

    // Add default values for a new repo
    const repoToAdd = {
        isVerified: false,
        isTrending: false,
        stars: 0,
        forks: 0,
        health: 100,
        tags: [],
        ...newRepo
    };

    mockRepoData.unshift(repoToAdd); // Add to the beginning of the list
    fastify.log.info(`  ✓ Created repository: ${repoToAdd.name}`);
    return reply.code(201).send(repoToAdd);
  });
  fastify.log.info('  ✓ Registered route: POST /api/code-repository-listing/repositories');

  // PUT endpoint to update a repository
  fastify.put('/api/code-repository-listing/repositories/:name', async (request, reply) => {
    const { name } = request.params;
    const updates = request.body;
    const index = mockRepoData.findIndex(repo => repo.name === name);

    if (index === -1) {
        return reply.code(404).send({ message: 'Repository not found' });
    }

    // Merge updates with existing data
    mockRepoData[index] = { ...mockRepoData[index], ...updates };
    
    fastify.log.info(`  ✓ Updated repository: ${name}`);
    return reply.code(200).send(mockRepoData[index]);
  });
  fastify.log.info('  ✓ Registered route: PUT /api/code-repository-listing/repositories/:name');


  // Example GET endpoint
  fastify.get('/api/code-repository-listing/hello', async (request, _reply) => {
    const name = request.query.name || 'World';
    return {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
    };
  });
  fastify.log.info('  ✓ Registered route: GET /api/code-repository-listing/hello');

  // Example POST endpoint
  fastify.post(
    '/api/code-repository-listing/echo',
    {
      schema: {
        description: 'Echo back the request body',
        tags: ['Code Repository Listing'],
        body: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    async (request, _reply) => {
      return {
        echo: request.body,
        timestamp: new Date().toISOString(),
      };
    },
  );
  fastify.log.info('  ✓ Registered route: POST /api/code-repository-listing/echo');

  // Register static file serving for frontend
  if (_options.frontendPrefix) {
    try {
      const { readFileSync, existsSync, statSync } = await import('node:fs');
      const { readFile } = await import('node:fs/promises');
      const { lookup } = await import('mime-types');
      const staticRoot = resolve(__dirname, '../frontend/dist');

      fastify.log.info(`→ Setting up frontend static serving...`);
      fastify.log.info(`  Root: ${staticRoot}`);
      fastify.log.info(`  Prefix: ${_options.frontendPrefix}`);

      // Read index.html once for SPA fallback
      const indexPath = resolve(staticRoot, 'index.html');
      const indexHtml = readFileSync(indexPath, 'utf-8');

      // Route 1: Serve index.html at the root path
      fastify.get(_options.frontendPrefix, async (_request, reply) => {
        reply.type('text/html');
        if (process.env.NODE_ENV === 'development') {
          reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        return reply.send(indexHtml);
      });

      // Route 2: Serve static files and SPA fallback
      fastify.get(`${_options.frontendPrefix}/*`, async (request, reply) => {
        const requestedPath = request.url.replace(_options.frontendPrefix, '');
        const cleanPath = requestedPath.startsWith('/') ? requestedPath.slice(1) : requestedPath;
        const filePath = resolve(staticRoot, cleanPath);

        // Security: ensure path is within staticRoot
        if (!filePath.startsWith(staticRoot)) {
          return reply.code(403).send({ error: 'Forbidden' });
        }

        // Check if file exists and is a file (not directory)
        try {
          if (existsSync(filePath)) {
            const stats = statSync(filePath);
            if (stats.isFile()) {
              // Serve the static file
              const content = await readFile(filePath);
              const mimeType = lookup(filePath) || 'application/octet-stream';

              reply.type(mimeType);
              if (process.env.NODE_ENV === 'development') {
                reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
              }
              return reply.send(content);
            }
          }
        } catch (err) {
          fastify.log.debug(`File not found or error: ${filePath}`, err);
        }

        // SPA fallback - serve index.html for client-side routes
        reply.type('text/html');
        if (process.env.NODE_ENV === 'development') {
          reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        return reply.send(indexHtml);
      });

      fastify.log.info(`  ✓ Registered static assets at: ${_options.frontendPrefix}`);
      fastify.log.info(`     Serving from: ${staticRoot}`);
    } catch (error) {
      fastify.log.warn(`  ⚠ Failed to register static assets: ${error.message}`);
      fastify.log.error(error);
    }
  }

  fastify.log.info('✅ Code Repository Listing plugin successfully loaded');
}

// Export as Fastify plugin
export default fastifyPlugin(codeRepositoryListingPlugin, {
  name: 'code-repository-listing',
  fastify: '5.x',
});

// Also export the plugin function for direct use
export { codeRepositoryListingPlugin };
