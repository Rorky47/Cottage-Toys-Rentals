/**
 * Base class for value objects.
 * Value objects are immutable and compared by value, not identity.
 */
export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this._value = Object.freeze(value);
  }

  get value(): T {
    return this._value;
  }

  equals(other: ValueObject<T>): boolean {
    if (!other || other.constructor !== this.constructor) {
      return false;
    }
    return JSON.stringify(this._value) === JSON.stringify(other._value);
  }
}
