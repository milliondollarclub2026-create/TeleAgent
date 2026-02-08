import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar, { SidebarProvider, useSidebar } from '../components/Sidebar';
import { Toaster } from '../components/ui/sonner';
import { Loader2 } from 'lucide-react';

const DashboardContent = () => {
  const { collapsed } = useSidebar();
  
  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      <Sidebar />
      <main 
        className={`
          transition-all duration-200 ease-out
          p-4 lg:p-6
          ${collapsed ? 'lg:ml-[68px]' : 'lg:ml-56'}
        `}
        data-testid="main-content"
      >
        <Outlet />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};

const DashboardLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7F6]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" strokeWidth={2} />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
};

export default DashboardLayout;
