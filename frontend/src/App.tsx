 import { Routes, Route, Navigate } from "react-router-dom";
 import Dashboard from "./pages/Dashboard";
 
import Analytics from "./pages/Analytics";
import RequireAuth from "./components/auth/RequireAuth";

export default function App() {
  return (
     <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
              <Routes>
           <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
          <Route path="/departments" element={<Departments />} />
           <Route path="*" element={<NotFound />} />
 
        </Routes>
    </div>
 
 
  );
}
