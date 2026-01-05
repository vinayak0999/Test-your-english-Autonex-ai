import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const AdminRoute = () => {
    const { user, isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    // Check if role is admin (Currently logic is simple string check)
    if (user?.role !== 'admin') {
        // Redirect students back to their dashboard if they try to access /admin
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
