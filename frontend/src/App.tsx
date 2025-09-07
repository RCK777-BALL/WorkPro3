import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Departments from "./pages/Departments";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="*" element={<div className="p-6">Not Found</div>} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </div>
  );
}
