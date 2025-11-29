import { apiClient } from './api.client';
import type {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ListTemplatesQuery,
  ApiSuccessResponse,
  PaginationMeta,
} from '../types/api.types';

/**
 * Template Service
 * API calls for template management
 */

const BASE_PATH = '/api/checklist-template/templates';

export const templateService = {
  /**
   * Get all templates with pagination and filters
   */
  async listTemplates(query?: ListTemplatesQuery): Promise<{
    templates: Template[];
    meta: PaginationMeta;
  }> {
    const response = await apiClient.get<
      ApiSuccessResponse<Template[]> & { meta: PaginationMeta }
    >(BASE_PATH, { params: query });
    return {
      templates: response.data.data,
      meta: response.data.meta!,
    };
  },

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<Template> {
    const response = await apiClient.get<ApiSuccessResponse<Template>>(
      `${BASE_PATH}/${templateId}`
    );
    return response.data.data;
  },

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<Template> {
    const response = await apiClient.post<ApiSuccessResponse<Template>>(
      BASE_PATH,
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    data: UpdateTemplateRequest
  ): Promise<Template> {
    const response = await apiClient.put<ApiSuccessResponse<Template>>(
      `${BASE_PATH}/${templateId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`${BASE_PATH}/${templateId}`);
  },
};
