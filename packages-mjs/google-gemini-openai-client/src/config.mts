/**
 * @internal/google-gemini-openai-client - Configuration
 * Centralized configuration constants and environment variable handling
 */

// =============================================================================
// API Configuration
// =============================================================================

export const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const DEFAULT_MODEL = 'gemini-2.0-flash';

// =============================================================================
// Client Configuration
// =============================================================================

export const DEFAULT_TIMEOUT = 60000; // 60 seconds
export const DEFAULT_KEEP_ALIVE_TIMEOUT = 5000; // 5 seconds
export const DEFAULT_MAX_CONNECTIONS = 10;

// =============================================================================
// Display Configuration
// =============================================================================

export const SEPARATOR = '='.repeat(60);
export const THIN_SEPARATOR = '-'.repeat(60);

// =============================================================================
// Environment Variables
// =============================================================================

export const ENV_API_KEY = 'GEMINI_API_KEY';

/**
 * Resolve API key from argument or GEMINI_API_KEY environment variable.
 *
 * @param apiKey - Optional explicit API key (takes precedence)
 * @returns Resolved API key or undefined if not found
 */
export function getApiKey(apiKey?: string): string | undefined {
  return apiKey || process.env[ENV_API_KEY];
}
