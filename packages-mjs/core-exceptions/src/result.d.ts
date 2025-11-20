/**
 * Result<T,E> - A functional approach to error handling
 * Represents either success (Ok) or failure (Err)
 */
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;
/**
 * Ok represents a successful result containing a value
 */
export declare class Ok<T> {
    readonly value: T;
    readonly ok: true;
    readonly err: false;
    constructor(value: T);
    isOk(): this is Ok<T>;
    isErr(): this is never;
    /**
     * Maps the Ok value using the provided function
     */
    map<U>(fn: (value: T) => U): Result<U, never>;
    /**
     * Maps the Err value (no-op for Ok)
     */
    mapErr<F extends Error>(_fn: (error: never) => F): Result<T, F>;
    /**
     * FlatMaps the Ok value (chain operations)
     */
    flatMap<U, F extends Error>(fn: (value: T) => Result<U, F>): Result<U, F>;
    /**
     * Unwraps the value (safe for Ok)
     */
    unwrap(): T;
    /**
     * Unwraps the value or returns the default
     */
    unwrapOr(_defaultValue: T): T;
    /**
     * Unwraps the value or calls the function to get default
     */
    unwrapOrElse(_fn: (error: never) => T): T;
    /**
     * Unwraps the error (throws for Ok)
     */
    unwrapErr(): never;
}
/**
 * Err represents a failed result containing an error
 */
export declare class Err<E extends Error> {
    readonly error: E;
    readonly ok: false;
    readonly err: true;
    constructor(error: E);
    isOk(): this is never;
    isErr(): this is Err<E>;
    /**
     * Maps the Ok value (no-op for Err)
     */
    map<U>(_fn: (value: never) => U): Result<U, E>;
    /**
     * Maps the Err value using the provided function
     */
    mapErr<F extends Error>(fn: (error: E) => F): Result<never, F>;
    /**
     * FlatMaps the Ok value (no-op for Err)
     */
    flatMap<U, F extends Error>(_fn: (value: never) => Result<U, F>): Result<U, E | F>;
    /**
     * Unwraps the value (throws for Err)
     */
    unwrap(): never;
    /**
     * Unwraps the value or returns the default
     */
    unwrapOr<T>(defaultValue: T): T;
    /**
     * Unwraps the value or calls the function to get default
     */
    unwrapOrElse<T>(fn: (error: E) => T): T;
    /**
     * Unwraps the error (safe for Err)
     */
    unwrapErr(): E;
}
/**
 * Result namespace with utility functions
 */
export declare namespace Result {
    /**
     * Wraps a function that might throw into a Result
     */
    function from<T>(fn: () => T): Result<T, Error>;
    /**
     * Wraps an async function that might throw into a Result
     */
    function fromAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>>;
    /**
     * Combines multiple Results - returns Ok only if all are Ok
     */
    function all<T extends readonly Result<unknown, Error>[]>(results: T): Result<{
        [K in keyof T]: T[K] extends Result<infer U, Error> ? U : never;
    }, Error>;
    /**
     * Returns the first Ok result, or the last Err if all are Err
     */
    function any<T, E extends Error>(results: readonly Result<T, E>[]): Result<T, E>;
}
//# sourceMappingURL=result.d.ts.map