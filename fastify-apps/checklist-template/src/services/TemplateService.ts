import { Template } from '../models/index.js';
import TemplateRepository from '../repositories/TemplateRepository.js';
import { validateSchema } from '../zod-schema-contract/common/index.js';
import {
  CreateTemplateSchema,
  CreateTemplateInput,
  UpdateTemplateSchema,
  UpdateTemplateInput,
  ListTemplatesQuery,
} from '../zod-schema-contract/templates/index.js';
import { ConflictError, NotFoundError } from '../plugins/errorHandler.js';

/**
 * Template Service
 * Business logic layer for template operations
 */
export class TemplateService {
  /**
   * Create a new template
   * Validates business rules: unique templateId, unique step IDs, sequential ordering
   *
   * @param data - Template creation data
   * @returns Created template
   */
  async createTemplate(data: unknown): Promise<Template> {
    // Defensive: validate input
    const validData = validateSchema(CreateTemplateSchema, data, 'Invalid template data');

    // Business rule: Check for duplicate templateId
    const exists = await TemplateRepository.exists(validData.templateId);
    if (exists) {
      throw new ConflictError(`Template with ID ${validData.templateId} already exists`);
    }

    // Business rule: Validate step IDs are unique within template
    const stepIds = validData.steps.map((s) => s.stepId);
    const uniqueStepIds = new Set(stepIds);
    if (stepIds.length !== uniqueStepIds.size) {
      throw new ConflictError('Step IDs must be unique within a template');
    }

    // Business rule: Validate step ordering (should be sequential starting from 1)
    const sortedSteps = [...validData.steps].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sortedSteps.length; i++) {
      if (sortedSteps[i]!.order !== i + 1) {
        throw new ConflictError(`Steps must have sequential ordering starting from 1`);
      }
    }

    // Create template
    const template = await TemplateRepository.create(validData);

    return template;
  }

  /**
   * Get template by ID
   *
   * @param templateId - Template ID
   * @returns Template or throws NotFoundError
   */
  async getTemplate(templateId: string): Promise<Template> {
    const template = await TemplateRepository.findByTemplateId(templateId);

    if (!template) {
      throw new NotFoundError(`Template with ID ${templateId} not found`);
    }

    return template;
  }

  /**
   * List templates with filtering and pagination
   *
   * @param query - Query parameters
   * @returns Templates and pagination metadata
   */
  async listTemplates(query: unknown): Promise<{
    templates: Template[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { templates, total } = await TemplateRepository.findAll(query);

    // Extract pagination from query
    const validQuery = query as ListTemplatesQuery;
    const page = validQuery.page || 1;
    const limit = validQuery.limit || 20;

    return {
      templates,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update template
   * Increments version automatically
   *
   * @param templateId - Template ID
   * @param data - Update data
   * @returns Updated template
   */
  async updateTemplate(templateId: string, data: unknown): Promise<Template> {
    // Defensive: validate input
    const validData = validateSchema(UpdateTemplateSchema, data, 'Invalid template update data');

    // Check template exists
    const exists = await TemplateRepository.exists(templateId);
    if (!exists) {
      throw new NotFoundError(`Template with ID ${templateId} not found`);
    }

    // If updating steps, validate step rules
    if (validData.steps) {
      // Business rule: Validate step IDs are unique
      const stepIds = validData.steps.map((s) => s.stepId);
      const uniqueStepIds = new Set(stepIds);
      if (stepIds.length !== uniqueStepIds.size) {
        throw new ConflictError('Step IDs must be unique within a template');
      }

      // Business rule: Validate step ordering
      const sortedSteps = [...validData.steps].sort((a, b) => a.order - b.order);
      for (let i = 0; i < sortedSteps.length; i++) {
        if (sortedSteps[i]!.order !== i + 1) {
          throw new ConflictError(`Steps must have sequential ordering starting from 1`);
        }
      }
    }

    // Update template (version increment happens in repository)
    const template = await TemplateRepository.update(templateId, validData);

    return template;
  }

  /**
   * Delete template
   *
   * @param templateId - Template ID
   * @returns True if deleted
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    // Check template exists
    const exists = await TemplateRepository.exists(templateId);
    if (!exists) {
      throw new NotFoundError(`Template with ID ${templateId} not found`);
    }

    // Delete template
    await TemplateRepository.delete(templateId);

    return true;
  }

  /**
   * Validate step ordering
   * Helper method to ensure steps have sequential ordering
   *
   * @param steps - Array of steps
   * @returns True if valid
   */
  private validateStepOrdering(steps: Array<{ order: number }>): boolean {
    const orders = steps.map((s) => s.order).sort((a, b) => a - b);

    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        return false;
      }
    }

    return true;
  }
}

export default new TemplateService();
