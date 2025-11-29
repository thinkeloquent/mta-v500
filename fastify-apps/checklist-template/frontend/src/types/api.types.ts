/**
 * API Type Definitions
 * Mirrors backend data models and API responses
 */

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

// ============================================================================
// Template Types
// ============================================================================

export interface Step {
  id?: number;
  stepId: string;
  templateId?: string;
  order: number;
  title: string;
  description: string | null;
  required: boolean;
  tags: string[];
  dependencies: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Template {
  id: number;
  templateId: string;
  name: string;
  description: string | null;
  category: string;
  version: number;
  steps: Step[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  templateId: string;
  name: string;
  description?: string;
  category: string;
  steps: Omit<Step, 'id' | 'createdAt' | 'updatedAt' | 'templateId'>[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  steps?: Omit<Step, 'id' | 'createdAt' | 'updatedAt' | 'templateId'>[];
}

export interface ListTemplatesQuery {
  page?: number;
  limit?: number;
  category?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

// ============================================================================
// Checklist Types
// ============================================================================

export interface ChecklistStep {
  id?: number;
  checklistId: string;
  order: number;
  title: string;
  description: string | null;
  required: boolean;
  tags: string[];
  dependencies: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ChecklistMetadata {
  templateVersion: number;
  parameters: Record<string, unknown>;
  generatedFrom: string;
}

export interface ChecklistInstance {
  checklistId: string;
  templateRef: string;
  generatedAt: string;
  metadata: ChecklistMetadata;
  steps: ChecklistStep[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateChecklistRequest {
  templateId: string;
  parameters?: Record<string, unknown>;
}

export interface ListChecklistsQuery {
  page?: number;
  limit?: number;
  templateRef?: string;
  sortBy?: 'generatedAt' | 'checklistId' | 'createdAt';
  order?: 'asc' | 'desc';
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}
