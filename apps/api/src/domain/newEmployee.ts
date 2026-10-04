import { COUNTRY_CURRENCIES } from "shared";

export interface NewEmployeeInput {
  countryCode: string;
  currency: string;
}

// Error keys are the create body's field names so clients can show each
// message against the matching input.
export type NewEmployeeValidation =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

// Pay bands are held per country in that country's currency, so a new
// employee must be in a country Acme employs people in and be paid in its
// currency; otherwise their profile would be compared against the wrong band
// (or no band at all).
export function validateNewEmployee(input: NewEmployeeInput): NewEmployeeValidation {
  const country = COUNTRY_CURRENCIES.find((entry) => entry.countryCode === input.countryCode);

  if (!country) {
    return { ok: false, errors: { country_code: "Choose a country Acme employs people in" } };
  }

  if (input.currency !== country.currency) {
    return {
      ok: false,
      errors: { currency: `Currency must be the country's currency (${country.currency})` },
    };
  }

  return { ok: true };
}
