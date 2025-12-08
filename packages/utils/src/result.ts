/**
 * Result type for explicit error handling
 *
 * Inspired by Rust's Result type, this provides a type-safe way to handle
 * operations that can fail without using exceptions for control flow.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) return err("Division by zero");
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.ok) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export type Result<T, E = Error> =
	| { ok: true; value: T }
	| { ok: false; error: E };

/**
 * Creates a successful Result
 */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * Creates a failed Result
 */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Wraps a function that might throw into one that returns a Result
 */
export function tryCatch<T, E = Error>(
	fn: () => T,
	errorMapper?: (e: unknown) => E,
): Result<T, E> {
	try {
		return ok(fn());
	} catch (e) {
		if (errorMapper) {
			return err(errorMapper(e));
		}
		return err(e as E);
	}
}

/**
 * Wraps an async function that might throw into one that returns a Result
 */
export async function tryCatchAsync<T, E = Error>(
	fn: () => Promise<T>,
	errorMapper?: (e: unknown) => E,
): Promise<Result<T, E>> {
	try {
		return ok(await fn());
	} catch (e) {
		if (errorMapper) {
			return err(errorMapper(e));
		}
		return err(e as E);
	}
}

/**
 * Maps over the value of a successful Result
 */
export function mapResult<T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => U,
): Result<U, E> {
	if (result.ok) {
		return ok(fn(result.value));
	}
	return result;
}

/**
 * Maps over the error of a failed Result
 */
export function mapError<T, E, F>(
	result: Result<T, E>,
	fn: (error: E) => F,
): Result<T, F> {
	if (!result.ok) {
		return err(fn(result.error));
	}
	return result;
}

/**
 * Unwraps a Result, throwing if it's an error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
	if (result.ok) {
		return result.value;
	}
	throw result.error;
}

/**
 * Unwraps a Result, returning a default value if it's an error
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
	if (result.ok) {
		return result.value;
	}
	return defaultValue;
}
