import { Transaction } from 'sequelize';

import { ChecklistInstance, ChecklistStep } from '../models/index.js';
import { sequelize } from '../database/index.js';
import TemplateRepository from '../repositories/TemplateRepository.js';
import { validateSchema } from '../zod-schema-contract/common/index.js';
import { GenerateChecklistSchema, GenerateChecklistInput } from '../zod-schema-contract/checklists/index.js';
import { NotFoundError } from '../plugins/errorHandler.js';

/**
 * ChecklistGenerationService
 * Core transformation engine that converts templates into checklist instances
 */
export class ChecklistGenerationService {
  /**
   * Generate a checklist instance from a template
   * Applies parameterization and creates unique instance
   *
   * @param data - Generation parameters (templateId, parameters)
   * @returns Created checklist instance with steps
   */
  async generateFromTemplate(data: unknown): Promise<ChecklistInstance> {
    // Defensive: validate input
    const validData = validateSchema(
      GenerateChecklistSchema,
      data,
      'Invalid checklist generation data'
    );

    const transaction = await sequelize.transaction();

    try {
      // Fetch template with steps
      const template = await TemplateRepository.findByTemplateId(validData.templateId);

      if (!template) {
        throw new NotFoundError(`Template with ID ${validData.templateId} not found`);
      }

      // Validate template has steps
      if (!template.steps || template.steps.length === 0) {
        throw new Error(`Template ${validData.templateId} has no steps`);
      }

      // Generate unique checklist ID
      const checklistId = this.generateChecklistId(validData.templateId);

      // Create checklist instance
      const checklistInstance = await ChecklistInstance.create(
        {
          checklistId,
          templateRef: validData.templateId,
          generatedAt: new Date(),
          metadata: {
            templateVersion: template.version,
            parameters: validData.parameters || {},
            generatedFrom: validData.templateId,
          },
        },
        { transaction }
      );

      // Clone steps with parameterization
      const checklistSteps = await Promise.all(
        template.steps.map((templateStep) => {
          const title = this.applyParameterization(templateStep.title, validData.parameters || {});
          const description = templateStep.description
            ? this.applyParameterization(templateStep.description, validData.parameters || {})
            : null;

          return ChecklistStep.create(
            {
              checklistId,
              order: templateStep.order,
              title,
              description,
              required: templateStep.required,
              tags: [...templateStep.tags],
              dependencies: [...templateStep.dependencies],
            },
            { transaction }
          );
        })
      );

      // Commit transaction
      await transaction.commit();

      // Load complete instance with steps
      const result = await this.findByChecklistId(checklistId);
      if (!result) {
        throw new Error('Failed to load generated checklist');
      }

      return result;
    } catch (error) {
      // Rollback on error
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Find checklist instance by ID
   *
   * @param checklistId - Checklist ID
   * @returns Checklist instance with steps or null
   */
  async findByChecklistId(checklistId: string): Promise<ChecklistInstance | null> {
    const instance = await ChecklistInstance.findOne({
      where: { checklistId },
      include: [
        {
          model: ChecklistStep,
          as: 'steps',
          required: false,
        },
      ],
      order: [[{ model: ChecklistStep, as: 'steps' }, 'order', 'ASC']],
    });

    return instance;
  }

  /**
   * Generate unique checklist ID
   * Format: {templateId}-{timestamp}-{random}
   *
   * @param templateId - Base template ID
   * @returns Unique checklist ID
   */
  private generateChecklistId(templateId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${templateId}-${timestamp}-${random}`;
  }

  /**
   * Apply parameter substitution to text
   * Replaces placeholders like {{ParameterName}} with actual values
   *
   * @param text - Text with placeholders
   * @param parameters - Parameter values
   * @returns Text with substitutions applied
   */
  private applyParameterization(text: string, parameters: Record<string, unknown>): string {
    let result = text;

    // Replace all {{ParameterName}} placeholders
    Object.entries(parameters).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement = String(value);
      result = result.replace(new RegExp(placeholder, 'g'), replacement);
    });

    return result;
  }
}

export default new ChecklistGenerationService();
