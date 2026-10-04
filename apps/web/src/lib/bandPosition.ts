import type { BandPosition } from "shared";

// Shared by the profile's pay band card and the insights outliers list, so
// the two always describe a band position the same way. Chips show the label
// as text; colour is never the only signal.
export const BAND_POSITION_LABELS: Record<BandPosition, string> = {
  below: "Below band",
  within: "Within band",
  above: "Above band",
};

export const BAND_POSITION_COLORS: Record<BandPosition, "warning" | "success" | "error"> = {
  below: "warning",
  within: "success",
  above: "error",
};
