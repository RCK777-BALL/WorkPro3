import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Departments from "./pages/Departments";
import LoginPage from "./pages/LoginPage";
import RequireAuth from "./components/auth/RequireAuth";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/departments" element={<Departments />} />
          </Route>
          <Route path="*" element={<div className="p-6">Not Found</div>} />
        </Routes>
      </Layout>
    </div>
  );
}
