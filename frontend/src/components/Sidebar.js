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
  LayoutDashboard,
  ArrowLeft,
  MessageSquare,
  MessageCircle,
  ChevronDown,
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Create context for sidebar state
export const SidebarContext = createContext();
export const useSidebar = () => useContext(SidebarContext);

const mainNavItems = [
  { path: '/app/agents', icon: Bot, label: 'Agents' },
  { path: '/app/leads', icon: Users, label: 'All Leads' },
];

const agentNavItems = [
  { path: '', icon: LayoutDashboard, label: 'Dashboard', relative: true },
  { path: '/leads', icon: Users, label: 'Leads', relative: true },
  { path: '/settings', icon: Settings, label: 'Settings', relative: true },
  { path: '/knowledge', icon: FileText, label: 'Knowledge Base', relative: true },
  { path: '/connections', icon: Plug, label: 'Connections', relative: true },
];

const chatNavItems = [
  { path: '/test-chat', icon: MessageSquare, label: 'Test Bot', relative: true },
  { path: '/crm-chat', icon: MessageCircle, label: 'CRM Chat', relative: true },
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
  const agentMatch = location.pathname.match(/\/app\/agents\/([^/]+)/);
  const currentAgentId = agentMatch ? agentMatch[1] : null;
  const isInAgentContext = currentAgentId && currentAgentId !== 'new';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section with Collapse Toggle */}
      <div className={`flex items-center justify-between h-14 border-b border-slate-100 ${collapsed ? 'px-3' : 'px-4'}`}>
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.svg"
            alt="LeadRelay"
            className="h-8 w-8 flex-shrink-0"
            style={{ objectFit: 'contain' }}
          />
          {!collapsed && (
            <span className="font-semibold text-[22px] tracking-tight">
              <span className="text-emerald-600">Lead</span><span className="text-slate-900">Relay</span>
            </span>
          )}
        </div>
        {/* Collapse Toggle - Desktop only */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
          }}
          className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150 ${collapsed ? 'mx-auto' : ''}`}
          data-testid="toggle-sidebar-btn"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          ) : (
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {/* Primary Nav */}
        <div className="space-y-0.5">
          {mainNavItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                } ${collapsed ? 'justify-center' : ''}`
              }
              data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {!collapsed && <span>{label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {/* Agent Context Nav */}
        {isInAgentContext && (
          <>
            <div className="mt-4 pt-4 border-t border-slate-100">
              {!collapsed && (
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Agent
                </p>
              )}

              <div className="space-y-0.5">
                {agentNavItems.map(({ path, icon: Icon, label, relative }) => {
                  const fullPath = relative ? `/app/agents/${currentAgentId}${path}` : path;

                  return (
                    <NavLink
                      key={path || 'dashboard'}
                      to={fullPath}
                      end={path === ''}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150 group relative ${
                          isActive
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        } ${collapsed ? 'justify-center' : ''}`
                      }
                      data-testid={`nav-agent-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                      {!collapsed && <span>{label}</span>}
                      {collapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg pointer-events-none">
                          {label}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Chats Category */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              {!collapsed && (
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Chats
                </p>
              )}

              <div className="space-y-0.5">
                {chatNavItems.map(({ path, icon: Icon, label, relative }) => {
                  const fullPath = relative ? `/app/agents/${currentAgentId}${path}` : path;

                  return (
                    <NavLink
                      key={path}
                      to={fullPath}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-150 group relative ${
                          isActive
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        } ${collapsed ? 'justify-center' : ''}`
                      }
                      data-testid={`nav-chat-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                      {!collapsed && <span>{label}</span>}
                      {collapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg pointer-events-none">
                          {label}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-slate-100">
        {/* User Account Section */}
        <div className={`p-2 border-t border-slate-100 ${collapsed ? 'px-1.5' : ''}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-all duration-150 group ${collapsed ? 'justify-center' : ''}`}
                data-testid="account-menu-btn"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-600">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[13px] font-medium text-slate-900 truncate">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {user?.email || 'Account'}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" strokeWidth={1.75} />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={collapsed ? "center" : "end"}
              side="top"
              sideOffset={8}
              className="w-56"
            >
              <div className="px-3 py-2.5 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
              </div>
              <div className="py-1">
                <DropdownMenuItem
                  className="gap-2.5 px-3 py-2 text-[13px] cursor-pointer"
                  onClick={() => navigate('/app/settings')}
                >
                  <Settings className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 px-3 py-2 text-[13px] cursor-pointer"
                  onClick={() => navigate('/app/account')}
                >
                  <User className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                  <span>Account</span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <div className="py-1">
                <DropdownMenuItem
                  className="gap-2.5 px-3 py-2 text-[13px] text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  onClick={handleLogout}
                  data-testid="logout-menu-item"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.75} />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow transition-shadow"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-btn"
      >
        {mobileOpen ? (
          <X className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
        ) : (
          <Menu className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
        )}
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
          fixed top-0 left-0 h-screen bg-white border-r border-slate-200/80 flex flex-col z-40
          transition-all duration-200 ease-out
          ${collapsed ? 'w-[60px]' : 'w-56'}
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
