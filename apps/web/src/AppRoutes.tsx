import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { NotFoundPage } from "./components/NotFoundPage";
import { EmployeeDetailPage } from "./features/employees/EmployeeDetailPage";
import { EmployeesPage } from "./features/employees/EmployeesPage";
import { NewEmployeePage } from "./features/employees/NewEmployeePage";
import { InsightsPage } from "./features/insights/InsightsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/employees" replace />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/new" element={<NewEmployeePage />} />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
