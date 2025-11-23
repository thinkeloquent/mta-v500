/**
 * Rule Tree Table - Fastify Plugin
 * Provides API routes for managing hierarchical rule trees
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyPlugin from 'fastify-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory storage for rules (in production, use a database)
let rulesStore = {
  id: 'root',
  type: 'group',
  name: 'Root Rules',
  logic: 'AND',
  expanded: true,
  enabled: true,
  conditions: [],
};

/**
 * Validate a rule item recursively
 * @param {object} item - Rule item to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
function validateRuleItem(item) {
  const errors = [];

  if (!item.id) errors.push('Missing id');
  if (!item.type || !['group', 'condition'].includes(item.type)) {
    errors.push('Invalid type: must be "group" or "condition"');
  }

  if (item.type === 'group') {
    if (!item.logic || !['AND', 'OR', 'NOT', 'XOR'].includes(item.logic)) {
      errors.push('Invalid logic: must be AND, OR, NOT, or XOR');
    }
    if (!Array.isArray(item.conditions)) {
      errors.push('Group must have conditions array');
    } else {
      item.conditions.forEach((child, index) => {
        const childValidation = validateRuleItem(child);
        if (!childValidation.isValid) {
          errors.push(`Child ${index}: ${childValidation.errors.join(', ')}`);
        }
      });
    }
  } else if (item.type === 'condition') {
    if (!item.field) errors.push('Condition missing field');
    if (!item.operator) errors.push('Condition missing operator');
    if (!item.valueType || !['value', 'field', 'function', 'regex'].includes(item.valueType)) {
      errors.push('Invalid valueType');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Count rules in a tree
 * @param {object} node - Rule node
 * @returns {{total: number, groups: number, conditions: number, enabled: number}}
 */
function countRules(node) {
  let groups = 0;
  let conditions = 0;
  let enabled = 0;

  function traverse(item, parentEnabled = true) {
    const isEnabled = parentEnabled && item.enabled;
    if (item.type === 'group') {
      groups++;
      if (isEnabled) enabled++;
      if (item.conditions) {
        item.conditions.forEach((child) => traverse(child, isEnabled));
      }
    } else {
      conditions++;
      if (isEnabled) enabled++;
    }
  }

  if (node.conditions) {
    node.conditions.forEach((child) => traverse(child, node.enabled));
  }

  return {
    total: groups + conditions,
    groups,
    conditions,
    enabled,
  };
}

/**
 * Rule Tree Table Plugin
 * Registers API endpoints for rule management
 *
 * @param {object} fastify - Fastify instance
 * @param {object} _options - Plugin options
 * @param {string} [_options.frontendPrefix] - URL prefix for serving frontend static files
 * @param {string} [_options.apiPrefix] - URL prefix for API routes
 */
async function ruleTreeTablePlugin(fastify, _options) {
  fastify.log.info('→ Initializing Rule Tree Table plugin...');

  // Health check endpoint
  fastify.get('/api/rule-tree-table', async (_request, _reply) => {
    const stats = countRules(rulesStore);
    return {
      status: 'ok',
      service: 'rule-tree-table',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      stats,
      endpoints: {
        health: 'GET /api/rule-tree-table',
        getRules: 'GET /api/rule-tree-table/rules',
        saveRules: 'POST /api/rule-tree-table/rules',
        validateRules: 'POST /api/rule-tree-table/rules/validate',
      },
    };
  });
  fastify.log.info('  ✓ Registered route: GET /api/rule-tree-table (health check)');

  // Get all rules
  fastify.get('/api/rule-tree-table/rules', async (_request, _reply) => {
    const stats = countRules(rulesStore);
    return {
      rules: rulesStore,
      stats,
      timestamp: new Date().toISOString(),
    };
  });
  fastify.log.info('  ✓ Registered route: GET /api/rule-tree-table/rules');

  // Save rules (replace entire tree)
  fastify.post(
    '/api/rule-tree-table/rules',
    {
      schema: {
        description: 'Save the complete rule tree',
        tags: ['Rule Tree Table'],
        body: {
          type: 'object',
          required: ['rules'],
          properties: {
            rules: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { rules } = request.body;

      // Validate the rules structure
      const validation = validateRuleItem(rules);
      if (!validation.isValid) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid rules structure',
          details: validation.errors,
          timestamp: new Date().toISOString(),
        });
      }

      // Save the rules
      rulesStore = rules;
      const stats = countRules(rulesStore);

      fastify.log.info(`Rules saved: ${stats.total} rules (${stats.groups} groups, ${stats.conditions} conditions)`);

      return {
        success: true,
        message: 'Rules saved successfully',
        stats,
        timestamp: new Date().toISOString(),
      };
    },
  );
  fastify.log.info('  ✓ Registered route: POST /api/rule-tree-table/rules');

  // Validate rules without saving
  fastify.post(
    '/api/rule-tree-table/rules/validate',
    {
      schema: {
        description: 'Validate a rule tree structure',
        tags: ['Rule Tree Table'],
        body: {
          type: 'object',
          required: ['rules'],
          properties: {
            rules: { type: 'object' },
          },
        },
      },
    },
    async (request, _reply) => {
      const { rules } = request.body;
      const validation = validateRuleItem(rules);
      const stats = countRules(rules);

      return {
        isValid: validation.isValid,
        errors: validation.errors,
        stats,
        timestamp: new Date().toISOString(),
      };
    },
  );
  fastify.log.info('  ✓ Registered route: POST /api/rule-tree-table/rules/validate');

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

  fastify.log.info('✅ Rule Tree Table plugin successfully loaded');
}

// Export as Fastify plugin
export default fastifyPlugin(ruleTreeTablePlugin, {
  name: 'rule-tree-table',
  fastify: '5.x',
});

// Also export the plugin function for direct use
export { ruleTreeTablePlugin };
