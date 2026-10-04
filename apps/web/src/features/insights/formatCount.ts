const countFormat = new Intl.NumberFormat("en-US");

// Headcounts and other whole-number counts: 9412 -> "9,412".
export function formatCount(value: number): string {
  return countFormat.format(value);
}
