import React, { useRef } from 'react';
import { RefreshCw, Settings2 } from 'lucide-react';
import DashboardGrid from './DashboardGrid';
import InsightsPanel from './InsightsPanel';
import DataUsageBar from './DataUsageBar';
import MetricsSummaryCard from './MetricsSummaryCard';
import DateRangeSelector from './DateRangeSelector';
import ExportMenu from './ExportMenu';
import ShareDialog from './ShareDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

export default function DashboardView({
  widgets,
  widgetsLoading,
  insights,
  insightsLoading,
  dataUsage,
  lastRefreshed,
  onDeleteWidget,
  onModifyWidget,
  onReconfigure,
  onRefresh,
  refreshing,
  onDismissAlert,
  getRevenueOverview,
  dateRange,
  onDateRangeChange,
  onDrillDown,
  onReorderWidgets,
  onResizeWidget,
  api,
}) {
  const dashboardRef = useRef(null);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto px-4 py-5 space-y-6">
        {/* Top actions bar */}
        <div className="flex items-center justify-between flex-wrap gap-2" data-tour="top-actions">
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <p className="text-xs text-slate-400">
                Last updated {new Date(lastRefreshed).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Range Selector */}
            {onDateRangeChange && (
              <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
            )}

            {/* Export */}
            <ExportMenu dashboardRef={dashboardRef} widgets={widgets} dateRange={dateRange} />

            {/* Share */}
            {api && <ShareDialog api={api} />}

            {/* Reconfigure */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" strokeWidth={2} />
                  Reconfigure
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reconfigure dashboard?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all current widgets and restart the setup process. Your chat history will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={onReconfigure}
                  >
                    Reconfigure
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
              Refresh
            </button>
          </div>
        </div>

        {/* Exportable content area */}
        <div ref={dashboardRef} className="space-y-6">
          {/* Analytics summary */}
          {getRevenueOverview && (
            <div data-tour="kpi-row">
              <MetricsSummaryCard getRevenueOverview={getRevenueOverview} dateRange={dateRange} />
            </div>
          )}

          {/* Widget grid */}
          <div data-tour="chart-grid">
          <DashboardGrid
            widgets={widgets}
            loading={widgetsLoading}
            onDeleteWidget={onDeleteWidget}
            onModifyWidget={onModifyWidget}
            onDrillDown={onDrillDown}
            onReorderWidgets={onReorderWidgets}
            onResizeWidget={onResizeWidget}
          />
          </div>
        </div>

        {/* Insights panel */}
        <InsightsPanel
          insights={insights}
          loading={insightsLoading}
          onDismissAlert={onDismissAlert}
        />

        {/* Data usage bar */}
        <DataUsageBar usage={dataUsage} />
      </div>
    </div>
  );
}
