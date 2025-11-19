/**
 * @file Tests for utility functions
 */

import { describe, expect, it } from 'vitest';
import { Base64DecodingError } from '../src/errors.js';
import {
  decodeBase64,
  filterUppercaseKeys,
  isFileKey,
  isUppercaseKey,
  normalizeLineEndings,
  partitionKeys,
  convertToString,
} from '../src/utils.js';

describe('isUppercaseKey', () => {
  it('should return true for uppercase keys', () => {
    expect(isUppercaseKey('API_KEY')).toBe(true);
    expect(isUppercaseKey('DATABASE_HOST')).toBe(true);
    expect(isUppercaseKey('FILE_CONFIG')).toBe(true);
    expect(isUppercaseKey('A')).toBe(true);
    expect(isUppercaseKey('ABC123')).toBe(true);
  });

  it('should return false for lowercase keys', () => {
    expect(isUppercaseKey('api_key')).toBe(false);
    expect(isUppercaseKey('lowercase')).toBe(false);
  });

  it('should return false for mixed case keys', () => {
    expect(isUppercaseKey('ApiKey')).toBe(false);
    expect(isUppercaseKey('Mixed_Case')).toBe(false);
  });

  it('should return false for keys with special characters', () => {
    expect(isUppercaseKey('API-KEY')).toBe(false);
    expect(isUppercaseKey('API.KEY')).toBe(false);
    expect(isUppercaseKey('API KEY')).toBe(false);
  });

  it('should allow underscores and numbers', () => {
    expect(isUppercaseKey('API_KEY_123')).toBe(true);
    expect(isUppercaseKey('DB_HOST_V2')).toBe(true);
  });
});

describe('isFileKey', () => {
  it('should return true for FILE_ prefixed keys', () => {
    expect(isFileKey('FILE_CONFIG')).toBe(true);
    expect(isFileKey('FILE_DB')).toBe(true);
    expect(isFileKey('FILE_REDIS')).toBe(true);
  });

  it('should return false for non-FILE_ keys', () => {
    expect(isFileKey('API_KEY')).toBe(false);
    expect(isFileKey('DATABASE_HOST')).toBe(false);
    expect(isFileKey('CONFIG_FILE')).toBe(false);
  });

  it('should be case sensitive', () => {
    expect(isFileKey('file_config')).toBe(false);
    expect(isFileKey('File_config')).toBe(false);
  });
});

describe('decodeBase64', () => {
  it('should decode valid base64 strings', () => {
    const encoded = Buffer.from('Hello, World!', 'utf-8').toString('base64');
    const decoded = decodeBase64('TEST_KEY', encoded);

    expect(decoded).toBe('Hello, World!');
  });

  it('should decode multi-line content', () => {
    const content = 'LINE1=value1\nLINE2=value2';
    const encoded = Buffer.from(content, 'utf-8').toString('base64');
    const decoded = decodeBase64('TEST_KEY', encoded);

    expect(decoded).toBe(content);
  });

  it('should handle UTF-8 characters', () => {
    const content = 'Hello 世界 🌍';
    const encoded = Buffer.from(content, 'utf-8').toString('base64');
    const decoded = decodeBase64('TEST_KEY', encoded);

    expect(decoded).toBe(content);
  });

  it('should trim whitespace from base64 input', () => {
    const encoded = Buffer.from('test', 'utf-8').toString('base64');
    const withWhitespace = `  ${encoded}  `;
    const decoded = decodeBase64('TEST_KEY', withWhitespace);

    expect(decoded).toBe('test');
  });

  it('should throw Base64DecodingError for invalid base64', () => {
    expect(() => decodeBase64('BAD_KEY', 'not-valid-base64!!!')).toThrow(Base64DecodingError);
  });

  it('should throw Base64DecodingError for empty value', () => {
    expect(() => decodeBase64('EMPTY_KEY', '')).toThrow(Base64DecodingError);
  });

  it('should throw Base64DecodingError for whitespace-only value', () => {
    expect(() => decodeBase64('WHITESPACE_KEY', '   ')).toThrow(Base64DecodingError);
  });

  it('should include key name in error', () => {
    try {
      decodeBase64('MY_KEY', 'invalid');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Base64DecodingError);
      expect((error as Base64DecodingError).key).toBe('MY_KEY');
    }
  });
});

