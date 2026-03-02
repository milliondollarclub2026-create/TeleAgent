import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { SidebarProvider, useSidebar } from '../components/Sidebar';

const DashboardContent = () => {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      <Sidebar />
      <main
        className={`
          transition-all duration-200 ease-out
          p-4 lg:p-6
          ${collapsed ? 'lg:ml-[60px]' : 'lg:ml-56'}
        `}
        data-testid="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
};

const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
};

export default DashboardLayout;
