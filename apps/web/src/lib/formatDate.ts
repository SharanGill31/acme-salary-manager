// Dates come from the API as UTC midnight ISO strings; format in UTC so the
// calendar day never shifts with the viewer's time zone.
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
