import { ChecklistInstance, ChecklistStep } from '../models/index.js';
import { sequelize } from '../database/index.js';
import { validateSchema } from '../zod-schema-contract/common/index.js';
import { ListChecklistsQuery, ListChecklistsQuerySchema } from '../zod-schema-contract/checklists/index.js';

/**
 * Checklist Repository
 * Data access layer for checklist instance operations with defensive validation
 */
export class ChecklistRepository {
  /**
   * Find checklist instance by checklist_id
   *
   * @param checklistId - Checklist ID
   * @returns Checklist instance or null if not found
   */
  async findByChecklistId(checklistId: unknown): Promise<ChecklistInstance | null> {
    // Defensive: validate input
    if (typeof checklistId !== 'string' || !checklistId) {
      throw new Error('Invalid checklist ID');
    }

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
   * Find all checklist instances with optional filtering and pagination
   *
   * @param query - Query parameters
   * @returns Checklists and count
   */
  async findAll(query: unknown): Promise<{ checklists: ChecklistInstance[]; total: number }> {
    // Defensive: validate input
    const validQuery = validateSchema(
      ListChecklistsQuerySchema,
      query,
      'Invalid query parameters'
    );

    const { page, limit, templateRef, sortBy, sortOrder } = validQuery;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (templateRef) {
      where.templateRef = templateRef;
    }

    // Execute query
    const { count, rows } = await ChecklistInstance.findAndCountAll({
      where,
      include: [
        {
          model: ChecklistStep,
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
      checklists: rows,
      total: count,
    };
  }

  /**
   * Check if checklist exists
   *
   * @param checklistId - Checklist ID
   * @returns True if exists
   */
  async exists(checklistId: unknown): Promise<boolean> {
    // Defensive: validate input
    if (typeof checklistId !== 'string' || !checklistId) {
      return false;
    }

    const count = await ChecklistInstance.count({
      where: { checklistId },
    });

    return count > 0;
  }

  /**
   * Get checklists by template reference
   *
   * @param templateRef - Template ID reference
   * @returns Array of checklist instances
   */
  async findByTemplateRef(templateRef: unknown): Promise<ChecklistInstance[]> {
    // Defensive: validate input
    if (typeof templateRef !== 'string' || !templateRef) {
      throw new Error('Invalid template reference');
    }

    const instances = await ChecklistInstance.findAll({
      where: { templateRef },
      include: [
        {
          model: ChecklistStep,
          as: 'steps',
          required: false,
        },
      ],
      order: [
        ['generatedAt', 'DESC'],
        [{ model: ChecklistStep, as: 'steps' }, 'order', 'ASC'],
      ],
    });

    return instances;
  }
}

export default new ChecklistRepository();
