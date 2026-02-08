import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { Toaster } from '../components/ui/sonner';
import { Loader2 } from 'lucide-react';

const DashboardLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7F6]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      <Sidebar />
      <main className="lg:ml-52 p-4 lg:p-6">
        <Outlet />
      </main>
      <Toaster position="top-right" />
    </div>
  );
};

export default DashboardLayout;
