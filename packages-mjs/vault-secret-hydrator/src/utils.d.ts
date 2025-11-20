/**
 * @file Utility functions for vault secret parser
 * @module @thinkeloquent/vault-secret-hydrator/utils
 */
/**
 * Check if a key is uppercase (contains only uppercase letters, numbers, and underscores)
 * @param key - The key to check
 * @returns True if the key is uppercase
 */
export declare function isUppercaseKey(key: string): boolean;
/**
 * Check if a key starts with FILE_ prefix
 * @param key - The key to check
 * @returns True if the key starts with FILE_
 */
export declare function isFileKey(key: string): boolean;
/**
 * Decode a base64 string to UTF-8
 * @param key - The key name (for error reporting)
 * @param value - The base64 encoded string
 * @returns Decoded UTF-8 string
 * @throws {Base64DecodingError} If decoding fails
 */
export declare function decodeBase64(key: string, value: string): string;
/**
 * Filter an object to only include uppercase keys
 * @param obj - The object to filter
 * @returns New object with only uppercase keys
 */
export declare function filterUppercaseKeys(obj: Record<string, string>): Record<string, string>;
/**
 * Partition keys into FILE_ keys and regular properties
 * @param obj - The object to partition
 * @returns Tuple of [fileKeys, properties]
 */
export declare function partitionKeys(obj: Record<string, string>): [Record<string, string>, Record<string, string>];
/**
 * Convert input to string (handles Buffer and string)
 * @param input - The input to convert
 * @returns String representation
 */
export declare function convertToString(input: string | Buffer): string;
/**
 * Normalize line endings to \n
 * @param input - The input string
 * @returns String with normalized line endings
 */
export declare function normalizeLineEndings(input: string): string;
//# sourceMappingURL=utils.d.ts.map