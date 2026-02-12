import { ValueObject } from "~/shared/kernel/ValueObject";
import { Result } from "~/shared/kernel/Result";

interface DateRangeProps {
  startDate: Date;
  endDate: Date;
}

/**
 * Value object representing a date range.
 * Encapsulates date range logic (overlap, duration, etc.)
 */
export class DateRange extends ValueObject<DateRangeProps> {
  private constructor(startDate: Date, endDate: Date) {
    super({ startDate, endDate });
  }

  static create(startDate: Date, endDate: Date): Result<DateRange> {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
      return Result.fail("Invalid start date");
    }
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
      return Result.fail("Invalid end date");
    }
    if (startDate >= endDate) {
      return Result.fail("Start date must be before end date");
    }
    return Result.ok(new DateRange(startDate, endDate));
  }

  get startDate(): Date {
    return this._value.startDate;
  }

  get endDate(): Date {
    return this._value.endDate;
  }

  /**
   * Calculate duration in days (inclusive of both start and end dates).
   * Example: Jan 1 to Jan 3 = 3 days
   */
  get durationDays(): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffMs / msPerDay) + 1; // +1 for inclusive
  }

  /**
   * Check if this date range overlaps with another.
   */
  overlapsWith(other: DateRange): boolean {
    return this.startDate <= other.endDate && this.endDate >= other.startDate;
  }

  /**
   * Check if a date falls within this range (inclusive).
   */
  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  /**
   * Check if this range completely contains another range.
   */
  containsRange(other: DateRange): boolean {
    return this.startDate <= other.startDate && this.endDate >= other.endDate;
  }

  /**
   * Check if date range is in the past.
   */
  isInPast(now: Date = new Date()): boolean {
    return this.endDate < now;
  }

  /**
   * Check if date range is in the future.
   */
  isInFuture(now: Date = new Date()): boolean {
    return this.startDate > now;
  }

  /**
   * Check if date range includes the current date.
   */
  isActive(now: Date = new Date()): boolean {
    return this.contains(now);
  }

  format(): string {
    return `${this.startDate.toISOString().split("T")[0]} to ${this.endDate.toISOString().split("T")[0]}`;
  }
}
