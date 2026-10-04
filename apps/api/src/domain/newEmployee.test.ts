import { describe, expect, it } from "vitest";
import { validateNewEmployee } from "./newEmployee";

describe("validateNewEmployee", () => {
  it("accepts a country Acme employs people in with that country's currency", () => {
    expect(validateNewEmployee({ countryCode: "US", currency: "USD" })).toEqual({ ok: true });
    expect(validateNewEmployee({ countryCode: "IN", currency: "INR" })).toEqual({ ok: true });
  });

  it("rejects a country Acme doesn't employ people in, without a currency error", () => {
    expect(validateNewEmployee({ countryCode: "FR", currency: "EUR" })).toEqual({
      ok: false,
      errors: { country_code: "Choose a country Acme employs people in" },
    });
  });

  it("rejects a currency that isn't the country's currency", () => {
    expect(validateNewEmployee({ countryCode: "US", currency: "GBP" })).toEqual({
      ok: false,
      errors: { currency: "Currency must be the country's currency (USD)" },
    });
  });
});
