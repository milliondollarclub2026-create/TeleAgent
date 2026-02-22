import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import AiOrb from '../components/Orb/AiOrb';
import useDashboardApi from '../hooks/useDashboardApi';
import DashboardOnboarding from '../components/dashboard/DashboardOnboarding';
import DashboardView from '../components/dashboard/DashboardView';
import DashboardChat from '../components/dashboard/DashboardChat';
import DashboardTour from '../components/dashboard/DashboardTour';
import SplitPaneLayout from '../components/dashboard/SplitPaneLayout';
import { getDefaultDateRange } from '../components/dashboard/DateRangeSelector';
import { AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
import { useSidebar } from '../components/Sidebar';

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
  const { hiredPrebuilt, user } = useAuth();
  const navigate = useNavigate();
  const api = useDashboardApi();
  const { setCollapsed } = useSidebar();

  // Guard: redirect to agents if Bobur not hired (null = still loading, skip check)
  useEffect(() => {
    if (hiredPrebuilt !== null && !hiredPrebuilt?.includes('prebuilt-analytics')) {
      navigate('/app/agents', { replace: true });
    }
  }, [hiredPrebuilt, navigate]);

  // Auto-collapse sidebar on the CRM dashboard for a cleaner layout
  useEffect(() => {
    setCollapsed(true);
    return () => setCollapsed(false);
  }, [setCollapsed]);

  const [config, setConfig] = useState(undefined); // undefined = loading, null = no config
  const [configLoading, setConfigLoading] = useState(true);
  const [hasCRM, setHasCRM] = useState(null); // null = checking

  // Split-pane chat state
  const [chatOpen, setChatOpen] = useState(true);

  // Date range state
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // Dashboard data
  const [widgets, setWidgets] = useState([]);
  const [widgetsLoading, setWidgetsLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [dataUsage, setDataUsage] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modify widget flow: tracks which widget is being modified via chat
  const [modifyingWidget, setModifyingWidget] = useState(null);

  // Drill-down: auto-inject a chat message
  const [drillDownMessage, setDrillDownMessage] = useState(null);

  // Demo mode
  const [demoMode, setDemoMode] = useState(false);

  // Tour
  const [showTour, setShowTour] = useState(false);

  // --- Load config on mount ---
  const [initSlow, setInitSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const slowTimer = setTimeout(() => {
      if (!cancelled) setInitSlow(true);
    }, 10000);

    const init = async () => {
      setConfigLoading(true);

      const [intResult, cfgResult] = await Promise.all([
        api.getIntegrationsStatus(),
        api.getConfig(),
      ]);
      clearTimeout(slowTimer);
      if (cancelled) return;

      const crmConnected = intResult.data?.bitrix?.connected ?? false;
      setHasCRM(crmConnected);
      setConfigLoading(false);

      const { data: cfgData, error } = cfgResult;
      if (error || !cfgData) {
        setConfig(null);
        return;
      }

      const innerConfig = cfgData?.config ?? cfgData;
      setConfig(innerConfig);

      if (innerConfig?.onboarding_state === 'complete') {
        loadDashboardData();
      }
    };
    init();
    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, []);

  // --- Load dashboard data ---
  const loadDashboardData = useCallback(async () => {
    setWidgetsLoading(true);
    setInsightsLoading(true);

    const [widgetRes, insightRes, usageRes, alertRes] = await Promise.all([
      api.getWidgets(dateRange),
      api.getInsights(),
      api.getDataUsage(),
      api.getRevenueAlerts('open'),
    ]);

    if (widgetRes.data) {
      setWidgets(Array.isArray(widgetRes.data) ? widgetRes.data : widgetRes.data.widgets || []);
    }
    setWidgetsLoading(false);

    const alertItems = (alertRes.data?.alerts || []).map(a => ({
      id: a.id,
      title: a.summary,
      description: (a.recommended_actions_json || [])[0] || '',
      severity: a.severity,
      suggested_action: (a.recommended_actions_json || [])[1] || null,
      dismissible: true,
    }));

    const nilufarInsights = insightRes.data
      ? (Array.isArray(insightRes.data) ? insightRes.data : insightRes.data.insights || [])
      : [];
    setInsights([...alertItems, ...nilufarInsights]);
    setInsightsLoading(false);

    if (usageRes.data) {
      setDataUsage(usageRes.data.entities || usageRes.data || {});
    }

    setLastRefreshed(new Date().toISOString());
  }, [api, dateRange]);

  // Reload data when date range changes
  useEffect(() => {
    if (config?.onboarding_state === 'complete') {
      loadDashboardData();
    }
  }, [dateRange]);

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
      const { data: refreshed } = await api.getWidgets(dateRange);
      if (refreshed) {
        setWidgets(Array.isArray(refreshed) ? refreshed : refreshed.widgets || []);
      }
    }
    return { data, error };
  }, [api, dateRange]);

  // --- Modify widget (opens chat panel if collapsed) ---
  const handleModifyWidget = useCallback((widget) => {
    setModifyingWidget(widget);
    setChatOpen(true);
  }, []);

  // --- Replace widget (from modify flow in chat) ---
  const handleReplaceWidget = useCallback(async (widgetData) => {
    if (!modifyingWidget?.id) return { error: 'No widget to replace' };
    const { error } = await api.updateWidget(modifyingWidget.id, widgetData);
    if (!error) {
      const { data: refreshed } = await api.getWidgets(dateRange);
      if (refreshed) {
        setWidgets(Array.isArray(refreshed) ? refreshed : refreshed.widgets || []);
      }
      setModifyingWidget(null);
      toast.success('Widget updated');
    }
    return { error };
  }, [api, modifyingWidget, dateRange]);

  // --- Dismiss revenue alert ---
  const handleDismissAlert = useCallback(async (alertId) => {
    const { error } = await api.dismissRevenueAlert(alertId);
    if (!error) {
      setInsights(prev => prev.filter(i => i.id !== alertId));
    }
  }, [api]);

  // --- Reconfigure ---
  const handleReconfigure = useCallback(async () => {
    const { error } = await api.reconfigure();
    if (error) return;
    setConfig(null);
    setWidgets([]);
    setInsights([]);
  }, [api]);

  // --- Demo mode ---
  const handleDemoMode = useCallback(async () => {
    const { data, error } = await api.getDemoWidgets();
    if (error) {
      toast.error('Failed to load sample data');
      return;
    }
    setWidgets(data?.widgets || []);
    setDemoMode(true);
    setConfig({ onboarding_state: 'complete', demo: true });
  }, [api]);

  // Auto-exit demo when real CRM connects
  useEffect(() => {
    if (hasCRM && demoMode) {
      setDemoMode(false);
      setConfig(null);
      setWidgets([]);
    }
  }, [hasCRM, demoMode]);

  // --- Onboarding complete ---
  const handleOnboardingComplete = useCallback((data) => {
    setConfig({ onboarding_state: 'complete', ...data });
    loadDashboardData();
    setShowTour(true);
  }, [loadDashboardData]);

  // --- Drill-down handler (chart click → chat) ---
  const handleDrillDown = useCallback(({ label, value, chartTitle }) => {
    const query = `Show me the ${label} ${chartTitle ? `from "${chartTitle}"` : 'records'} in detail`;
    setChatOpen(true);
    setDrillDownMessage(query);
  }, []);

  // --- Reorder widgets ---
  const handleReorderWidgets = useCallback(async (orderedIds) => {
    // Optimistically update parent widget order
    setWidgets(prev => {
      const idMap = new Map(prev.map(w => [w.id, w]));
      return orderedIds.map(id => idMap.get(id)).filter(Boolean);
    });
    const { error } = await api.reorderWidgets(orderedIds);
    if (error) {
      toast.error('Failed to save layout');
    }
  }, [api]);

  // --- Resize widget ---
  const handleResizeWidget = useCallback(async (widgetId, size) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, size } : w));
    const { error } = await api.resizeWidget(widgetId, size);
    if (error) {
      toast.error('Failed to save size');
    }
  }, [api]);

  // --- Loading state ---
  if (configLoading) {
    return (
      <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex flex-col items-center justify-center gap-4">
        <AiOrb size={64} colors={BOBUR_ORB_COLORS} state="thinking" />
        <p className="text-[13px] text-slate-500 font-medium">Loading dashboard...</p>
        {initSlow && (
          <p className="text-xs text-slate-400 animate-pulse">Backend is starting up, please wait...</p>
        )}
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
          onDemoMode={handleDemoMode}
        />
      </div>
    );
  }

  // --- Dashboard ready (split pane) ---
  return (
    <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex flex-col" data-testid="crm-dashboard-page">
      {/* Dashboard tour */}
      {showTour && (
        <DashboardTour tenantId={user?.tenant_id} onComplete={() => setShowTour(false)} />
      )}

      {/* Demo mode banner */}
      {demoMode && (
        <div className="flex-shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
              <span className="text-amber-800 font-medium">Viewing sample data</span>
            </div>
            <button
              onClick={() => { setDemoMode(false); setConfig(null); setWidgets([]); }}
              className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
            >
              Connect your CRM
              <ArrowRight className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex-shrink-0 min-h-[3rem] px-4 flex items-center justify-between gap-2 -mt-2 lg:-mt-3 relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Left: Bobur identity */}
        <div className="flex items-center gap-2.5">
          <AiOrb size={28} colors={BOBUR_ORB_COLORS} state="idle" />
          <div>
            <h1 className="text-[14px] font-semibold text-slate-900 leading-tight">Bobur</h1>
            <p className="text-[10px] text-slate-400 font-medium">Analytics Team Lead</p>
          </div>
        </div>

        {/* Right: spacer */}
        <div className="hidden sm:block w-24" />
      </div>

      {/* Split pane content */}
      <div className="flex-1 min-h-0">
        <SplitPaneLayout
          chatOpen={chatOpen}
          onChatOpenChange={setChatOpen}
          dashboard={
            <DashboardView
              widgets={widgets}
              widgetsLoading={widgetsLoading}
              insights={insights}
              insightsLoading={insightsLoading}
              dataUsage={dataUsage}
              lastRefreshed={lastRefreshed}
              onDeleteWidget={handleDeleteWidget}
              onModifyWidget={handleModifyWidget}
              onReconfigure={handleReconfigure}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              onDismissAlert={handleDismissAlert}
              getRevenueOverview={api.getRevenueOverview}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onDrillDown={handleDrillDown}
              onReorderWidgets={handleReorderWidgets}
              onResizeWidget={handleResizeWidget}
            />
          }
          chat={
            <DashboardChat
              api={api}
              onAddWidget={handleAddWidget}
              modifyingWidget={modifyingWidget}
              onReplaceWidget={handleReplaceWidget}
              onCancelModify={() => setModifyingWidget(null)}
              compact
              drillDownMessage={drillDownMessage}
              onDrillDownConsumed={() => setDrillDownMessage(null)}
              demoMode={demoMode}
            />
          }
        />
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
