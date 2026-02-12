/**
 * Result type for explicit error handling without exceptions.
 * Inspired by functional programming and Railway-Oriented Programming.
 */
export class Result<T> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: string
  ) {}

  static ok<U>(value: U): Result<U> {
    return new Result<U>(true, value, undefined);
  }

  static fail<U>(error: string): Result<U> {
    return new Result<U>(false, undefined, error);
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  get value(): T {
    if (!this._isSuccess) {
      throw new Error("Cannot get value from failed Result");
    }
    return this._value as T;
  }

  get error(): string {
    if (this._isSuccess) {
      throw new Error("Cannot get error from successful Result");
    }
    return this._error as string;
  }

  /**
   * Execute a function if the result is successful.
   */
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail(this._error!);
    }
    try {
      return Result.ok(fn(this._value as T));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Chain results together (flatMap).
   */
  andThen<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail(this._error!);
    }
    return fn(this._value as T);
  }

  /**
   * Unwrap or provide default value.
   */
  getOrElse(defaultValue: T): T {
    return this.isSuccess ? this._value as T : defaultValue;
  }
}
