/**
 * @file Core parser implementation
 * @module @thinkeloquent/vault-secret-hydrator/parser
 */
import { parse as parseProperties } from 'properties-parser';
import { DuplicateKeyError, EmptyInputError, ParsingError } from './errors.js';
import { decodeBase64, filterUppercaseKeys, normalizeLineEndings, partitionKeys, convertToString, } from './utils.js';
/**
 * Default parser options
 */
const DEFAULT_OPTIONS = {
    strict: true,
    duplicateKeyStrategy: 'error',
    ignoreNonUppercase: true,
};
/**
 * Internal parser implementation
 */
class VaultSecretParserImpl {
    options;
    parsedResult = null;
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Parse the input and return ParsedSecret
     */
    parse(input, file_formatter) {
        // Convert to string
        const inputStr = convertToString(input);
        // Validate input
        if (!inputStr || inputStr.trim().length === 0) {
            throw new EmptyInputError();
        }
        // Normalize line endings
        const normalized = normalizeLineEndings(inputStr);
        // Parse with properties-parser
        let rootMap;
        try {
            rootMap = parseProperties(normalized);
        }
        catch (error) {
            throw new ParsingError('Failed to parse KEY=VALUE format', error);
        }
        // Filter to uppercase keys only (if option is enabled)
        const uppercaseMap = this.options.ignoreNonUppercase ? filterUppercaseKeys(rootMap) : rootMap;
        // Partition into FILE_ keys and regular properties
        const [fileKeys, properties] = partitionKeys(uppercaseMap);
        // Process file entries
        const files = {};
        const mergedProperties = { ...properties };
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
                const fileEntry = {
                    key: fileKey,
                    decoded,
                    parser: nestedResult,
                };
                files[fileKey] = fileEntry;
                // Merge nested properties with pattern FILE_KEY_nestedKey
                this.mergeNestedProperties(mergedProperties, fileKey, nestedResult.properties);
            }
            catch (error) {
                if (this.options.strict) {
                    throw error;
                }
                // In loose mode, skip this file entry and continue
                console.warn(`Skipping file entry ${fileKey}: ${error.message}`);
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
    mergeNestedProperties(target, fileKey, nestedProperties) {
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
            }
            else {
                target[mergedKey] = nestedValue;
            }
        }
    }
    /**
     * Get all properties
     */
    getProperties() {
        if (!this.parsedResult) {
            throw new Error('Must call parse() before getProperties()');
        }
        return { ...this.parsedResult.properties };
    }
    /**
     * Get all files
     */
    getFiles() {
        if (!this.parsedResult) {
            throw new Error('Must call parse() before getFiles()');
        }
        return { ...this.parsedResult.files };
    }
    /**
     * Serialize to JSON
     */
    toJSON() {
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
    getOptions() {
        return { ...this.options };
    }
}
/**
 * Factory function to create a vault secret parser
 * @param options - Parser configuration options
 * @returns VaultSecretParser instance
 */
export function createVaultSecretParser(options) {
    return new VaultSecretParserImpl(options);
}
//# sourceMappingURL=parser.js.map