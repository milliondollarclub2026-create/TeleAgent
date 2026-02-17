import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import AiOrb from '../components/Orb/AiOrb';
import useDashboardApi from '../hooks/useDashboardApi';
import DashboardOnboarding from '../components/dashboard/DashboardOnboarding';
import DashboardView from '../components/dashboard/DashboardView';
import DashboardChat from '../components/dashboard/DashboardChat';
import { AlertTriangle } from 'lucide-react';

// Error boundary to catch rendering crashes
class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRM Dashboard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="text-sm text-slate-500 text-center max-w-md">
            The dashboard encountered an unexpected error. Please refresh the page to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Bobur's orb colors (orange/amber - matches Bitrix24)
const BOBUR_ORB_COLORS = ['#f97316', '#ea580c', '#f59e0b'];

function CRMDashboardPageInner() {
  const api = useDashboardApi();
  const [config, setConfig] = useState(undefined); // undefined = loading, null = no config
  const [configLoading, setConfigLoading] = useState(true);
  const [hasCRM, setHasCRM] = useState(null); // null = checking
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dashboard data
  const [widgets, setWidgets] = useState([]);
  const [widgetsLoading, setWidgetsLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [dataUsage, setDataUsage] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // --- Load config on mount ---
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setConfigLoading(true);

      // Check integrations status to determine if CRM is connected
      const { data: intData } = await api.getIntegrationsStatus();
      if (cancelled) return;
      const crmConnected = intData?.bitrix?.connected ?? false;
      setHasCRM(crmConnected);

      // Get dashboard config
      const { data: cfgData, error } = await api.getConfig();
      if (cancelled) return;
      setConfigLoading(false);

      if (error || !cfgData) {
        setConfig(null);
        return;
      }

      // Unwrap config: backend returns { config: { onboarding_state, ... } }
      const innerConfig = cfgData?.config ?? cfgData;
      setConfig(innerConfig);

      // If onboarding complete, load dashboard data
      if (innerConfig?.onboarding_state === 'complete') {
        loadDashboardData();
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // --- Load dashboard data ---
  const loadDashboardData = useCallback(async () => {
    setWidgetsLoading(true);
    setInsightsLoading(true);

    const [widgetRes, insightRes, usageRes] = await Promise.all([
      api.getWidgets(),
      api.getInsights(),
      api.getDataUsage(),
    ]);

    if (widgetRes.data) {
      setWidgets(Array.isArray(widgetRes.data) ? widgetRes.data : widgetRes.data.widgets || []);
    }
    setWidgetsLoading(false);

    if (insightRes.data) {
      setInsights(Array.isArray(insightRes.data) ? insightRes.data : insightRes.data.insights || []);
    }
    setInsightsLoading(false);

    if (usageRes.data) {
      setDataUsage(usageRes.data.entities || usageRes.data || {});
    }

    setLastRefreshed(new Date().toISOString());
  }, [api]);

  // --- Refresh handler ---
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  // --- Delete widget ---
  const handleDeleteWidget = useCallback(async (widgetId) => {
    const { error } = await api.deleteWidget(widgetId);
    if (!error) {
      setWidgets(prev => prev.filter(w => w.id !== widgetId));
    }
  }, [api]);

  // --- Add widget (from chat) ---
  const handleAddWidget = useCallback(async (widgetData) => {
    const { data, error } = await api.addWidget(widgetData);
    if (!error && data) {
      // Refetch full widget list instead of pushing partial response
      const { data: refreshed } = await api.getWidgets();
      if (refreshed) {
        setWidgets(Array.isArray(refreshed) ? refreshed : refreshed.widgets || []);
      }
    }
    return { data, error };
  }, [api]);

  // --- Reconfigure ---
  const handleReconfigure = useCallback(async () => {
    const { error } = await api.reconfigure();
    if (error) return;
    setConfig(null);
    setWidgets([]);
    setInsights([]);
  }, [api]);

  // --- Onboarding complete ---
  const handleOnboardingComplete = useCallback((data) => {
    setConfig({ onboarding_state: 'complete', ...data });
    loadDashboardData();
  }, [loadDashboardData]);

  // --- Loading state ---
  if (configLoading) {
    return (
      <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex flex-col items-center justify-center gap-4">
        <AiOrb size={64} colors={BOBUR_ORB_COLORS} state="thinking" />
        <p className="text-[13px] text-slate-500 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  // --- Onboarding needed ---
  if (!config || config.onboarding_state !== 'complete') {
    return (
      <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)]">
        <DashboardOnboarding
          api={api}
          hasCRM={hasCRM}
          config={config}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  // --- Dashboard ready (tabs) ---
  return (
    <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex flex-col" data-testid="crm-dashboard-page">
      {/* Top bar */}
      <div className="flex-shrink-0 min-h-[3rem] px-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 -mt-2 lg:-mt-3 relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Left: Bobur identity */}
        <div className="flex items-center gap-2.5">
          <AiOrb size={28} colors={BOBUR_ORB_COLORS} state="idle" />
          <div>
            <h1 className="text-[14px] font-semibold text-slate-900 leading-tight">Bobur</h1>
            <p className="text-[10px] text-slate-400 font-medium">Analytics Team Lead</p>
          </div>
        </div>

        {/* Center: Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="static sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <TabsList className="bg-slate-100 h-8">
            <TabsTrigger
              value="dashboard"
              className="text-xs px-3 sm:px-4 h-7 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="text-xs px-3 sm:px-4 h-7 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Right: spacer for balance (hidden on mobile) */}
        <div className="hidden sm:block w-24" />
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'dashboard' ? (
          <DashboardView
            widgets={widgets}
            widgetsLoading={widgetsLoading}
            insights={insights}
            insightsLoading={insightsLoading}
            dataUsage={dataUsage}
            lastRefreshed={lastRefreshed}
            onDeleteWidget={handleDeleteWidget}
            onReconfigure={handleReconfigure}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        ) : (
          <DashboardChat
            api={api}
            onAddWidget={handleAddWidget}
          />
        )}
      </div>
    </div>
  );
}

export default function CRMDashboardPage() {
  return (
    <DashboardErrorBoundary>
      <CRMDashboardPageInner />
    </DashboardErrorBoundary>
  );
}
