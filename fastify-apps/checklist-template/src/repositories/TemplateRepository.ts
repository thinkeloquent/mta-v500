import { Transaction, Op } from 'sequelize';

import { Template, Step } from '../models/index.js';
import { sequelize } from '../database/index.js';
import { validateSchema } from '../zod-schema-contract/common/index.js';
import {
  CreateTemplateSchema,
  CreateTemplateInput,
  UpdateTemplateSchema,
  UpdateTemplateInput,
  ListTemplatesQuery,
  ListTemplatesQuerySchema,
} from '../zod-schema-contract/templates/index.js';
import { NotFoundError } from '../plugins/errorHandler.js';

/**
 * Template Repository
 * Data access layer for template operations with defensive validation
 */
export class TemplateRepository {
  /**
   * Create a new template with steps
   * Uses transaction to ensure atomicity
   *
   * @param data - Template creation data
   * @param transaction - Optional transaction
   * @returns Created template with steps
   */
  async create(data: unknown, transaction?: Transaction): Promise<Template> {
    // Defensive: validate input
    const validData = validateSchema(CreateTemplateSchema, data, 'Invalid template creation data');

    const t = transaction || await sequelize.transaction();

    try {
      // Create template
      const template = await Template.create(
        {
          templateId: validData.templateId,
          name: validData.name,
          description: validData.description || null,
          category: validData.category,
          version: 1,
        },
        { transaction: t }
      );

      // Create steps
      const steps = await Promise.all(
        validData.steps.map((step) =>
          Step.create(
            {
              stepId: step.stepId,
              templateId: validData.templateId,
              order: step.order,
              title: step.title,
              description: step.description || null,
              required: step.required,
              tags: step.tags,
              dependencies: step.dependencies || [],
            },
            { transaction: t }
          )
        )
      );

      // Commit transaction if we created it
      if (!transaction) {
        await t.commit();
      }

      // Load template with steps
      const createdTemplate = await this.findByTemplateId(validData.templateId);
      if (!createdTemplate) {
        throw new Error('Failed to load created template');
      }

      return createdTemplate;
    } catch (error) {
      // Rollback transaction if we created it
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  /**
   * Find template by template_id (not database id)
   *
   * @param templateId - Template ID
   * @returns Template or null if not found
   */
  async findByTemplateId(templateId: unknown): Promise<Template | null> {
    // Defensive: validate input
    if (typeof templateId !== 'string' || !templateId) {
      throw new Error('Invalid template ID');
    }

    const template = await Template.findOne({
      where: { templateId },
      include: [
        {
          model: Step,
          as: 'steps',
          required: false,
        },
      ],
      order: [[{ model: Step, as: 'steps' }, 'order', 'ASC']],
    });

    return template;
  }

  /**
   * Find all templates with optional filtering and pagination
   *
   * @param query - Query parameters
   * @returns Templates and count
   */
  async findAll(query: unknown): Promise<{ templates: Template[]; total: number }> {
    // Defensive: validate input
    const validQuery = validateSchema(ListTemplatesQuerySchema, query, 'Invalid query parameters');

    const { page, limit, category, search, sortBy, sortOrder } = validQuery;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    // Execute query
    const { count, rows } = await Template.findAndCountAll({
      where,
      include: [
        {
          model: Step,
          as: 'steps',
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit,
      offset,
      distinct: true,
    });

    return {
      templates: rows,
      total: count,
    };
  }

  /**
   * Update template and optionally its steps
   *
   * @param templateId - Template ID
   * @param data - Update data
   * @param transaction - Optional transaction
   * @returns Updated template
   */
  async update(templateId: unknown, data: unknown, transaction?: Transaction): Promise<Template> {
    // Defensive: validate inputs
    if (typeof templateId !== 'string' || !templateId) {
      throw new Error('Invalid template ID');
    }
    const validData = validateSchema(UpdateTemplateSchema, data, 'Invalid template update data');

    const t = transaction || await sequelize.transaction();

    try {
      // Find template
      const template = await Template.findOne({
        where: { templateId },
        transaction: t,
      });

      if (!template) {
        throw new NotFoundError(`Template with ID ${templateId} not found`);
      }

      // Update template fields
      if (validData.name) template.name = validData.name;
      if (validData.description !== undefined) template.description = validData.description;
      if (validData.category) template.category = validData.category;

      // Increment version
      template.version += 1;

      await template.save({ transaction: t });

      // Update steps if provided
      if (validData.steps) {
        // Delete existing steps
        await Step.destroy({
          where: { templateId },
          transaction: t,
        });

        // Create new steps
        await Promise.all(
          validData.steps.map((step) =>
            Step.create(
              {
                stepId: step.stepId,
                templateId,
                order: step.order,
                title: step.title,
                description: step.description || null,
                required: step.required,
                tags: step.tags,
                dependencies: step.dependencies || [],
              },
              { transaction: t }
            )
          )
        );
      }

      // Commit transaction if we created it
      if (!transaction) {
        await t.commit();
      }

      // Load updated template
      const updatedTemplate = await this.findByTemplateId(templateId);
      if (!updatedTemplate) {
        throw new Error('Failed to load updated template');
      }

      return updatedTemplate;
    } catch (error) {
      // Rollback transaction if we created it
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  /**
   * Delete template (and cascade delete steps)
   *
   * @param templateId - Template ID
   * @param transaction - Optional transaction
   * @returns True if deleted
   */
  async delete(templateId: unknown, transaction?: Transaction): Promise<boolean> {
    // Defensive: validate input
    if (typeof templateId !== 'string' || !templateId) {
      throw new Error('Invalid template ID');
    }

    const t = transaction || await sequelize.transaction();

    try {
      const template = await Template.findOne({
        where: { templateId },
        transaction: t,
      });

      if (!template) {
        throw new NotFoundError(`Template with ID ${templateId} not found`);
      }

      await template.destroy({ transaction: t });

      // Commit transaction if we created it
      if (!transaction) {
        await t.commit();
      }

      return true;
    } catch (error) {
      // Rollback transaction if we created it
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  /**
   * Check if template exists
   *
   * @param templateId - Template ID
   * @returns True if exists
   */
  async exists(templateId: unknown): Promise<boolean> {
    // Defensive: validate input
    if (typeof templateId !== 'string' || !templateId) {
      return false;
    }

    const count = await Template.count({
      where: { templateId },
    });

    return count > 0;
  }
}

export default new TemplateRepository();
