import { z } from 'zod';

import { PaginationSchema, SortOrderSchema } from '../common/index.js';

/**
 * Generate checklist schema
 * Parameters for generating a checklist from a template
 */
export const GenerateChecklistSchema = z.object({
  templateId: z
    .string()
    .regex(
      /^[a-zA-Z0-9-_]{3,64}$/,
      'Template ID must be 3-64 alphanumeric characters, hyphens, or underscores'
    ),
  parameters: z.record(z.string(), z.unknown()).optional().default({}),
});

export type GenerateChecklistInput = z.infer<typeof GenerateChecklistSchema>;

/**
 * Checklist step response schema
 */
export const ChecklistStepResponseSchema = z.object({
  id: z.number().int().positive(),
  checklistId: z.string(),
  order: z.number().int().positive(),
  title: z.string(),
  description: z.string().nullable(),
  required: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ChecklistStepResponse = z.infer<typeof ChecklistStepResponseSchema>;

/**
 * Checklist instance response schema
 */
export const ChecklistInstanceResponseSchema = z.object({
  id: z.number().int().positive(),
  checklistId: z.string(),
  templateRef: z.string(),
  generatedAt: z.coerce.date(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  steps: z.array(ChecklistStepResponseSchema).optional(),
});

export type ChecklistInstanceResponse = z.infer<typeof ChecklistInstanceResponseSchema>;

/**
 * Get checklist by ID params schema
 */
export const GetChecklistParamsSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]{3,64}$/, 'Invalid checklist ID format'),
});

export type GetChecklistParams = z.infer<typeof GetChecklistParamsSchema>;

/**
 * List checklists query schema
 */
export const ListChecklistsQuerySchema = PaginationSchema.extend({
  templateRef: z.string().min(3).max(64).optional(),
  sortBy: z.enum(['generatedAt', 'checklistId', 'createdAt']).default('generatedAt'),
  sortOrder: SortOrderSchema,
});

export type ListChecklistsQuery = z.infer<typeof ListChecklistsQuerySchema>;
