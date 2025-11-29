import { z } from 'zod';

import { PaginationSchema, SortOrderSchema } from '../common/index.js';
import { StepDefinitionSchema, StepResponseSchema } from './step.schema.js';

/**
 * Create template schema
 */
export const CreateTemplateSchema = z.object({
  templateId: z
    .string()
    .regex(/^[a-zA-Z0-9-_]{3,64}$/, 'Template ID must be 3-64 alphanumeric characters, hyphens, or underscores'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be 100 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
  category: z.string().min(2, 'Category must be at least 2 characters').max(50, 'Category must be 50 characters or less'),
  steps: z
    .array(StepDefinitionSchema)
    .min(1, 'Template must have at least one step')
    .max(100, 'Template cannot have more than 100 steps'),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;

/**
 * Update template schema (all fields optional except steps)
 */
export const UpdateTemplateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  category: z.string().min(2).max(50).optional(),
  steps: z.array(StepDefinitionSchema).min(1).max(100).optional(),
});

export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;

/**
 * Template response schema
 */
export const TemplateResponseSchema = z.object({
  id: z.number().int().positive(),
  templateId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  version: z.number().int().positive(),
  category: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  steps: z.array(StepResponseSchema).optional(),
});

export type TemplateResponse = z.infer<typeof TemplateResponseSchema>;

/**
 * Get template by ID params schema
 */
export const GetTemplateParamsSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]{3,64}$/, 'Invalid template ID format'),
});

export type GetTemplateParams = z.infer<typeof GetTemplateParamsSchema>;

/**
 * List templates query schema
 */
export const ListTemplatesQuerySchema = PaginationSchema.extend({
  category: z.string().min(2).max(50).optional(),
  search: z.string().min(1).max(100).optional(),
  sortBy: z.enum(['name', 'category', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: SortOrderSchema,
});

export type ListTemplatesQuery = z.infer<typeof ListTemplatesQuerySchema>;

/**
 * Delete template params schema
 */
export const DeleteTemplateParamsSchema = GetTemplateParamsSchema;

export type DeleteTemplateParams = z.infer<typeof DeleteTemplateParamsSchema>;
