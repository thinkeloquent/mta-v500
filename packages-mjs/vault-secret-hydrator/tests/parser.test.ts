/**
 * @file Tests for vault secret parser
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Base64DecodingError, DuplicateKeyError, EmptyInputError } from '../src/errors.js';
import { createVaultSecretParser } from '../src/parser.js';
import type { VaultSecretParser } from '../src/types.js';
import {
  DECODED_FILE_CONFIG,
  DUPLICATE_KEY_SECRET,
  EMPTY_SECRET,
  INVALID_BASE64_SECRET,
  MIXED_CASE_SECRET,
  MULTIPLE_FILES_EXPECTED_PROPERTIES,
  MULTIPLE_FILES_SECRET,
  SIMPLE_SECRET,
  SIMPLE_SECRET_EXPECTED,
  SINGLE_FILE_EXPECTED_PROPERTIES,
  SINGLE_FILE_SECRET,
  WHITESPACE_SECRET,
  WINDOWS_LINE_ENDINGS_SECRET,
} from './fixtures/sample-secrets.js';

describe('VaultSecretParser - Simple Properties', () => {
  let parser: VaultSecretParser;

  beforeEach(() => {
    parser = createVaultSecretParser();
  });

  it('should parse simple KEY=VALUE properties', () => {
    const result = parser.parse(SIMPLE_SECRET);

    expect(result.properties).toEqual(SIMPLE_SECRET_EXPECTED);
    expect(result.files).toEqual({});
  });

  it('should ignore non-uppercase keys', () => {
    const result = parser.parse(MIXED_CASE_SECRET);

    expect(result.properties).toEqual({
      API_KEY: 'abc123',
      DATABASE_HOST: 'localhost',
    });
  });

  it('should normalize Windows line endings', () => {
    const result = parser.parse(WINDOWS_LINE_ENDINGS_SECRET);

    expect(result.properties).toEqual({
      API_KEY: 'abc123',
      DATABASE_HOST: 'localhost',
      SERVER_PORT: '3000',
    });
  });

  it('should handle Buffer input', () => {
    const buffer = Buffer.from(SIMPLE_SECRET, 'utf-8');
    const result = parser.parse(buffer);

    expect(result.properties).toEqual(SIMPLE_SECRET_EXPECTED);
  });

  it('should provide getProperties() method', () => {
    parser.parse(SIMPLE_SECRET);
    const properties = parser.getProperties();

    expect(properties).toEqual(SIMPLE_SECRET_EXPECTED);
  });

  it('should provide getFiles() method', () => {
    parser.parse(SIMPLE_SECRET);
    const files = parser.getFiles();

    expect(files).toEqual({});
  });

  it('should provide toJSON() method', () => {
    const result = parser.parse(SIMPLE_SECRET);
    const json = parser.toJSON();

    expect(json).toEqual(result);
  });
});

describe('VaultSecretParser - FILE_ Entries', () => {
  let parser: VaultSecretParser;

  beforeEach(() => {
    parser = createVaultSecretParser();
  });

  it('should parse single FILE_ entry', () => {
    const result = parser.parse(SINGLE_FILE_SECRET);

    expect(result.properties).toEqual(SINGLE_FILE_EXPECTED_PROPERTIES);
    expect(result.files).toHaveProperty('FILE_CONFIG');
  });

  it('should decode base64 FILE_ values', () => {
    const result = parser.parse(SINGLE_FILE_SECRET);

    expect(result.files.FILE_CONFIG.decoded).toBe(DECODED_FILE_CONFIG);
  });

  it('should recursively parse FILE_ content', () => {
    const result = parser.parse(SINGLE_FILE_SECRET);

    expect(result.files.FILE_CONFIG.parser.properties).toEqual({
      DATABASE_URL: 'postgres://localhost:5432',
      DATABASE_NAME: 'testdb',
    });
  });

  it('should flatten nested properties with FILE_KEY_nestedKey pattern', () => {
    const result = parser.parse(SINGLE_FILE_SECRET);

    expect(result.properties).toHaveProperty(
      'FILE_CONFIG_DATABASE_URL',
      'postgres://localhost:5432',
    );
    expect(result.properties).toHaveProperty('FILE_CONFIG_DATABASE_NAME', 'testdb');
  });

  it('should parse multiple FILE_ entries', () => {
    const result = parser.parse(MULTIPLE_FILES_SECRET);

    expect(result.properties).toEqual(MULTIPLE_FILES_EXPECTED_PROPERTIES);
    expect(result.files).toHaveProperty('FILE_DB');
    expect(result.files).toHaveProperty('FILE_REDIS');
  });

  it('should include FileEntry metadata', () => {
    const result = parser.parse(SINGLE_FILE_SECRET);
    const fileEntry = result.files.FILE_CONFIG;

    expect(fileEntry).toHaveProperty('key', 'FILE_CONFIG');
    expect(fileEntry).toHaveProperty('decoded');
    expect(fileEntry).toHaveProperty('parser');
    expect(fileEntry.parser).toHaveProperty('properties');
    expect(fileEntry.parser).toHaveProperty('files');
  });
});

describe('VaultSecretParser - Error Handling', () => {
  let parser: VaultSecretParser;

  beforeEach(() => {
    parser = createVaultSecretParser({ strict: true });
  });

  it('should throw EmptyInputError for empty input', () => {
    expect(() => parser.parse(EMPTY_SECRET)).toThrow(EmptyInputError);
  });

  it('should throw EmptyInputError for whitespace-only input', () => {
    expect(() => parser.parse(WHITESPACE_SECRET)).toThrow(EmptyInputError);
  });

  it('should throw Base64DecodingError for invalid base64', () => {
    expect(() => parser.parse(INVALID_BASE64_SECRET)).toThrow(Base64DecodingError);
  });

  it('should include key in Base64DecodingError', () => {
    try {
      parser.parse(INVALID_BASE64_SECRET);
      expect.fail('Should have thrown Base64DecodingError');
    } catch (error) {
      expect(error).toBeInstanceOf(Base64DecodingError);
      expect((error as Base64DecodingError).key).toBe('FILE_BAD');
    }
  });

  it('should throw DuplicateKeyError for duplicate keys (strict mode)', () => {
    expect(() => parser.parse(DUPLICATE_KEY_SECRET)).toThrow(DuplicateKeyError);
  });

  it('should include key details in DuplicateKeyError', () => {
    try {
      parser.parse(DUPLICATE_KEY_SECRET);
      expect.fail('Should have thrown DuplicateKeyError');
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicateKeyError);
      expect((error as DuplicateKeyError).key).toBe('FILE_A_B_C');
    }
  });

  it('should throw error when calling getProperties() before parse()', () => {
    expect(() => parser.getProperties()).toThrow('Must call parse() before getProperties()');
  });

  it('should throw error when calling getFiles() before parse()', () => {
    expect(() => parser.getFiles()).toThrow('Must call parse() before getFiles()');
  });

  it('should throw error when calling toJSON() before parse()', () => {
    expect(() => parser.toJSON()).toThrow('Must call parse() before toJSON()');
  });
});

describe('VaultSecretParser - Options', () => {
  it('should support loose mode (skip errors)', () => {
    const parser = createVaultSecretParser({ strict: false });

    // Should not throw, just skip invalid entry
    const result = parser.parse(INVALID_BASE64_SECRET);

    expect(result.properties).toHaveProperty('API_KEY', 'abc123');
    expect(result.properties).toHaveProperty('SERVER_PORT', '3000');
    expect(result.files).not.toHaveProperty('FILE_BAD');
  });

  it('should support duplicate key strategy: override', () => {
    const parser = createVaultSecretParser({ duplicateKeyStrategy: 'override' });

    const result = parser.parse(DUPLICATE_KEY_SECRET);

    // Should use the second value (from FILE_A_B)
    // FILE_A creates FILE_A_B_C=first
    // FILE_A_B creates FILE_A_B_C=second (overrides)
    expect(result.properties.FILE_A_B_C).toBe('second');
  });

  it('should support duplicate key strategy: skip', () => {
    const parser = createVaultSecretParser({ duplicateKeyStrategy: 'skip' });

    const result = parser.parse(DUPLICATE_KEY_SECRET);

    // Should keep the first value (from FILE_A)
    expect(result.properties.FILE_A_B_C).toBe('first');
  });

  it('should provide getOptions() method', () => {
    const parser = createVaultSecretParser({
      strict: false,
      duplicateKeyStrategy: 'override',
    });

    const options = parser.getOptions();

    expect(options.strict).toBe(false);
    expect(options.duplicateKeyStrategy).toBe('override');
    expect(options.ignoreNonUppercase).toBe(true);
  });

  it('should use default options when not specified', () => {
    const parser = createVaultSecretParser();
    const options = parser.getOptions();

    expect(options.strict).toBe(true);
    expect(options.duplicateKeyStrategy).toBe('error');
    expect(options.ignoreNonUppercase).toBe(true);
  });
});

describe('VaultSecretParser - Edge Cases', () => {
  it('should handle empty FILE_ value', () => {
    const parser = createVaultSecretParser({ strict: false });
    const secret = 'API_KEY=abc123\nFILE_EMPTY=\nSERVER_PORT=3000';

    const result = parser.parse(secret);

    // Should skip empty FILE_ entry in loose mode
    expect(result.properties).toHaveProperty('API_KEY', 'abc123');
    expect(result.properties).toHaveProperty('SERVER_PORT', '3000');
  });

  it('should handle FILE_ entry with only whitespace', () => {
    const parser = createVaultSecretParser({ strict: false });
    const secret = 'API_KEY=abc123\nFILE_WHITESPACE=   \nSERVER_PORT=3000';

    const result = parser.parse(secret);

    // Should skip whitespace-only FILE_ entry in loose mode
    expect(result.properties).toHaveProperty('API_KEY', 'abc123');
    expect(result.properties).toHaveProperty('SERVER_PORT', '3000');
  });

  it('should handle properties with equals signs in value', () => {
    const parser = createVaultSecretParser();
    const secret = 'DATABASE_URL=postgres://user:pass=word@localhost:5432/db';

    const result = parser.parse(secret);

    expect(result.properties.DATABASE_URL).toBe('postgres://user:pass=word@localhost:5432/db');
  });

  it('should handle properties with special characters', () => {
    const parser = createVaultSecretParser();
    const secret = 'PASSWORD=p@ssw0rd!#$%^&*()';

    const result = parser.parse(secret);

    expect(result.properties.PASSWORD).toBe('p@ssw0rd!#$%^&*()');
  });

  it('should return independent copies from getProperties()', () => {
    const parser = createVaultSecretParser();
    parser.parse(SIMPLE_SECRET);

    const properties1 = parser.getProperties();
    const properties2 = parser.getProperties();

    properties1.NEW_KEY = 'new_value';

    expect(properties2).not.toHaveProperty('NEW_KEY');
  });

  it('should return independent copies from getFiles()', () => {
    const parser = createVaultSecretParser();
    parser.parse(SINGLE_FILE_SECRET);

    const files1 = parser.getFiles();
    const files2 = parser.getFiles();

    delete files1.FILE_CONFIG;

    expect(files2).toHaveProperty('FILE_CONFIG');
  });
});

describe('VaultSecretParser - file_formatter Parameter', () => {
  let parser: VaultSecretParser;

  beforeEach(() => {
    parser = createVaultSecretParser();
  });

  it('should apply file_formatter to extract base64 from composite value', () => {
    // Create a secret where FILE_ values have format "metadata;;base64data"
    const base64Config = Buffer.from(
      'DATABASE_URL=postgres://localhost:5432\nDATABASE_NAME=testdb',
    ).toString('base64');
    const compositeValue = `metadata;;${base64Config}`;
    const secret = `API_KEY=abc123\nFILE_CONFIG=${compositeValue}`;

    // Formatter extracts the part after ";;"
    const formatter = (key: string, value: string) => value.split(';;')[1];

    const result = parser.parse(secret, formatter);

    expect(result.files.FILE_CONFIG.decoded).toBe(
      'DATABASE_URL=postgres://localhost:5432\nDATABASE_NAME=testdb',
    );
    expect(result.files.FILE_CONFIG.parser.properties).toEqual({
      DATABASE_URL: 'postgres://localhost:5432',
      DATABASE_NAME: 'testdb',
    });
  });

  it('should apply formatter to multiple FILE_ entries', () => {
    const base64Db = Buffer.from('DB_HOST=localhost\nDB_PORT=5432').toString('base64');
    const base64Redis = Buffer.from('REDIS_HOST=localhost\nREDIS_PORT=6379').toString('base64');
    const secret = `FILE_DB=meta1;;${base64Db}\nFILE_REDIS=meta2;;${base64Redis}`;

    const formatter = (key: string, value: string) => value.split(';;')[1];

    const result = parser.parse(secret, formatter);

    expect(result.files.FILE_DB.parser.properties).toEqual({
      DB_HOST: 'localhost',
      DB_PORT: '5432',
    });
    expect(result.files.FILE_REDIS.parser.properties).toEqual({
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
    });
  });

  it('should apply formatter recursively to nested FILE_ entries', () => {
    // Create nested FILE_ structure with composite values at both levels
    const nestedBase64 = Buffer.from('NESTED_VALUE=deep').toString('base64');
    const nestedComposite = `nested_meta;;${nestedBase64}`;
    const topLevelContent = `TOP_KEY=top_value\nFILE_NESTED=${nestedComposite}`;
    const topLevelBase64 = Buffer.from(topLevelContent).toString('base64');
    const topLevelComposite = `top_meta;;${topLevelBase64}`;
    const secret = `FILE_TOP=${topLevelComposite}`;

    const formatter = (key: string, value: string) => value.split(';;')[1];

    const result = parser.parse(secret, formatter);

    // Check top level
    expect(result.files.FILE_TOP.parser.properties).toHaveProperty('TOP_KEY', 'top_value');

    // Check nested level - formatter should have been applied recursively
    expect(result.files.FILE_TOP.parser.files.FILE_NESTED.parser.properties).toEqual({
      NESTED_VALUE: 'deep',
    });
  });

  it('should work without formatter (backward compatibility)', () => {
    const result = parser.parse(SINGLE_FILE_SECRET);

    expect(result.files.FILE_CONFIG.decoded).toBe(DECODED_FILE_CONFIG);
    expect(result.files.FILE_CONFIG.parser.properties).toEqual({
      DATABASE_URL: 'postgres://localhost:5432',
      DATABASE_NAME: 'testdb',
    });
  });

  it('should pass file key to formatter', () => {
    const base64 = Buffer.from('VALUE=test').toString('base64');
    const secret = `FILE_A=prefixA;;${base64}\nFILE_B=prefixB;;${base64}`;

    // Formatter that uses the key to determine which part to extract
    const formatter = (key: string, value: string) => {
      const parts = value.split(';;');
      // Could use key to make decisions, but for this test just verify it's passed correctly
      expect(key).toMatch(/^FILE_[AB]$/);
      return parts[1];
    };

    const result = parser.parse(secret, formatter);

    expect(result.files).toHaveProperty('FILE_A');
    expect(result.files).toHaveProperty('FILE_B');
  });

  it('should handle formatter that returns original value', () => {
    // Formatter that doesn't modify the value
    const formatter = (key: string, value: string) => value;

    const result = parser.parse(SINGLE_FILE_SECRET, formatter);

    expect(result.files.FILE_CONFIG.decoded).toBe(DECODED_FILE_CONFIG);
    expect(result.files.FILE_CONFIG.parser.properties).toEqual({
      DATABASE_URL: 'postgres://localhost:5432',
      DATABASE_NAME: 'testdb',
    });
  });

  it('should throw Base64DecodingError if formatter returns invalid base64', () => {
    const secret = 'FILE_BAD=metadata;;invalid-base64';
    const formatter = (key: string, value: string) => value.split(';;')[1];

    expect(() => parser.parse(secret, formatter)).toThrow(Base64DecodingError);
  });
});
