import { Navigate, Outlet, useLocation } from "react-router-dom";
// TODO: wire to real auth
export default function RequireAuth() {
  const user = true; // replace with real auth check
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
