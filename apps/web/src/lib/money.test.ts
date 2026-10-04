import { describe, expect, it } from "vitest";
import { currencyMinorDigits, formatCurrency, parseMoneyToMinor } from "./money";

describe("currencyMinorDigits", () => {
  it("returns 2 for USD and 0 for JPY", () => {
    expect(currencyMinorDigits("USD")).toBe(2);
    expect(currencyMinorDigits("JPY")).toBe(0);
  });
});

describe("formatCurrency", () => {
  it("formats whole and fractional minor amounts", () => {
    expect(formatCurrency("9000000", "USD")).toBe("$90,000.00");
    expect(formatCurrency("9000005", "USD")).toBe("$90,000.05");
    expect(formatCurrency("5", "GBP")).toBe("£0.05");
  });

  it("treats JPY minor units as whole yen", () => {
    expect(formatCurrency("12345", "JPY")).toBe("¥12,345");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency("-50", "USD")).toBe("-$0.50");
  });

  it("is exact beyond the float-safe integer range", () => {
    expect(formatCurrency("900719925474099312", "USD")).toBe("$9,007,199,254,740,993.12");
  });
});

describe("parseMoneyToMinor", () => {
  it("parses whole and decimal amounts into minor units", () => {
    expect(parseMoneyToMinor("95000", "USD")).toBe(9500000);
    expect(parseMoneyToMinor("95000.5", "USD")).toBe(9500050);
    expect(parseMoneyToMinor("0.1", "USD")).toBe(10);
  });

  it("accepts thousands separators and surrounding whitespace", () => {
    expect(parseMoneyToMinor(" 95,000.50 ", "USD")).toBe(9500050);
  });

  it("does not suffer float rounding", () => {
    // 1.15 * 100 === 114.99999999999999 in floating point
    expect(parseMoneyToMinor("1.15", "USD")).toBe(115);
  });

  it("respects the currency's minor digits", () => {
    expect(parseMoneyToMinor("12345", "JPY")).toBe(12345);
    expect(parseMoneyToMinor("123.4", "JPY")).toBeNull();
    expect(parseMoneyToMinor("1.005", "USD")).toBeNull();
  });

  it("rejects input that is not a plain non-negative amount", () => {
    for (const input of ["", "   ", "abc", "-5", "1e5", "1.2.3", "$100", "."]) {
      expect(parseMoneyToMinor(input, "USD")).toBeNull();
    }
  });

  it("rejects amounts too large to send as a safe integer", () => {
    expect(parseMoneyToMinor("90071992547409.92", "USD")).toBeNull();
  });
});
