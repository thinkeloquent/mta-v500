/**
 * @file Utility functions for vault secret parser
 * @module @internal/vault-secret-hydrator/utils
 */

import { Base64DecodingError } from './errors.js';

/**
 * Check if a key is uppercase (contains only uppercase letters, numbers, and underscores)
 * @param key - The key to check
 * @returns True if the key is uppercase
 */
export function isUppercaseKey(key: string): boolean {
  return /^[A-Z0-9_]+$/.test(key);
}

/**
 * Check if a key starts with FILE_ prefix
 * @param key - The key to check
 * @returns True if the key starts with FILE_
 */
export function isFileKey(key: string): boolean {
  return key.startsWith('FILE_');
}

/**
 * Decode a base64 string to UTF-8
 * @param key - The key name (for error reporting)
 * @param value - The base64 encoded string
 * @returns Decoded UTF-8 string
 * @throws {Base64DecodingError} If decoding fails
 */
export function decodeBase64(key: string, value: string): string {
  try {
    // Remove whitespace and validate base64 format
    const cleaned = value.trim();

    if (!cleaned) {
      throw new Error('Empty base64 value');
    }

    // Decode base64 to buffer, then to UTF-8 string
    const buffer = Buffer.from(cleaned, 'base64');

    // Verify it was valid base64 by re-encoding
    const reencoded = buffer.toString('base64');
    if (reencoded !== cleaned) {
      throw new Error('Invalid base64 format');
    }

    return buffer.toString('utf-8');
  } catch (error) {
    throw new Base64DecodingError(key, value, error as Error);
  }
}

/**
 * Filter an object to only include uppercase keys
 * @param obj - The object to filter
 * @returns New object with only uppercase keys
 */
export function filterUppercaseKeys(obj: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isUppercaseKey(key)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Partition keys into FILE_ keys and regular properties
 * @param obj - The object to partition
 * @returns Tuple of [fileKeys, properties]
 */
export function partitionKeys(
  obj: Record<string, string>,
): [Record<string, string>, Record<string, string>] {
  const fileKeys: Record<string, string> = {};
  const properties: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isFileKey(key)) {
      fileKeys[key] = value;
    } else {
      properties[key] = value;
    }
  }

  return [fileKeys, properties];
}

/**
 * Convert input to string (handles Buffer and string)
 * @param input - The input to convert
 * @returns String representation
 */
export function convertToString(input: string | Buffer): string {
  return Buffer.isBuffer(input) ? input.toString('utf-8') : input;
}

/**
 * Normalize line endings to \n
 * @param input - The input string
 * @returns String with normalized line endings
 */
export function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, '\n');
}
