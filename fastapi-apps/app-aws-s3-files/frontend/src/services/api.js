// API service for communicating with the backend
//
// This module provides defensive programming patterns including:
// - Request/response logging with correlation IDs
// - Comprehensive null/undefined checks
// - Input validation before sending requests
// - Detailed error context for debugging
// - Retry logic for transient failures

const API_BASE_URL = '/api/apps/aws-s3-files';

// Configuration
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Helper: Log API operations to console
const logApiCall = (method, url, details = {}) => {
  if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_API) {
    const timestamp = new Date().toISOString();
    console.log(`[API ${timestamp}] ${method} ${url}`, details);
  }
};

// Helper: Log errors with full context
const logApiError = (method, url, error, context = {}) => {
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    method,
    url,
    status: error.status || 'unknown',
    message: error.message,
    correlationId: error.correlationId,
    ...context,
  };

  console.error(`[API ERROR ${timestamp}] ${method} ${url}`, errorDetails, error);
};

// Helper: Safely encode file keys with validation
const encodeFileKey = (key) => {
  // Defensive: Validate input
  if (key === null || key === undefined) {
    throw new Error('File key cannot be null or undefined');
  }

  if (typeof key !== 'string') {
    throw new Error(`File key must be a string, got ${typeof key}`);
  }

  if (key.trim() === '') {
    throw new Error('File key cannot be empty');
  }

  // Simply encode the key properly - S3 API returns clean, unencoded keys
  return encodeURIComponent(key);
};

// Helper: Validate bucket name
const validateBucketName = (bucket) => {
  if (!bucket || typeof bucket !== 'string' || bucket.trim() === '') {
    throw new Error('Bucket name is required and must be a non-empty string');
  }
  return bucket.trim();
};

// Helper: Sleep for retry delays
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Enhanced API Error class
class ApiError extends Error {
  constructor(message, status, data, correlationId = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data || {};
    this.correlationId = correlationId;
    this.code = data?.code;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      data: this.data,
    };
  }
}

