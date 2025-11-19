/**
 * Helper functions for creating Ok and Err results
 * These provide a functional-style API for Result pattern
 */

import { Err, Ok } from './result.js';

/**
 * Creates a successful Result containing a value (lowercase helper)
 * @param value The value to wrap in Ok
 * @returns Ok result containing the value
 */
export function ok<T>(value: T): Ok<T> {
  return new Ok(value);
}

/**
 * Creates a failed Result containing an error (lowercase helper)
 * @param error The error to wrap in Err
 * @returns Err result containing the error
 */
export function err<E extends Error>(error: E): Err<E> {
  return new Err(error);
}
