/**
 * @file Type definitions for vault secret parser
 * @module @thinkeloquent/vault-secret-hydrator/types
 */
/**
 * Represents a parsed file entry from a FILE_ prefixed key
 */
export interface FileEntry {
    /**
     * The original key name (e.g., "FILE_CONFIG")
     */
    key: string;
    /**
     * The decoded plaintext content from base64
     */
    decoded: string;
    /**
     * Recursively parsed content of the file
     */
    parser: ParsedSecret;
}
/**
 * The result of parsing a vault secret
 */
export interface ParsedSecret {
    /**
     * All uppercase properties (including flattened FILE_ properties)
     */
    properties: Record<string, string>;
    /**
     * File entries parsed from FILE_ prefixed keys
     */
    files: Record<string, FileEntry>;
}
/**
 * Options for configuring the parser behavior
 */
export interface ParserOptions {
    /**
     * Strict mode: throw on validation errors
     * Loose mode: log and skip invalid segments
     * @default true
     */
    strict?: boolean;
    /**
     * How to handle duplicate keys after merging nested properties
     * - 'error': Throw an error
     * - 'override': Use the new value
     * - 'skip': Keep the original value
     * @default 'error'
     */
    duplicateKeyStrategy?: 'error' | 'override' | 'skip';
    /**
     * Whether to ignore non-uppercase keys
     * @default true
     */
    ignoreNonUppercase?: boolean;
}
/**
 * Function that formats/extracts the base64 value before decoding
 * @param file_key - The FILE_ key name (e.g., "FILE_CONFIG")
 * @param value - The raw value before base64 decoding
 * @returns The formatted value to be base64 decoded
 */
export type FileFormatter = (file_key: string, value: string) => string;
/**
 * Public API for the vault secret parser
 */
export interface VaultSecretParser {
    /**
     * Parse a vault secret string or buffer
     * @param input - The plaintext secret content
     * @param file_formatter - Optional function to format values before base64 decoding
     * @returns ParsedSecret object with properties and files
     */
    parse(input: string | Buffer, file_formatter?: FileFormatter): ParsedSecret;
    /**
     * Get all properties (including flattened FILE_ properties)
     * @returns Record of property key-value pairs
     */
    getProperties(): Record<string, string>;
    /**
     * Get all file entries
     * @returns Record of file entries by key
     */
    getFiles(): Record<string, FileEntry>;
    /**
     * Serialize to JSON (useful for debugging/testing)
     * @returns ParsedSecret object
     */
    toJSON(): ParsedSecret;
    /**
     * Get the current parser options
     * @returns Current parser options
     */
    getOptions(): Required<ParserOptions>;
}
//# sourceMappingURL=types.d.ts.map