 import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function RequireAuth() {
  const token = localStorage.getItem('auth:token');
  const user = localStorage.getItem('auth:user');
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
 
