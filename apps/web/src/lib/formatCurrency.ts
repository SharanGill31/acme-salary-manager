export function formatCurrency(amountMinor: string, currency: string): string {
  const major = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(major);
}
