import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import TemplateService from '../services/TemplateService.js';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  GetTemplateParamsSchema,
  ListTemplatesQuerySchema,
  DeleteTemplateParamsSchema,
} from '../zod-schema-contract/templates/index.js';
import { validateSchema } from '../zod-schema-contract/common/index.js';

/**
 * Template routes
 * REST API endpoints for template management
 */
export async function templateRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /templates
   * Create a new template
   */
  fastify.post(
    '/templates',
    {
      schema: {
        description: 'Create a new template with steps',
        tags: ['templates'],
        body: {
          type: 'object',
          required: ['templateId', 'name', 'category', 'steps'],
          properties: {
            templateId: {
              type: 'string',
              pattern: '^[a-zA-Z0-9-_]{3,64}$',
              description: 'Unique template identifier',
              example: 'project-onboarding',
            },
            name: {
              type: 'string',
              minLength: 3,
              maxLength: 100,
              description: 'Template name',
              example: 'Project Onboarding Checklist',
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Template description',
              example: 'Checklist for onboarding new projects',
            },
            category: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Template category',
              example: 'Development',
            },
            steps: {
              type: 'array',
              minItems: 1,
              maxItems: 100,
              description: 'Array of template steps',
              items: {
                type: 'object',
                required: ['stepId', 'order', 'title', 'required'],
                properties: {
                  stepId: {
                    type: 'string',
                    pattern: '^[a-zA-Z0-9-_]{3,64}$',
                    example: 'setup-repo',
                  },
                  order: {
                    type: 'integer',
                    minimum: 1,
                    example: 1,
                  },
                  title: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 200,
                    example: 'Set up repository',
                  },
                  description: {
                    type: 'string',
                    maxLength: 1000,
                    example: 'Create and configure project repository',
                  },
                  required: {
                    type: 'boolean',
                    example: true,
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['setup', 'git'],
                  },
                  dependencies: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['template-a.step-1[required]', 'template-b.step-2[blocking]'],
                  },
                },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  templateId: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  category: { type: 'string' },
                  version: { type: 'integer' },
                  steps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        stepId: { type: 'string' },
                        order: { type: 'integer' },
                        title: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        required: { type: 'boolean' },
                        tags: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                        dependencies: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                      },
                    },
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const template = await TemplateService.createTemplate(request.body);

      return reply.status(201).send({
        success: true,
        data: template,
      });
    }
  );

  /**
   * GET /templates/:id
   * Get template by ID
   */
  fastify.get(
    '/templates/:id',
    {
      schema: {
        description: 'Get a template by ID with all steps',
        tags: ['templates'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              pattern: '^[a-zA-Z0-9-_]{3,64}$',
              description: 'Template ID',
              example: 'project-onboarding',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  templateId: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  category: { type: 'string' },
                  version: { type: 'integer' },
                  steps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        stepId: { type: 'string' },
                        order: { type: 'integer' },
                        title: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        required: { type: 'boolean' },
                        tags: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                        dependencies: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                      },
                    },
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateSchema(GetTemplateParamsSchema, request.params, 'Invalid parameters');
      const template = await TemplateService.getTemplate(params.id);

      return reply.status(200).send({
        success: true,
        data: template,
      });
    }
  );

  /**
   * GET /templates
   * List all templates with pagination and filters
   */
  fastify.get(
    '/templates',
    {
      schema: {
        description: 'List templates with pagination and filters',
        tags: ['templates'],
        querystring: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              description: 'Page number',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Items per page',
            },
            category: {
              type: 'string',
              description: 'Filter by category',
              example: 'Development',
            },
            sortBy: {
              type: 'string',
              enum: ['name', 'createdAt', 'updatedAt'],
              default: 'createdAt',
              description: 'Sort field',
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
              description: 'Sort order',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    templateId: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    category: { type: 'string' },
                    version: { type: 'integer' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    steps: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          stepId: { type: 'string' },
                          title: { type: 'string' },
                          description: { type: 'string', nullable: true },
                          order: { type: 'integer' },
                          required: { type: 'boolean' },
                          tags: { type: 'array', items: { type: 'string' } },
                          dependencies: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = validateSchema(ListTemplatesQuerySchema, request.query, 'Invalid query parameters');
      const result = await TemplateService.listTemplates(query);

      return reply.status(200).send({
        success: true,
        data: result.templates,
        meta: result.meta,
      });
    }
  );

  /**
   * PUT /templates/:id
   * Update template by ID
   */
  fastify.put(
    '/templates/:id',
    {
      schema: {
        description: 'Update a template by ID',
        tags: ['templates'],
        body: {
          type: 'object',
          required: ['name', 'category', 'steps'],
          properties: {
            name: {
              type: 'string',
              minLength: 3,
              maxLength: 100,
              description: 'Template name',
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Template description',
            },
            category: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Template category',
            },
            steps: {
              type: 'array',
              minItems: 1,
              maxItems: 100,
              description: 'Array of template steps',
              items: {
                type: 'object',
                required: ['stepId', 'order', 'title', 'required'],
                properties: {
                  stepId: {
                    type: 'string',
                    pattern: '^[a-zA-Z0-9-_]{3,64}$',
                  },
                  order: {
                    type: 'integer',
                    minimum: 1,
                  },
                  title: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 200,
                  },
                  description: {
                    type: 'string',
                    maxLength: 1000,
                  },
                  required: {
                    type: 'boolean',
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  dependencies: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateSchema(GetTemplateParamsSchema, request.params, 'Invalid parameters');
      const template = await TemplateService.updateTemplate(params.id, request.body);

      return reply.status(200).send({
        success: true,
        data: template,
      });
    }
  );

  /**
   * DELETE /templates/:id
   * Delete template by ID
   */
  fastify.delete(
    '/templates/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              pattern: '^[a-zA-Z0-9-_]{3,64}$',
              description: 'Template ID',
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const params = validateSchema(DeleteTemplateParamsSchema, request.params, 'Invalid parameters');
      await TemplateService.deleteTemplate(params.id);

      return reply.status(200).send({
        success: true,
        message: `Template ${params.id} deleted successfully`,
      });
    }
  );
}
