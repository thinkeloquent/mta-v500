import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ChecklistInstance,
  GenerateChecklistRequest,
  ListChecklistsQuery,
} from '../types/api.types';
import { checklistService } from '../services/checklists.service';
import { getErrorMessage } from '../services/api.client';

/**
 * Checklist Store State
 */
interface ChecklistState {
  // Data
  checklists: ChecklistInstance[];
  selectedChecklist: ChecklistInstance | null;
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  total: number;

  // Actions
  generateChecklist: (data: GenerateChecklistRequest) => Promise<ChecklistInstance | null>;
  fetchChecklists: (query?: ListChecklistsQuery) => Promise<void>;
  fetchChecklist: (checklistId: string) => Promise<void>;
  setSelectedChecklist: (checklist: ChecklistInstance | null) => void;
  clearError: () => void;
}

/**
 * Checklist Store
 * Global state management for checklists
 */
export const useChecklistStore = create<ChecklistState>()(
  devtools(
    (set) => ({
      // Initial state
      checklists: [],
      selectedChecklist: null,
      loading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      total: 0,

      // Generate checklist from template
      generateChecklist: async (data: GenerateChecklistRequest) => {
        set({ loading: true, error: null });
        try {
          const checklist = await checklistService.generateChecklist(data);
          set({
            selectedChecklist: checklist,
            loading: false,
          });
          return checklist;
        } catch (error) {
          set({
            error: getErrorMessage(error),
            loading: false,
          });
          return null;
        }
      },

      // Fetch all checklists
      fetchChecklists: async (query?: ListChecklistsQuery) => {
        set({ loading: true, error: null });
        try {
          const result = await checklistService.listChecklists(query);
          set({
            checklists: result.checklists,
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

      // Fetch single checklist
      fetchChecklist: async (checklistId: string) => {
        set({ loading: true, error: null });
        try {
          const checklist = await checklistService.getChecklist(checklistId);
          set({
            selectedChecklist: checklist,
            loading: false,
          });
        } catch (error) {
          set({
            error: getErrorMessage(error),
            loading: false,
          });
        }
      },

      // Set selected checklist
      setSelectedChecklist: (checklist: ChecklistInstance | null) => {
        set({ selectedChecklist: checklist });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'ChecklistStore' }
  )
);
