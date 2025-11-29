import { apiClient } from './api.client';
import type {
  ChecklistInstance,
  GenerateChecklistRequest,
  ListChecklistsQuery,
  ApiSuccessResponse,
  PaginationMeta,
} from '../types/api.types';

/**
 * Checklist Service
 * API calls for checklist instance management
 */

const BASE_PATH = '/api/checklist-template/checklists';

export const checklistService = {
  /**
   * Generate a new checklist from a template
   */
  async generateChecklist(
    data: GenerateChecklistRequest
  ): Promise<ChecklistInstance> {
    const response = await apiClient.post<ApiSuccessResponse<ChecklistInstance>>(
      BASE_PATH,
      data
    );
    return response.data.data;
  },

  /**
   * Get all checklists with pagination and filters
   */
  async listChecklists(query?: ListChecklistsQuery): Promise<{
    checklists: ChecklistInstance[];
    meta: PaginationMeta;
  }> {
    const response = await apiClient.get<
      ApiSuccessResponse<ChecklistInstance[]> & { meta: PaginationMeta }
    >(BASE_PATH, { params: query });
    return {
      checklists: response.data.data,
      meta: response.data.meta!,
    };
  },

  /**
   * Get a single checklist by ID
   */
  async getChecklist(checklistId: string): Promise<ChecklistInstance> {
    const response = await apiClient.get<ApiSuccessResponse<ChecklistInstance>>(
      `${BASE_PATH}/${checklistId}`
    );
    return response.data.data;
  },
};
