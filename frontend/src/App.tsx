 import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Departments from "./pages/Departments";
import Login from "./pages/Login";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
     <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
              <Routes>
           <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          <Route path="/departments" element={<Departments />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<NotFound />} />
 
        </Routes>
    </div>
 
 
  );
}
