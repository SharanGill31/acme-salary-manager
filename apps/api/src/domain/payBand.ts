export interface PayBand {
  minMinor: bigint;
  maxMinor: bigint;
}

function assertValidBand(band: PayBand): void {
  if (band.minMinor > band.maxMinor) {
    throw new Error(
      `Invalid pay band: min (${band.minMinor}) is greater than max (${band.maxMinor})`,
    );
  }
}

export function classifyAgainstBand(
  salaryMinor: bigint,
  band: PayBand,
): "below" | "within" | "above" {
  assertValidBand(band);

  if (salaryMinor < band.minMinor) return "below";
  if (salaryMinor > band.maxMinor) return "above";
  return "within";
}

export function compaRatio(salaryMinor: bigint, band: PayBand): number {
  assertValidBand(band);

  const midpoint = (Number(band.minMinor) + Number(band.maxMinor)) / 2;
  const ratio = Number(salaryMinor) / midpoint;

  return Math.round(ratio * 100) / 100;
}
