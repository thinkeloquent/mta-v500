import { z, ZodError, ZodSchema } from 'zod';

/**
 * Validation error class for better error handling
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    };
  }
}

/**
 * Validates data against a Zod schema and throws ValidationError on failure
 * Use this for defensive programming - validate all function arguments
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param errorMessage - Custom error message prefix
 * @returns Parsed and validated data
 * @throws ValidationError if validation fails
 */
export function validateSchema<T extends ZodSchema>(
  schema: T,
  data: unknown,
  errorMessage = 'Validation failed'
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(errorMessage, error.errors);
    }
    throw error;
  }
}

/**
 * Safe validation that returns a result object instead of throwing
 * Useful for non-critical validations
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result object with success flag and data or errors
 */
export function safeValidate<T extends ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error.errors };
}

/**
 * Validates partial updates - only validates fields that are present
 * Useful for PATCH/UPDATE operations
 *
 * @param schema - Zod schema to validate against
 * @param data - Partial data to validate
 * @returns Parsed and validated partial data
 */
export function validatePartial<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  data: unknown
): Partial<z.infer<T>> {
  const partialSchema = schema.partial();
  return validateSchema(partialSchema, data, 'Partial validation failed');
}

/**
 * Format Zod errors into a more readable structure
 *
 * @param errors - Array of Zod issues
 * @returns Formatted error object
 */
export function formatZodErrors(errors: z.ZodIssue[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const error of errors) {
    const path = error.path.join('.') || 'root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(error.message);
  }

  return formatted;
}
