/**
 * Ok represents a successful result containing a value
 */
export class Ok {
    value;
    ok = true;
    err = false;
    constructor(value) {
        this.value = value;
    }
    isOk() {
        return true;
    }
    isErr() {
        return false;
    }
    /**
     * Maps the Ok value using the provided function
     */
    map(fn) {
        return new Ok(fn(this.value));
    }
    /**
     * Maps the Err value (no-op for Ok)
     */
    mapErr(_fn) {
        return this;
    }
    /**
     * FlatMaps the Ok value (chain operations)
     */
    flatMap(fn) {
        return fn(this.value);
    }
    /**
     * Unwraps the value (safe for Ok)
     */
    unwrap() {
        return this.value;
    }
    /**
     * Unwraps the value or returns the default
     */
    unwrapOr(_defaultValue) {
        return this.value;
    }
    /**
     * Unwraps the value or calls the function to get default
     */
    unwrapOrElse(_fn) {
        return this.value;
    }
    /**
     * Unwraps the error (throws for Ok)
     */
    unwrapErr() {
        throw new Error('Called unwrapErr on an Ok value');
    }
}
/**
 * Err represents a failed result containing an error
 */
export class Err {
    error;
    ok = false;
    err = true;
    constructor(error) {
        this.error = error;
    }
    isOk() {
        return false;
    }
    isErr() {
        return true;
    }
    /**
     * Maps the Ok value (no-op for Err)
     */
    map(_fn) {
        return this;
    }
    /**
     * Maps the Err value using the provided function
     */
    mapErr(fn) {
        return new Err(fn(this.error));
    }
    /**
     * FlatMaps the Ok value (no-op for Err)
     */
    flatMap(_fn) {
        return this;
    }
    /**
     * Unwraps the value (throws for Err)
     */
    unwrap() {
        throw this.error;
    }
    /**
     * Unwraps the value or returns the default
     */
    unwrapOr(defaultValue) {
        return defaultValue;
    }
    /**
     * Unwraps the value or calls the function to get default
     */
    unwrapOrElse(fn) {
        return fn(this.error);
    }
    /**
     * Unwraps the error (safe for Err)
     */
    unwrapErr() {
        return this.error;
    }
}
/**
 * Result namespace with utility functions
 */
export var Result;
(function (Result) {
    /**
     * Wraps a function that might throw into a Result
     */
    function from(fn) {
        try {
            return new Ok(fn());
        }
        catch (error) {
            if (error instanceof Error) {
                return new Err(error);
            }
            return new Err(new Error(String(error)));
        }
    }
    Result.from = from;
    /**
     * Wraps an async function that might throw into a Result
     */
    async function fromAsync(fn) {
        try {
            const value = await fn();
            return new Ok(value);
        }
        catch (error) {
            if (error instanceof Error) {
                return new Err(error);
            }
            return new Err(new Error(String(error)));
        }
    }
    Result.fromAsync = fromAsync;
    /**
     * Combines multiple Results - returns Ok only if all are Ok
     */
    function all(results) {
        const values = [];
        for (const result of results) {
            if (result.isErr()) {
                return result;
            }
            values.push(result.value);
        }
        return new Ok(values);
    }
    Result.all = all;
    /**
     * Returns the first Ok result, or the last Err if all are Err
     */
    function any(results) {
        let lastErr;
        for (const result of results) {
            if (result.isOk()) {
                return result;
            }
            lastErr = result;
        }
        return lastErr || new Err(new Error('No results provided'));
    }
    Result.any = any;
})(Result || (Result = {}));
//# sourceMappingURL=result.js.map