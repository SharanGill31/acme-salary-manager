const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;
const RATE_SCALE = 1_000_000n;

export function toMinor(amount: string, currency: string): bigint {
  const match = DECIMAL_PATTERN.exec(amount);

  if (!match) {
    throw new Error(`Invalid amount for ${currency}: "${amount}"`);
  }

  const [, sign, wholePart, fractionPart = ""] = match;

  if (sign === "-") {
    throw new Error(`Amount must not be negative for ${currency}: "${amount}"`);
  }

  if (fractionPart.length > 2) {
    throw new Error(
      `Amount must not have more than two decimal places for ${currency}: "${amount}"`,
    );
  }

  const paddedFraction = fractionPart.padEnd(2, "0");
  return BigInt(wholePart) * 100n + BigInt(paddedFraction || "0");
}

export function formatMoney(amountMinor: bigint, currency: string, locale = "en-US"): string {
  const major = Number(amountMinor) / 100;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(major);
}

export function convertToUsd(amountMinor: bigint, rateToUsd: number): bigint {
  const rateScaled = BigInt(Math.round(rateToUsd * Number(RATE_SCALE)));
  const product = amountMinor * rateScaled;
  const quotient = product / RATE_SCALE;
  const remainder = product % RATE_SCALE;

  return remainder * 2n >= RATE_SCALE ? quotient + 1n : quotient;
}

export function percentChange(previousMinor: bigint, nextMinor: bigint): number {
  if (previousMinor <= 0n) {
    throw new Error(`previousMinor must be positive, received ${previousMinor}`);
  }

  const diff = nextMinor - previousMinor;
  const ratio = (Number(diff) * 100) / Number(previousMinor);

  return Math.round(ratio * 10) / 10;
}
