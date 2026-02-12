import { describe, it, expect } from "vitest";
import { Money } from "../Money";

describe("Money Value Object", () => {
  describe("creation", () => {
    it("should create money from cents", () => {
      const result = Money.fromCents(1000, "USD");

      expect(result.isSuccess).toBe(true);
      expect(result.value.cents).toBe(1000);
      expect(result.value.dollars).toBe(10);
      expect(result.value.currency).toBe("USD");
    });

    it("should create money from dollars", () => {
      const result = Money.fromDollars(10.5, "USD");

      expect(result.isSuccess).toBe(true);
      expect(result.value.cents).toBe(1050);
      expect(result.value.dollars).toBe(10.5);
    });

    it("should fail for negative amounts", () => {
      const result = Money.fromCents(-100, "USD");

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("cannot be negative");
    });

    it("should fail for non-integer cents", () => {
      const result = Money.fromCents(10.5, "USD");

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("whole cents");
    });
  });

  describe("arithmetic operations", () => {
    it("should add money correctly", () => {
      const money1 = Money.fromCents(1000, "USD").value;
      const money2 = Money.fromCents(500, "USD").value;

      const result = money1.add(money2);

      expect(result.isSuccess).toBe(true);
      expect(result.value.cents).toBe(1500);
    });

    it("should fail to add different currencies", () => {
      const money1 = Money.fromCents(1000, "USD").value;
      const money2 = Money.fromCents(500, "CAD").value;

      const result = money1.add(money2);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("Cannot add CAD to USD");
    });

    it("should subtract money correctly", () => {
      const money1 = Money.fromCents(1000, "USD").value;
      const money2 = Money.fromCents(300, "USD").value;

      const result = money1.subtract(money2);

      expect(result.isSuccess).toBe(true);
      expect(result.value.cents).toBe(700);
    });

    it("should fail to subtract more than current amount", () => {
      const money1 = Money.fromCents(500, "USD").value;
      const money2 = Money.fromCents(1000, "USD").value;

      const result = money1.subtract(money2);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("Cannot subtract more than current amount");
    });

    it("should multiply by factor", () => {
      const money = Money.fromCents(1000, "USD").value;

      const result = money.multiply(5);

      expect(result.isSuccess).toBe(true);
      expect(result.value.cents).toBe(5000);
    });

    it("should round multiplication to whole cents", () => {
      const money = Money.fromCents(333, "USD").value;

      const result = money.multiply(3);

      expect(result.isSuccess).toBe(true);
      expect(result.value.cents).toBe(999); // Rounds correctly
    });

    it("should fail to multiply by negative", () => {
      const money = Money.fromCents(1000, "USD").value;

      const result = money.multiply(-2);

      expect(result.isFailure).toBe(true);
    });
  });

  describe("comparison", () => {
    it("should compare greater than", () => {
      const money1 = Money.fromCents(1000, "USD").value;
      const money2 = Money.fromCents(500, "USD").value;

      expect(money1.isGreaterThan(money2)).toBe(true);
      expect(money2.isGreaterThan(money1)).toBe(false);
    });

    it("should compare less than", () => {
      const money1 = Money.fromCents(500, "USD").value;
      const money2 = Money.fromCents(1000, "USD").value;

      expect(money1.isLessThan(money2)).toBe(true);
      expect(money2.isLessThan(money1)).toBe(false);
    });
  });

  it("should format correctly", () => {
    const money = Money.fromCents(1234, "USD").value;

    expect(money.format()).toBe("USD $12.34");
  });
});
