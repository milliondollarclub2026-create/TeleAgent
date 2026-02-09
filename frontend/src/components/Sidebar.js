import React, { useState, createContext, useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bot, 
  Users, 
  Plug, 
  Settings, 
  FileText, 
  LogOut,
  Menu,
  X,
  Zap,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '../components/ui/button';

// Create context for sidebar state
export const SidebarContext = createContext();
export const useSidebar = () => useContext(SidebarContext);

const mainNavItems = [
  { path: '/app/agents', icon: Bot, label: 'Agents' },
  { path: '/app/leads', icon: Users, label: 'Leads' },
];

const agentNavItems = [
  { path: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', relative: true },
  { path: 'settings', icon: Settings, label: 'Settings', relative: true },
  { path: '/app/knowledge-base', icon: FileText, label: 'Knowledge Base' },
  { path: '/app/connections', icon: Plug, label: 'Connections' },
];

export const SidebarProvider = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed(!collapsed);
  
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggleSidebar } = useSidebar();

  // Check if we're viewing a specific agent
  const agentMatch = location.pathname.match(/\/agents\/([^/]+)/);
  const currentAgentId = agentMatch ? agentMatch[1] : null;
  const isInAgentContext = currentAgentId && currentAgentId !== 'new';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <>
      {/* Logo - Top Left */}
      <div className={`p-4 border-b border-slate-200 ${collapsed ? 'px-3' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Zap className="w-5 h-5 text-white" strokeWidth={2.25} />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
              TeleAgent
            </span>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {/* Primary Nav */}
        <div className="space-y-0.5">
          {mainNavItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${collapsed ? 'justify-center px-2.5' : ''}`
              }
              data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {!collapsed && <span>{label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {/* Agent Context Nav */}
        {isInAgentContext && (
          <>
            <div className={`pt-3 mt-3 border-t border-slate-100 ${collapsed ? 'mx-1' : ''}`}>
              {!collapsed && (
                <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Current Agent
                </p>
              )}
            </div>
            <div className="space-y-0.5">
              {agentNavItems.map(({ path, icon: Icon, label, relative }) => {
                const fullPath = relative ? `/agents/${currentAgentId}${path === 'dashboard' ? '' : `/${path}`}` : path;
                
                return (
                  <NavLink
                    key={path}
                    to={fullPath}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      } ${collapsed ? 'justify-center px-2.5' : ''}`
                    }
                    data-testid={`nav-agent-${label.toLowerCase().replace(' ', '-')}`}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                    {!collapsed && <span>{label}</span>}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg">
                        {label}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Collapse toggle button */}
      <div className={`py-2 border-t border-slate-100 hidden lg:block ${collapsed ? 'px-1.5' : 'px-2'}`}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
          }}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors text-sm ${collapsed ? 'px-0' : 'px-3'}`}
          data-testid="toggle-sidebar-btn"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* User section */}
      <div className={`p-3 border-t border-slate-200 ${collapsed ? 'p-2' : ''}`}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-lg bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.business_name || user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 h-9"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
              <span className="text-sm">Sign Out</span>
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              data-testid="logout-btn-collapsed"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-btn"
      >
        {mobileOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col z-40
          transition-all duration-200 ease-out
          ${collapsed ? 'w-[68px]' : 'w-56'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        data-testid="sidebar"
      >
        <NavContent />
      </aside>
    </>
  );
};

export default Sidebar;
