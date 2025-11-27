import { describe, expect, it } from 'vitest';
import { Err, Ok, Result } from '../src/result.js';

describe('Result', () => {
  describe('Ok', () => {
    it('should create Ok value', () => {
      const result = new Ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      expect(result.value).toBe(42);
    });

    it('should map Ok value', () => {
      const result = new Ok(42).map((x) => x * 2);
      expect(result.isOk() && result.value).toBe(84);
    });

    it('should flatMap Ok value', () => {
      const result = new Ok(42).flatMap((x) => new Ok(x * 2));
      expect(result.isOk() && result.value).toBe(84);
    });

    it('should unwrap value', () => {
      expect(new Ok(42).unwrap()).toBe(42);
    });
  });

  describe('Err', () => {
    it('should create Err value', () => {
      const error = new Error('test error');
      const result = new Err(error);
      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should mapErr', () => {
      const result = new Err(new Error('test')).mapErr((e) => new Error(`mapped: ${e.message}`));
      expect(result.isErr() && result.error.message).toBe('mapped: test');
    });

    it('should unwrapOr with default', () => {
      expect(new Err(new Error('test')).unwrapOr(100)).toBe(100);
    });

    it('should throw on unwrap', () => {
      expect(() => new Err(new Error('test')).unwrap()).toThrow('test');
    });
  });

  describe('Result utilities', () => {
    it('should wrap function with from', () => {
      const result = Result.from(() => 42);
      expect(result.isOk() && result.value).toBe(42);
    });

    it('should catch error with from', () => {
      const result = Result.from(() => {
        throw new Error('fail');
      });
      expect(result.isErr() && result.error.message).toBe('fail');
    });

    it('should combine all Ok results', () => {
      const result = Result.all([new Ok(1), new Ok(2), new Ok(3)]);
      expect(result.isOk() && result.value).toEqual([1, 2, 3]);
    });

    it('should fail if any Err in all', () => {
      const result = Result.all([new Ok(1), new Err(new Error('fail')), new Ok(3)]);
      expect(result.isErr()).toBe(true);
    });
  });
});
