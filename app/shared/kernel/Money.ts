import { ValueObject } from "~/shared/kernel/ValueObject";
import { Result } from "~/shared/kernel/Result";

interface MoneyProps {
  cents: number;
  currency: string;
}

/**
 * Value object representing money with currency.
 * All monetary calculations should use this to avoid floating-point errors.
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(cents: number, currency: string) {
    super({ cents, currency });
  }

  static fromCents(cents: number, currency: string = "USD"): Result<Money> {
    if (!Number.isInteger(cents)) {
      return Result.fail("Money amount must be in whole cents");
    }
    if (cents < 0) {
      return Result.fail("Money amount cannot be negative");
    }
    return Result.ok(new Money(cents, currency));
  }

  static fromDollars(dollars: number, currency: string = "USD"): Result<Money> {
    const cents = Math.round(dollars * 100);
    return Money.fromCents(cents, currency);
  }

  get cents(): number {
    return this._value.cents;
  }

  get currency(): string {
    return this._value.currency;
  }

  get dollars(): number {
    return this._value.cents / 100;
  }

  add(other: Money): Result<Money> {
    if (this.currency !== other.currency) {
      return Result.fail(`Cannot add ${other.currency} to ${this.currency}`);
    }
    return Money.fromCents(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Result<Money> {
    if (this.currency !== other.currency) {
      return Result.fail(`Cannot subtract ${other.currency} from ${this.currency}`);
    }
    const newCents = this.cents - other.cents;
    if (newCents < 0) {
      return Result.fail("Cannot subtract more than current amount");
    }
    return Money.fromCents(newCents, this.currency);
  }

  multiply(factor: number): Result<Money> {
    if (factor < 0) {
      return Result.fail("Cannot multiply by negative number");
    }
    const newCents = Math.round(this.cents * factor);
    return Money.fromCents(newCents, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot compare ${other.currency} to ${this.currency}`);
    }
    return this.cents > other.cents;
  }

  isLessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot compare ${other.currency} to ${this.currency}`);
    }
    return this.cents < other.cents;
  }

  format(): string {
    return `${this.currency} $${this.dollars.toFixed(2)}`;
  }
}
