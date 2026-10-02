import { describe, expect, it } from "vitest";
import { convertToUsd, formatMoney, percentChange, toMinor } from "./money";

describe("toMinor", () => {
  it("parses a typical two-decimal string", () => {
    expect(toMinor("85000.50", "USD")).toBe(8500050n);
  });

  it("parses a whole-number string with no decimal point", () => {
    expect(toMinor("1000", "USD")).toBe(100000n);
  });

  it("parses a one-decimal string by treating the missing digit as zero", () => {
    expect(toMinor("1000.5", "USD")).toBe(100050n);
  });

  it("treats zero as a valid amount", () => {
    expect(toMinor("0", "USD")).toBe(0n);
    expect(toMinor("0.00", "USD")).toBe(0n);
  });

  it("rejects a negative amount", () => {
    expect(() => toMinor("-100.00", "USD")).toThrow(/negative/i);
  });

  it("rejects more than two decimal places", () => {
    expect(() => toMinor("100.123", "USD")).toThrow(/decimal/i);
  });

  it("rejects non-numeric input", () => {
    expect(() => toMinor("abc", "USD")).toThrow(/invalid/i);
    expect(() => toMinor("", "USD")).toThrow(/invalid/i);
    expect(() => toMinor("12.34.56", "USD")).toThrow(/invalid/i);
    expect(() => toMinor("1e10", "USD")).toThrow(/invalid/i);
  });
});

describe("formatMoney", () => {
  it("formats a typical amount in the given currency", () => {
    expect(formatMoney(8500050n, "USD")).toBe("$85,000.50");
  });

  it("formats zero", () => {
    expect(formatMoney(0n, "USD")).toBe("$0.00");
  });

  it("accepts an explicit locale override", () => {
    const result = formatMoney(8500050n, "EUR", "de-DE").replace(/ /g, " ");

    expect(result).toContain("85.000,50");
    expect(result).toContain("€");
  });

  it("formats a very large amount without losing precision", () => {
    expect(formatMoney(1_234_567_890_123n, "USD")).toContain("12,345,678,901.23");
  });
});

describe("convertToUsd", () => {
  it("converts using a sub-one rate", () => {
    expect(convertToUsd(100_000n, 0.5)).toBe(50_000n);
  });

  it("converts using an above-one rate", () => {
    expect(convertToUsd(100_000n, 1.27)).toBe(127_000n);
  });

  it("rounds up at exactly half a cent", () => {
    expect(convertToUsd(1n, 0.5)).toBe(1n);
  });

  it("rounds down just under half a cent", () => {
    expect(convertToUsd(1n, 0.499999)).toBe(0n);
  });

  it("converts zero to zero", () => {
    expect(convertToUsd(0n, 1.27)).toBe(0n);
  });

  it("converts a very large amount without precision drift", () => {
    expect(convertToUsd(1_000_000_000_000n, 1.23)).toBe(1_230_000_000_000n);
  });
});

describe("percentChange", () => {
  it("computes a straightforward percentage increase", () => {
    expect(percentChange(100_000n, 110_000n)).toBe(10);
  });

  it("computes a straightforward percentage decrease", () => {
    expect(percentChange(100_000n, 90_000n)).toBe(-10);
  });

  it("treats no change as zero", () => {
    expect(percentChange(100_000n, 100_000n)).toBe(0);
  });

  it("rounds to one decimal place at a boundary case", () => {
    expect(percentChange(800_000n, 810_000n)).toBe(1.3);
  });

  it("throws a descriptive error when previousMinor is not positive", () => {
    expect(() => percentChange(0n, 100_000n)).toThrow(/positive/i);
    expect(() => percentChange(-100n, 100_000n)).toThrow(/positive/i);
  });
});