describe('filterUppercaseKeys', () => {
  it('should filter to only uppercase keys', () => {
    const input = {
      API_KEY: 'abc123',
      lowercase_key: 'ignored',
      DATABASE_HOST: 'localhost',
      MixedCase: 'also_ignored',
    };

    const result = filterUppercaseKeys(input);

    expect(result).toEqual({
      API_KEY: 'abc123',
      DATABASE_HOST: 'localhost',
    });
  });

  it('should return empty object for no uppercase keys', () => {
    const input = {
      lowercase: 'value1',
      alsoLowercase: 'value2',
    };

    const result = filterUppercaseKeys(input);

    expect(result).toEqual({});
  });

  it('should return all keys if all are uppercase', () => {
    const input = {
      KEY1: 'value1',
      KEY2: 'value2',
      KEY3: 'value3',
    };

    const result = filterUppercaseKeys(input);

    expect(result).toEqual(input);
  });

  it('should handle empty object', () => {
    const result = filterUppercaseKeys({});

    expect(result).toEqual({});
  });
});

describe('partitionKeys', () => {
  it('should partition FILE_ keys from regular properties', () => {
    const input = {
      API_KEY: 'abc123',
      FILE_CONFIG: 'base64content',
      DATABASE_HOST: 'localhost',
      FILE_DB: 'base64db',
    };

    const [fileKeys, properties] = partitionKeys(input);

    expect(fileKeys).toEqual({
      FILE_CONFIG: 'base64content',
      FILE_DB: 'base64db',
    });

    expect(properties).toEqual({
      API_KEY: 'abc123',
      DATABASE_HOST: 'localhost',
    });
  });

  it('should return empty objects when no keys', () => {
    const [fileKeys, properties] = partitionKeys({});

    expect(fileKeys).toEqual({});
    expect(properties).toEqual({});
  });

  it('should return empty fileKeys when no FILE_ keys', () => {
    const input = {
      API_KEY: 'abc123',
      DATABASE_HOST: 'localhost',
    };

    const [fileKeys, properties] = partitionKeys(input);

    expect(fileKeys).toEqual({});
    expect(properties).toEqual(input);
  });

  it('should return empty properties when only FILE_ keys', () => {
    const input = {
      FILE_CONFIG: 'base64content',
      FILE_DB: 'base64db',
    };

    const [fileKeys, properties] = partitionKeys(input);

    expect(fileKeys).toEqual(input);
    expect(properties).toEqual({});
  });
});

describe('convertToString', () => {
  it('should convert Buffer to string', () => {
    const buffer = Buffer.from('test content', 'utf-8');
    const result = convertToString(buffer);

    expect(result).toBe('test content');
  });

  it('should return string as-is', () => {
    const input = 'test content';
    const result = convertToString(input);

    expect(result).toBe(input);
  });

  it('should handle UTF-8 characters in Buffer', () => {
    const buffer = Buffer.from('Hello 世界', 'utf-8');
    const result = convertToString(buffer);

    expect(result).toBe('Hello 世界');
  });
});

describe('normalizeLineEndings', () => {
  it('should convert Windows line endings to Unix', () => {
    const input = 'line1\r\nline2\r\nline3';
    const result = normalizeLineEndings(input);

    expect(result).toBe('line1\nline2\nline3');
  });

  it('should leave Unix line endings unchanged', () => {
    const input = 'line1\nline2\nline3';
    const result = normalizeLineEndings(input);

    expect(result).toBe(input);
  });

  it('should handle mixed line endings', () => {
    const input = 'line1\r\nline2\nline3\r\nline4';
    const result = normalizeLineEndings(input);

    expect(result).toBe('line1\nline2\nline3\nline4');
  });

  it('should handle empty string', () => {
    const result = normalizeLineEndings('');

    expect(result).toBe('');
  });
});
