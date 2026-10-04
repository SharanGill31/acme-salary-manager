// Money is integer minor units (as a string on the wire) plus an ISO 4217
// code. Nothing here converts money to a float: amounts are moved between
// minor units and decimal strings by string/BigInt arithmetic, and
// Intl.NumberFormat formats decimal strings exactly (ES2023 Intl).

const LOCALE = "en-US";

export function currencyMinorDigits(currency: string): number {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
}

function minorToDecimalString(amountMinor: string, digits: number): `${number}` {
  const value = BigInt(amountMinor);
  const sign = value < 0n ? "-" : "";
  const abs = (value < 0n ? -value : value).toString();
  if (digits === 0) return `${sign}${abs}` as `${number}`;

  const padded = abs.padStart(digits + 1, "0");
  const major = padded.slice(0, -digits);
  const fraction = padded.slice(-digits);
  return `${sign}${major}.${fraction}` as `${number}`;
}

export function formatCurrency(amountMinor: string, currency: string): string {
  const digits = currencyMinorDigits(currency);
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(
    minorToDecimalString(amountMinor, digits),
  );
}

/**
 * Parses what a user typed (e.g. "95,000.50") into integer minor units for
 * the given currency. Returns null for anything that isn't a plain
 * non-negative amount with at most the currency's minor digits, or that
 * can't be sent as a safe integer.
 */
export function parseMoneyToMinor(input: string, currency: string): number | null {
  const digits = currencyMinorDigits(currency);
  const cleaned = input.trim().replace(/,/g, "");
  const pattern = digits === 0 ? /^(\d+)$/ : new RegExp(`^(\\d+)(?:\\.(\\d{1,${digits}}))?$`);
  const match = pattern.exec(cleaned);
  if (!match) return null;

  const [, major, fraction = ""] = match;
  const minor = BigInt(major + fraction.padEnd(digits, "0"));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;

  return Number(minor);
}
