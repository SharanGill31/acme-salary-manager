import { lazy, Suspense } from "react";
import { CircularProgress } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { NotFoundPage } from "./components/NotFoundPage";
import { EmployeeDetailPage } from "./features/employees/EmployeeDetailPage";
import { EmployeesPage } from "./features/employees/EmployeesPage";
import { NewEmployeePage } from "./features/employees/NewEmployeePage";

// Insights (and its charting library) loads on demand, keeping it out of the
// main bundle that every page needs.
const InsightsPage = lazy(() =>
  import("./features/insights/InsightsPage").then((module) => ({ default: module.InsightsPage })),
);

function PageLoading() {
  return <CircularProgress aria-label="Loading page" sx={{ display: "block", mx: "auto", my: 6 }} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/employees" replace />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/new" element={<NewEmployeePage />} />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route
          path="/insights"
          element={
            <Suspense fallback={<PageLoading />}>
              <InsightsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
