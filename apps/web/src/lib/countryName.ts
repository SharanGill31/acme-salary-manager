const regionNames = new Intl.DisplayNames("en", { type: "region" });

// "GB" -> "United Kingdom"; falls back to the code itself.
export function countryName(countryCode: string): string {
  return regionNames.of(countryCode) ?? countryCode;
}
