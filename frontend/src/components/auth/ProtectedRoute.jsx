import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/dashboard/admin" replace />;
    if (user.role === 'SELLER') return <Navigate to="/seller/home" replace />;
    if (user.role === 'SERVICE_PROVIDER') return <Navigate to="/dashboard/provider" replace />;
    return <Navigate to="/dashboard/buyer" replace />;
  }

  return children ? children : <Outlet />;
}
