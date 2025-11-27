/**
 * TypeScript types matching backend Pydantic schemas
 */

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
}

export interface File {
  id: string;
  project_id: string;
  name: string;
  path: string | null;
  content: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface FileCreate {
  project_id: string;
  name: string;
  path?: string | null;
  content?: string;
  language?: string;
}

export interface FileUpdate {
  name?: string;
  path?: string | null;
  content?: string;
  language?: string;
}

export interface ProjectWithFiles extends Project {
  files: File[];
}

export interface ESMModule {
  content: string;
  file_path: string;
  language: string;
}