const apiRequest = async (url, options = {}, retryCount = 0) => {
  const method = options.method || 'GET';
  const startTime = performance.now();

  // Defensive: Validate URL
  if (!url || typeof url !== 'string') {
    throw new Error(`Invalid URL: ${url}`);
  }

  logApiCall(method, url, {
    attempt: retryCount + 1,
    maxRetries: MAX_RETRIES,
    hasBody: !!options.body,
  });

  const config = {
    headers: {
      ...options.headers,
    },
    ...options,
    signal: options.signal || AbortSignal.timeout(options.timeout || DEFAULT_TIMEOUT_MS),
  };

  // Only set Content-Type for JSON requests with body (not for FormData)
  if (options.body && !(options.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);
    const duration = performance.now() - startTime;

    // Extract correlation ID from response headers
    const correlationId =
      response.headers.get('x-correlation-id') || response.headers.get('x-request-id');

    if (!response.ok) {
      let errorData;
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : { message: 'No error details provided' };
      } catch (parseError) {
        errorData = { message: 'Failed to parse error response', parseError: parseError.message };
      }

      // Log error response
      logApiCall(method, url, {
        status: response.status,
        duration: `${duration.toFixed(2)}ms`,
        error: errorData,
        correlationId,
      });

      // Enhanced error messages for common status codes
      let errorMessage = errorData?.message || `HTTP ${response.status}`;

      if (response.status === 400) {
        errorMessage = errorData?.message || 'Invalid request. Please check your input.';
      } else if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in.';
      } else if (response.status === 403) {
        errorMessage = errorData?.message || "Access denied. You don't have permission.";
      } else if (response.status === 404) {
        errorMessage = errorData?.message || 'Resource not found. It may have been deleted.';
      } else if (response.status === 409) {
        errorMessage =
          errorData?.message || 'Conflict. The resource may already exist or be in use.';
      } else if (response.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (response.status === 504) {
        errorMessage = 'Request timeout. The operation took too long.';
      } else if (response.status >= 500) {
        errorMessage = errorData?.message || 'Server error. Please try again later.';
      }

      const error = new ApiError(errorMessage, response.status, errorData, correlationId);

      // Retry logic for transient errors
      if (RETRYABLE_STATUS_CODES.includes(response.status) && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * (retryCount + 1); // Exponential backoff
        console.warn(
          `[API] Retrying ${method} ${url} after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
        );
        await sleep(delay);
        return apiRequest(url, options, retryCount + 1);
      }

      logApiError(method, url, error, { duration: `${duration.toFixed(2)}ms` });
      throw error;
    }

    // Success - log response
    logApiCall(method, url, {
      status: response.status,
      duration: `${duration.toFixed(2)}ms`,
      correlationId,
    });

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();

      // Defensive: Validate response structure
      if (data === null || data === undefined) {
        console.warn(`[API] Received null/undefined response from ${method} ${url}`);
        return {};
      }

      console.log(`[API] Response data structure from ${method} ${url}:`, {
        dataType: typeof data,
        isArray: Array.isArray(data),
        keys: Object.keys(data || {}),
        dataPreview: data,
      });

      return data;
    }

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;

    if (error instanceof ApiError) {
      throw error;
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      const timeoutError = new ApiError(
        `Request timeout after ${(options.timeout || DEFAULT_TIMEOUT_MS) / 1000}s`,
        408,
        { message: 'Request timed out', timeout: options.timeout || DEFAULT_TIMEOUT_MS },
      );
      logApiError(method, url, timeoutError, { duration: `${duration.toFixed(2)}ms` });
      throw timeoutError;
    }

    // Network or other errors
    const networkError = new ApiError(error.message || 'Network error', 0, {
      message: 'Unable to connect to server',
      originalError: error.message,
    });
    logApiError(method, url, networkError, { duration: `${duration.toFixed(2)}ms` });
    throw networkError;
  }
};

// Bucket API methods with defensive validation
export const bucketApi = {
  // List all buckets
  list: async () => {
    console.log('[bucketApi.list] Fetching buckets from /buckets');
    const response = await apiRequest('/buckets');
    console.log('[bucketApi.list] Response received:', {
      responseType: typeof response,
      hasSuccess: 'success' in response,
      hasBuckets: 'buckets' in response,
      bucketsLength: response?.buckets?.length,
      bucketsPreview: response?.buckets?.slice(0, 2),
      fullResponse: response,
    });
    return response;
  },

  // Create new bucket
  create: async (name, region = 'us-east-1') => {
    // Defensive: Validate inputs
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Bucket name is required and must be a non-empty string');
    }

    if (!region || typeof region !== 'string') {
      throw new Error('Region must be a string');
    }

    return apiRequest('/buckets', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), region }),
    });
  },

  // Delete bucket
  delete: async (name) => {
    // Defensive: Validate bucket name
    const validatedName = validateBucketName(name);

    return apiRequest(`/buckets/${encodeURIComponent(validatedName)}`, {
      method: 'DELETE',
    });
  },

  // Delete bucket with access points (force deletion)
  deleteWithAccessPoints: async (name) => {
    // Defensive: Validate bucket name
    const validatedName = validateBucketName(name);

    return apiRequest(`/buckets/${encodeURIComponent(validatedName)}/force`, {
      method: 'DELETE',
    });
  },

  // Get bucket details
  get: async (name) => {
    // Defensive: Validate bucket name
    const validatedName = validateBucketName(name);

    return apiRequest(`/buckets/${encodeURIComponent(validatedName)}`);
  },
};

// File API methods
export const fileApi = {
  // List files in bucket
  list: async (bucket, prefix = '', maxKeys = 1000) => {
    const params = new URLSearchParams();
    if (prefix) params.append('prefix', prefix);
    if (maxKeys !== 1000) params.append('maxKeys', maxKeys.toString());

    const queryString = params.toString();
    const url = `/buckets/${encodeURIComponent(bucket)}/files${queryString ? `?${queryString}` : ''}`;

    return apiRequest(url);
  },

  // Upload file to bucket
  upload: async (bucket, file, key = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (key) formData.append('key', key);

    return apiRequest(`/buckets/${encodeURIComponent(bucket)}/files`, {
      method: 'POST',
      body: formData,
    });
  },

  // Download file from bucket
  download: async (bucket, key) => {
    return apiRequest(`/buckets/${encodeURIComponent(bucket)}/files/${encodeFileKey(key)}`);
  },

  // Delete file from bucket
  delete: async (bucket, key) => {
    return apiRequest(`/buckets/${encodeURIComponent(bucket)}/files/${encodeFileKey(key)}`, {
      method: 'DELETE',
    });
  },

  // Get file metadata
  getMetadata: async (bucket, key) => {
    return apiRequest(
      `/buckets/${encodeURIComponent(bucket)}/files/${encodeFileKey(key)}/metadata`,
    );
  },

  // Generate presigned download URL
  getDownloadUrl: async (bucket, key) => {
    const params = new URLSearchParams({ key });
    const url = `/buckets/${encodeURIComponent(bucket)}/download-url?${params}`;
    console.log('Making download URL request:', url);
    return apiRequest(url);
  },
};

// Health check
export const healthApi = {
  check: async () => {
    return apiRequest('/health');
  },
};

// Export the main API object
export const api = {
  buckets: bucketApi,
  files: fileApi,
  health: healthApi,
};

export default api;
