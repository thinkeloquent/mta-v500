import { z } from 'zod';

/**
 * Common ID validation schema
 * UUIDs or custom ID formats
 */
export const IdSchema = z.string().uuid('Invalid ID format');

/**
 * Custom ID schema for template/checklist IDs
 * Format: alphanumeric with hyphens, 8-64 characters
 */
export const CustomIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9-_]{8,64}$/, 'Invalid custom ID format');

/**
 * Timestamp schemas
 */
export const TimestampSchema = z.coerce.date();

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Pagination response metadata
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Sort order schema
 */
export const SortOrderSchema = z.enum(['asc', 'desc']).default('asc');

export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * Common metadata fields
 */
export const MetadataSchema = z.object({
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Generic success response schema
 */
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

/**
 * Generic error response schema
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Generic paginated response schema
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
