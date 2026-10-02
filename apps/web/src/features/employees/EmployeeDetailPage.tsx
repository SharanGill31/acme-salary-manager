import { Typography } from "@mui/material";
import { useParams } from "react-router-dom";

export function EmployeeDetailPage() {
  const { id } = useParams();

  return (
    <Typography variant="h4" component="h1">
      Employee {id} — coming soon
    </Typography>
  );
}
