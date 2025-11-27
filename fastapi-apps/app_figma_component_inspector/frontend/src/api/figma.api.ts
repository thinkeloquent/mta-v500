/**
 * Figma API Client
 *
 * Frontend API client for communicating with the backend.
 * Uses defensive programming with runtime validation.
 */

const API_BASE = '/api';

/**
 * Fetch with error handling
 */
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data as T;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Get Figma File
 */
export async function getFigmaFile(fileId: string) {
  if (!fileId || typeof fileId !== 'string') {
    throw new Error('Invalid fileId');
  }
  return fetchApi(`/figma/files/${encodeURIComponent(fileId)}`);
}

/**
 * Get Component Images
 */
export async function getComponentImages(
  fileId: string,
  nodeIds: string[],
  scale = 2,
  format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png',
) {
  if (!fileId || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    throw new Error('Invalid parameters');
  }

  const nodeIdsParam = nodeIds.join(',');
  return fetchApi(
    `/figma/images/${encodeURIComponent(fileId)}?nodeIds=${encodeURIComponent(nodeIdsParam)}&scale=${scale}&format=${format}`,
  );
}

/**
 * Get File Variables
 */
export async function getFileVariables(fileId: string) {
  if (!fileId) {
    throw new Error('Invalid fileId');
  }
  return fetchApi(`/figma/variables/${encodeURIComponent(fileId)}`);
}

/**
 * Get Node Details
 */
export async function getNodeDetails(fileId: string, nodeId: string) {
  if (!fileId || !nodeId) {
    throw new Error('Invalid parameters');
  }
  return fetchApi(`/figma/node/${encodeURIComponent(fileId)}/${encodeURIComponent(nodeId)}`);
}

/**
 * Get Comments from Figma API
 * Returns comments directly from Figma for the specified file
 */
export async function getComments(fileId: string) {
  if (!fileId) {
    throw new Error('Invalid fileId');
  }

  try {
    const response = await fetch(`${API_BASE}/figma/files/${encodeURIComponent(fileId)}/comments`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.comments || [];
  } catch (error) {
    console.error('Failed to fetch Figma comments:', error);
    throw error;
  }
}
