/**
 * @file Core parser implementation
 * @module @internal/vault-secret-hydrator/parser
 */

import { parse as parseProperties } from 'properties-parser';
import { DuplicateKeyError, EmptyInputError, ParsingError } from './errors.js';
import type {
  FileEntry,
  FileFormatter,
  ParsedSecret,
  ParserOptions,
  VaultSecretParser,
} from './types.js';
import {
  decodeBase64,
  filterUppercaseKeys,
  normalizeLineEndings,
  partitionKeys,
  convertToString,
} from './utils.js';

/**
 * Default parser options
 */
const DEFAULT_OPTIONS: Required<ParserOptions> = {
  strict: true,
  duplicateKeyStrategy: 'error',
  ignoreNonUppercase: true,
};

/**
 * Internal parser implementation
 */
class VaultSecretParserImpl implements VaultSecretParser {
  private options: Required<ParserOptions>;
  private parsedResult: ParsedSecret | null = null;

  constructor(options: ParserOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Parse the input and return ParsedSecret
   */
  public parse(input: string | Buffer, file_formatter?: FileFormatter): ParsedSecret {
    // Convert to string
    const inputStr = convertToString(input);

    // Validate input
    if (!inputStr || inputStr.trim().length === 0) {
      throw new EmptyInputError();
    }

    // Normalize line endings
    const normalized = normalizeLineEndings(inputStr);

    // Parse with properties-parser
    let rootMap: Record<string, string>;
    try {
      rootMap = parseProperties(normalized) as Record<string, string>;
    } catch (error) {
      throw new ParsingError('Failed to parse KEY=VALUE format', error as Error);
    }

    // Filter to uppercase keys only (if option is enabled)
    const uppercaseMap = this.options.ignoreNonUppercase ? filterUppercaseKeys(rootMap) : rootMap;

    // Partition into FILE_ keys and regular properties
    const [fileKeys, properties] = partitionKeys(uppercaseMap);

    // Process file entries
    const files: Record<string, FileEntry> = {};
    const mergedProperties: Record<string, string> = { ...properties };

    for (const [fileKey, base64Value] of Object.entries(fileKeys)) {
      try {
        // Apply file_formatter if provided
        const formattedValue = file_formatter ? file_formatter(fileKey, base64Value) : base64Value;

        // Decode base64
        const decoded = decodeBase64(fileKey, formattedValue);

        // Recursively parse the decoded content
        const nestedParser = new VaultSecretParserImpl(this.options);
        const nestedResult = nestedParser.parse(decoded, file_formatter);

        // Create file entry
        const fileEntry: FileEntry = {
          key: fileKey,
          decoded,
          parser: nestedResult,
        };

        files[fileKey] = fileEntry;

        // Merge nested properties with pattern FILE_KEY_nestedKey
        this.mergeNestedProperties(mergedProperties, fileKey, nestedResult.properties);
      } catch (error) {
        if (this.options.strict) {
          throw error;
        }
        // In loose mode, skip this file entry and continue
        console.warn(`Skipping file entry ${fileKey}: ${(error as Error).message}`);
      }
    }

    // Store and return result
    this.parsedResult = {
      properties: mergedProperties,
      files,
    };

    return this.parsedResult;
  }

  /**
   * Merge nested properties into the root properties map
   */
  private mergeNestedProperties(
    target: Record<string, string>,
    fileKey: string,
    nestedProperties: Record<string, string>,
  ): void {
    for (const [nestedKey, nestedValue] of Object.entries(nestedProperties)) {
      const mergedKey = `${fileKey}_${nestedKey}`;

      // Check for duplicates
      if (mergedKey in target) {
        switch (this.options.duplicateKeyStrategy) {
          case 'error':
            throw new DuplicateKeyError(mergedKey, target[mergedKey], nestedValue);
          case 'override':
            target[mergedKey] = nestedValue;
            break;
          case 'skip':
            // Keep existing value, do nothing
            break;
        }
      } else {
        target[mergedKey] = nestedValue;
      }
    }
  }

  /**
   * Get all properties
   */
  public getProperties(): Record<string, string> {
    if (!this.parsedResult) {
      throw new Error('Must call parse() before getProperties()');
    }
    return { ...this.parsedResult.properties };
  }

  /**
   * Get all files
   */
  public getFiles(): Record<string, FileEntry> {
    if (!this.parsedResult) {
      throw new Error('Must call parse() before getFiles()');
    }
    return { ...this.parsedResult.files };
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): ParsedSecret {
    if (!this.parsedResult) {
      throw new Error('Must call parse() before toJSON()');
    }
    return {
      properties: { ...this.parsedResult.properties },
      files: { ...this.parsedResult.files },
    };
  }

  /**
   * Get current options
   */
  public getOptions(): Required<ParserOptions> {
    return { ...this.options };
  }
}

/**
 * Factory function to create a vault secret parser
 * @param options - Parser configuration options
 * @returns VaultSecretParser instance
 */
export function createVaultSecretParser(options?: ParserOptions): VaultSecretParser {
  return new VaultSecretParserImpl(options);
}
