import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/auth/RequireAuth";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Analytics from "./pages/dashboard/Analytics";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard/*" element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
