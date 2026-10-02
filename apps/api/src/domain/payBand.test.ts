import { describe, expect, it } from "vitest";
import { classifyAgainstBand, compaRatio } from "./payBand";

const band = { minMinor: 400_000n, maxMinor: 600_000n };
const invalidBand = { minMinor: 600_000n, maxMinor: 400_000n };

describe("classifyAgainstBand", () => {
  it("classifies a salary below the minimum as below", () => {
    expect(classifyAgainstBand(399_999n, band)).toBe("below");
  });

  it("classifies a salary exactly at the minimum as within", () => {
    expect(classifyAgainstBand(400_000n, band)).toBe("within");
  });

  it("classifies a salary exactly at the maximum as within", () => {
    expect(classifyAgainstBand(600_000n, band)).toBe("within");
  });

  it("classifies a salary above the maximum as above", () => {
    expect(classifyAgainstBand(600_001n, band)).toBe("above");
  });

  it("classifies a salary inside the band as within", () => {
    expect(classifyAgainstBand(500_000n, band)).toBe("within");
  });

  it("throws a descriptive error when the band minimum is greater than the maximum", () => {
    expect(() => classifyAgainstBand(500_000n, invalidBand)).toThrow(/min/i);
  });
});

describe("compaRatio", () => {
  it("computes a ratio of 1.0 when the salary equals the midpoint", () => {
    expect(compaRatio(500_000n, band)).toBe(1);
  });

  it("computes a ratio below 1 when the salary is below the midpoint", () => {
    expect(compaRatio(400_000n, band)).toBe(0.8);
  });

  it("computes a ratio above 1 when the salary is above the midpoint", () => {
    expect(compaRatio(600_000n, band)).toBe(1.2);
  });

  it("rounds the ratio to two decimal places", () => {
    expect(compaRatio(433_333n, band)).toBe(0.87);
  });

  it("throws a descriptive error when the band minimum is greater than the maximum", () => {
    expect(() => compaRatio(500_000n, invalidBand)).toThrow(/min/i);
  });
});
