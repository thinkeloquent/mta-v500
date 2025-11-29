import { ChecklistInstance } from '../models/index.js';
import ChecklistGenerationService from './ChecklistGenerationService.js';
import ChecklistRepository from '../repositories/ChecklistRepository.js';
import { NotFoundError } from '../plugins/errorHandler.js';
import { ListChecklistsQuery } from '../zod-schema-contract/checklists/index.js';

/**
 * ChecklistService
 * Business logic layer for checklist operations
 */
export class ChecklistService {
  /**
   * Generate a new checklist from a template
   *
   * @param data - Generation parameters
   * @returns Generated checklist instance
   */
  async generateChecklist(data: unknown): Promise<ChecklistInstance> {
    return await ChecklistGenerationService.generateFromTemplate(data);
  }

  /**
   * Get checklist by ID
   *
   * @param checklistId - Checklist ID
   * @returns Checklist instance or throws NotFoundError
   */
  async getChecklist(checklistId: string): Promise<ChecklistInstance> {
    const checklist = await ChecklistRepository.findByChecklistId(checklistId);

    if (!checklist) {
      throw new NotFoundError(`Checklist with ID ${checklistId} not found`);
    }

    return checklist;
  }

  /**
   * List checklists with filtering and pagination
   *
   * @param query - Query parameters
   * @returns Checklists and pagination metadata
   */
  async listChecklists(query: unknown): Promise<{
    checklists: ChecklistInstance[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { checklists, total } = await ChecklistRepository.findAll(query);

    // Extract pagination from query
    const validQuery = query as ListChecklistsQuery;
    const page = validQuery.page || 1;
    const limit = validQuery.limit || 20;

    return {
      checklists,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get checklists generated from a specific template
   *
   * @param templateRef - Template ID reference
   * @returns Array of checklist instances
   */
  async getChecklistsByTemplate(templateRef: string): Promise<ChecklistInstance[]> {
    return await ChecklistRepository.findByTemplateRef(templateRef);
  }
}

export default new ChecklistService();
