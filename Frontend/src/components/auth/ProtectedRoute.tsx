import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Loader from '../Loader';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  role?: 'admin' | 'manager' | 'technician';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isTechnician = user?.role === 'technician';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [loading, navigate, user]);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  if (role === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  if (role === 'manager' && !(isAdmin || isManager)) {
    return <Navigate to="/" replace />;
  }
  if (role === 'technician' && !(isAdmin || isManager || isTechnician)) {
    return <Navigate to="/" replace />;
  }

  return <>{children ?? <Outlet />}</>;
};

export default ProtectedRoute;

