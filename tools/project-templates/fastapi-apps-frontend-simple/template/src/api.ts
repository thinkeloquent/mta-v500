/**
 * API Client for {{APP_NAME_TITLE}}
 *
 * This module provides functions to interact with the FastAPI backend.
 */

// Base URL for API requests - uses host-relative path
const API_BASE = '';

/**
 * Health check response from the API
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version?: string;
}

/**
 * Generic API error
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper with error handling
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError(
        `API request failed: ${response.statusText}`,
        response.status,
        response.statusText,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Failed to connect to API at ${url}`);
  }
}

/**
 * Fetch health check from the API
 */
export async function fetchHealthCheck(): Promise<HealthCheckResponse> {
  return fetchApi<HealthCheckResponse>('/health');
}

// =============================================================================
// Add your API functions below
// =============================================================================

// Example:
// export async function fetchItems(): Promise<Item[]> {
//   return fetchApi<Item[]>('/api/items');
// }
//
// export async function createItem(data: CreateItemRequest): Promise<Item> {
//   return fetchApi<Item>('/api/items', {
//     method: 'POST',
//     body: JSON.stringify(data),
//   });
// }
