import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import ChecklistService from '../services/ChecklistService.js';
import {
  GenerateChecklistSchema,
  GetChecklistParamsSchema,
  ListChecklistsQuerySchema,
} from '../zod-schema-contract/checklists/index.js';
import { validateSchema } from '../zod-schema-contract/common/index.js';

/**
 * Checklist routes
 * REST API endpoints for checklist generation and retrieval
 */
export async function checklistRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /checklists
   * Generate a new checklist from a template
   */
  fastify.post(
    '/checklists',
    {
      schema: {
        description: 'Generate a new checklist instance from a template with parameter substitution',
        tags: ['checklists'],
        body: {
          type: 'object',
          required: ['templateId'],
          properties: {
            templateId: {
              type: 'string',
              pattern: '^[a-zA-Z0-9-_]{3,64}$',
              description: 'Template ID to generate from',
              example: 'project-onboarding',
            },
            parameters: {
              type: 'object',
              additionalProperties: true,
              description: 'Parameters for {{placeholder}} substitution',
              example: {
                ProjectName: 'My Awesome App',
                TeamSize: '5 developers',
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
                  checklistId: {
                    type: 'string',
                    description: 'Unique checklist instance ID',
                    example: 'project-onboarding-1760757502396-d1a6ug',
                  },
                  templateRef: {
                    type: 'string',
                    description: 'Source template ID',
                  },
                  generatedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Generation timestamp',
                  },
                  metadata: {
                    type: 'object',
                    description: 'Generation metadata',
                    properties: {
                      templateVersion: { type: 'integer' },
                      parameters: { type: 'object' },
                      generatedFrom: { type: 'string' },
                    },
                  },
                  steps: {
                    type: 'array',
                    description: 'Cloned and parameterized steps',
                    items: {
                      type: 'object',
                      properties: {
                        checklistId: { type: 'string' },
                        order: { type: 'integer' },
                        title: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        required: { type: 'boolean' },
                        tags: {
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
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const checklist = await ChecklistService.generateChecklist(request.body);

      return reply.status(201).send({
        success: true,
        data: checklist,
      });
    }
  );

  /**
   * GET /checklists/:id
   * Get checklist by ID
   */
  fastify.get(
    '/checklists/:id',
    {
      schema: {
        description: 'Get a checklist instance by ID with all steps and metadata',
        tags: ['checklists'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              pattern: '^[a-zA-Z0-9-_]{3,}$',
              description: 'Checklist instance ID',
              example: 'project-onboarding-1760757502396-d1a6ug',
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
                  checklistId: { type: 'string' },
                  templateRef: { type: 'string' },
                  generatedAt: { type: 'string', format: 'date-time' },
                  metadata: {
                    type: 'object',
                    properties: {
                      templateVersion: { type: 'integer' },
                      parameters: { type: 'object' },
                      generatedFrom: { type: 'string' },
                    },
                  },
                  steps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        checklistId: { type: 'string' },
                        order: { type: 'integer' },
                        title: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        required: { type: 'boolean' },
                        tags: {
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
      const params = validateSchema(GetChecklistParamsSchema, request.params, 'Invalid parameters');
      const checklist = await ChecklistService.getChecklist(params.id);

      return reply.status(200).send({
        success: true,
        data: checklist,
      });
    }
  );

  /**
   * GET /checklists
   * List all checklists with pagination and filters
   */
  fastify.get(
    '/checklists',
    {
      schema: {
        description: 'List checklist instances with pagination and filters',
        tags: ['checklists'],
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
            templateRef: {
              type: 'string',
              description: 'Filter by source template ID',
              example: 'project-onboarding',
            },
            sortBy: {
              type: 'string',
              enum: ['generatedAt', 'checklistId', 'createdAt'],
              default: 'generatedAt',
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
                    checklistId: { type: 'string' },
                    templateRef: { type: 'string' },
                    generatedAt: { type: 'string', format: 'date-time' },
                    metadata: {
                      type: 'object',
                      properties: {
                        templateVersion: { type: 'integer' },
                        parameters: { type: 'object' },
                        generatedFrom: { type: 'string' },
                      },
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
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
      const query = validateSchema(
        ListChecklistsQuerySchema,
        request.query,
        'Invalid query parameters'
      );
      const result = await ChecklistService.listChecklists(query);

      return reply.status(200).send({
        success: true,
        data: result.checklists,
        meta: result.meta,
      });
    }
  );
}
