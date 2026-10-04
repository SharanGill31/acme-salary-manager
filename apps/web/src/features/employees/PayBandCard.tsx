import { Box, Chip, Paper, Typography } from "@mui/material";
import type { BandPosition, EmployeeDetailResponse } from "shared";
import { BAND_POSITION_COLORS, BAND_POSITION_LABELS } from "../../lib/bandPosition";
import { formatCurrency } from "../../lib/money";

const percentFormat = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });

// Where the salary sits between band min (0) and max (100), clamped.
// BigInt keeps the money arithmetic integer; only the resulting whole
// percentage becomes a number.
function positionPercent(salaryMinor: string, minMinor: string, maxMinor: string): number {
  const salary = BigInt(salaryMinor);
  const min = BigInt(minMinor);
  const max = BigInt(maxMinor);
  if (max <= min) return salary < min ? 0 : 100;

  const percent = Number(((salary - min) * 100n) / (max - min));
  return Math.min(100, Math.max(0, percent));
}

function describePosition(position: BandPosition, percent: number): string {
  if (position === "below") return "Salary is below the band minimum";
  if (position === "above") return "Salary is above the band maximum";
  return `Salary sits at ${percent}% of the band, from minimum to maximum`;
}

interface PayBandCardProps {
  detail: EmployeeDetailResponse;
}

export function PayBandCard({ detail }: PayBandCardProps) {
  const { employee, payBand, bandPosition, compaRatio } = detail;
  const percent = positionPercent(employee.salaryMinor, payBand.minMinor, payBand.maxMinor);

  return (
    <Paper component="section" aria-labelledby="pay-band-heading" sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography id="pay-band-heading" variant="h6" component="h2">
          Pay band
        </Typography>
        <Chip label={BAND_POSITION_LABELS[bandPosition]} color={BAND_POSITION_COLORS[bandPosition]} size="small" />
      </Box>

      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: 1 }}>
        <Typography component="dt" color="text.secondary">
          Band ({payBand.level}, {payBand.countryCode})
        </Typography>
        <Typography component="dd" sx={{ m: 0 }}>
          {`${formatCurrency(payBand.minMinor, employee.currency)} – ${formatCurrency(payBand.maxMinor, employee.currency)}`}
        </Typography>
        <Typography component="dt" color="text.secondary">
          Compa-ratio
        </Typography>
        <Typography component="dd" sx={{ m: 0 }}>
          {percentFormat.format(compaRatio)}
        </Typography>
      </Box>

      <Box
        role="img"
        aria-label={describePosition(bandPosition, percent)}
        sx={{ position: "relative", height: 12, mt: 3, mb: 1, borderRadius: 6, bgcolor: "grey.300" }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -4,
            left: `${percent}%`,
            transform: "translateX(-50%)",
            width: 4,
            height: 20,
            borderRadius: 1,
            bgcolor: `${BAND_POSITION_COLORS[bandPosition]}.main`,
          }}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between" }} aria-hidden="true">
        <Typography variant="caption">Min</Typography>
        <Typography variant="caption">Max</Typography>
      </Box>
    </Paper>
  );
}
