/**
 * Result<T,E> - A functional approach to error handling
 * Represents either success (Ok) or failure (Err)
 */
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

/**
 * Ok represents a successful result containing a value
 */
export class Ok<T> {
  readonly ok = true as const;
  readonly err = false as const;

  constructor(public readonly value: T) {}

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is never {
    return false;
  }

  /**
   * Maps the Ok value using the provided function
   */
  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value));
  }

  /**
   * Maps the Err value (no-op for Ok)
   */
  mapErr<F extends Error>(_fn: (error: never) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  /**
   * FlatMaps the Ok value (chain operations)
   */
  flatMap<U, F extends Error>(fn: (value: T) => Result<U, F>): Result<U, F> {
    return fn(this.value);
  }

  /**
   * Unwraps the value (safe for Ok)
   */
  unwrap(): T {
    return this.value;
  }

  /**
   * Unwraps the value or returns the default
   */
  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  /**
   * Unwraps the value or calls the function to get default
   */
  unwrapOrElse(_fn: (error: never) => T): T {
    return this.value;
  }

  /**
   * Unwraps the error (throws for Ok)
   */
  unwrapErr(): never {
    throw new Error('Called unwrapErr on an Ok value');
  }
}

/**
 * Err represents a failed result containing an error
 */
export class Err<E extends Error> {
  readonly ok = false as const;
  readonly err = true as const;

  constructor(public readonly error: E) {}

  isOk(): this is never {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  /**
   * Maps the Ok value (no-op for Err)
   */
  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  /**
   * Maps the Err value using the provided function
   */
  mapErr<F extends Error>(fn: (error: E) => F): Result<never, F> {
    return new Err(fn(this.error));
  }

  /**
   * FlatMaps the Ok value (no-op for Err)
   */
  flatMap<U, F extends Error>(_fn: (value: never) => Result<U, F>): Result<U, E | F> {
    return this as unknown as Result<U, E | F>;
  }

  /**
   * Unwraps the value (throws for Err)
   */
  unwrap(): never {
    throw this.error;
  }

  /**
   * Unwraps the value or returns the default
   */
  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Unwraps the value or calls the function to get default
   */
  unwrapOrElse<T>(fn: (error: E) => T): T {
    return fn(this.error);
  }

  /**
   * Unwraps the error (safe for Err)
   */
  unwrapErr(): E {
    return this.error;
  }
}

/**
 * Result namespace with utility functions
 */
export namespace Result {
  /**
   * Wraps a function that might throw into a Result
   */
  export function from<T>(fn: () => T): Result<T, Error> {
    try {
      return new Ok(fn());
    } catch (error) {
      if (error instanceof Error) {
        return new Err(error);
      }
      return new Err(new Error(String(error)));
    }
  }

  /**
   * Wraps an async function that might throw into a Result
   */
  export async function fromAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
    try {
      const value = await fn();
      return new Ok(value);
    } catch (error) {
      if (error instanceof Error) {
        return new Err(error);
      }
      return new Err(new Error(String(error)));
    }
  }

  /**
   * Combines multiple Results - returns Ok only if all are Ok
   */
  export function all<T extends readonly Result<unknown, Error>[]>(
    results: T,
  ): Result<{ [K in keyof T]: T[K] extends Result<infer U, Error> ? U : never }, Error> {
    const values: unknown[] = [];

    for (const result of results) {
      if (result.isErr()) {
        return result as Err<Error>;
      }
      values.push(result.value);
    }

    return new Ok(values) as Result<
      { [K in keyof T]: T[K] extends Result<infer U, Error> ? U : never },
      Error
    >;
  }

  /**
   * Returns the first Ok result, or the last Err if all are Err
   */
  export function any<T, E extends Error>(results: readonly Result<T, E>[]): Result<T, E> {
    let lastErr: Err<E> | undefined;

    for (const result of results) {
      if (result.isOk()) {
        return result;
      }
      lastErr = result;
    }

    return lastErr || new Err(new Error('No results provided') as E);
  }
}
