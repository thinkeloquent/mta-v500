import { describe, expect, it } from 'vitest';
import {
  BusinessRuleError,
  EntityNotFoundError,
  ErrorCategory,
  ErrorFactory,
  ValidationError,
} from '../src/errors.js';

describe('Errors', () => {
  it('should create validation error', () => {
    const error = new ValidationError('Invalid input');
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.code).toBe(1000);
    expect(error.message).toBe('Invalid input');
  });

  it('should create entity not found error', () => {
    const error = new EntityNotFoundError('tenant', 'tenant-1');
    expect(error.category).toBe(ErrorCategory.BUSINESS_RULE);
    expect(error.code).toBe(2001);
    expect(error.message).toContain('tenant-1');
  });

  it('should serialize to JSON', () => {
    const error = new BusinessRuleError('Test error', 2000, { extra: 'data' });
    const json = error.toJSON();
    expect(json.message).toBe('Test error');
    expect(json.code).toBe(2000);
    expect(json.details).toEqual({ extra: 'data' });
  });

  it('should convert unknown to BaseException', () => {
    const error = ErrorFactory.fromUnknown('string error');
    expect(error.category).toBe(ErrorCategory.SYSTEM);
  });

  it('should identify retryable errors', () => {
    const error = new EntityNotFoundError('tenant', '1');
    expect(ErrorFactory.isRetryable(error)).toBe(false);
  });
});
