/**
 * API service layer for backend integration
 */

import type {
  ESMModule,
  File,
  FileCreate,
  FileUpdate,
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectWithFiles,
} from '../types';

// API base URL - use environment variable for backend API domain, fallback to relative URL for production
const BACKEND_DOMAIN = import.meta.env.VITE_BACKEND_API_DOMAIN || '';
const API_BASE = BACKEND_DOMAIN
  ? `${BACKEND_DOMAIN}/api/apps/react-component-esm`
  : '/api/apps/react-component-esm';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Projects API
 */
export const projectsAPI = {
  /**
   * Get all projects
   */
  list: async (): Promise<Project[]> => {
    return fetchJSON<Project[]>(`${API_BASE}/projects`);
  },

  /**
   * Get a single project by ID
   */
  get: async (id: string): Promise<ProjectWithFiles> => {
    return fetchJSON<ProjectWithFiles>(`${API_BASE}/projects/${id}`);
  },

  /**
   * Create a new project
   */
  create: async (data: ProjectCreate): Promise<Project> => {
    return fetchJSON<Project>(`${API_BASE}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a project
   */
  update: async (id: string, data: ProjectUpdate): Promise<Project> => {
    return fetchJSON<Project>(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a project
   */
  delete: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Files API
 */
export const filesAPI = {
  /**
   * Get all files (optionally filtered by project_id)
   */
  list: async (projectId?: string): Promise<File[]> => {
    const url = projectId ? `${API_BASE}/files?project_id=${projectId}` : `${API_BASE}/files`;
    return fetchJSON<File[]>(url);
  },

  /**
   * Get a single file by ID
   */
  get: async (id: string): Promise<File> => {
    return fetchJSON<File>(`${API_BASE}/files/${id}`);
  },

  /**
   * Create a new file
   */
  create: async (data: FileCreate): Promise<File> => {
    return fetchJSON<File>(`${API_BASE}/files`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a file
   */
  update: async (id: string, data: FileUpdate): Promise<File> => {
    return fetchJSON<File>(`${API_BASE}/files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a file
   */
  delete: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/files/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * ESM API
 */
export const esmAPI = {
  /**
   * Get ESM module by project_id and file_id
   */
  getByFileId: async (projectId: string, fileId: string): Promise<ESMModule> => {
    return fetchJSON<ESMModule>(`${API_BASE}/esm/${projectId}/${fileId}`);
  },

  /**
   * Get ESM module by project_id and file_path
   */
  getByPath: async (projectId: string, filePath: string): Promise<ESMModule> => {
    return fetchJSON<ESMModule>(`${API_BASE}/esm/${projectId}/path/${filePath}`);
  },
};
