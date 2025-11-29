import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Template, ListTemplatesQuery, CreateTemplateRequest, UpdateTemplateRequest } from '../types/api.types';
import { templateService } from '../services/templates.service';
import { getErrorMessage } from '../services/api.client';

/**
 * Template Store State
 */
interface TemplateState {
  // Data
  templates: Template[];
  selectedTemplate: Template | null;
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  total: number;

  // Actions
  fetchTemplates: (query?: ListTemplatesQuery) => Promise<void>;
  fetchTemplate: (templateId: string) => Promise<void>;
  createTemplate: (data: CreateTemplateRequest) => Promise<Template | null>;
  updateTemplate: (templateId: string, data: UpdateTemplateRequest) => Promise<Template | null>;
  setSelectedTemplate: (template: Template | null) => void;
  clearError: () => void;
}

/**
 * Template Store
 * Global state management for templates
 */
export const useTemplateStore = create<TemplateState>()(
  devtools(
    (set) => ({
      // Initial state
      templates: [],
      selectedTemplate: null,
      loading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      total: 0,

      // Fetch all templates
      fetchTemplates: async (query?: ListTemplatesQuery) => {
        set({ loading: true, error: null });
        try {
          const result = await templateService.listTemplates(query);
          set({
            templates: result.templates,
            currentPage: result.meta.page,
            totalPages: result.meta.totalPages,
            total: result.meta.total,
            loading: false,
          });
        } catch (error) {
          set({
            error: getErrorMessage(error),
            loading: false,
          });
        }
      },

      // Fetch single template
      fetchTemplate: async (templateId: string) => {
        set({ loading: true, error: null });
        try {
          const template = await templateService.getTemplate(templateId);
          set({
            selectedTemplate: template,
            loading: false,
          });
        } catch (error) {
          set({
            error: getErrorMessage(error),
            loading: false,
          });
        }
      },

      // Create new template
      createTemplate: async (data: CreateTemplateRequest) => {
        set({ loading: true, error: null });
        try {
          const template = await templateService.createTemplate(data);
          set((state) => ({
            templates: [...state.templates, template],
            loading: false,
          }));
          return template;
        } catch (error) {
          set({
            error: getErrorMessage(error),
            loading: false,
          });
          return null;
        }
      },

      // Update existing template
      updateTemplate: async (templateId: string, data: UpdateTemplateRequest) => {
        set({ loading: true, error: null });
        try {
          const template = await templateService.updateTemplate(templateId, data);
          set((state) => ({
            templates: state.templates.map((t) =>
              t.templateId === templateId ? template : t
            ),
            selectedTemplate: state.selectedTemplate?.templateId === templateId ? template : state.selectedTemplate,
            loading: false,
          }));
          return template;
        } catch (error) {
          set({
            error: getErrorMessage(error),
            loading: false,
          });
          return null;
        }
      },

      // Set selected template
      setSelectedTemplate: (template: Template | null) => {
        set({ selectedTemplate: template });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'TemplateStore' }
  )
);
