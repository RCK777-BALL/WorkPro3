import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  return localStorage.getItem('auth:token') ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

