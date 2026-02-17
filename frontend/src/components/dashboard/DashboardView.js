import React from 'react';
import { RefreshCw, Settings2 } from 'lucide-react';
import DashboardGrid from './DashboardGrid';
import InsightsPanel from './InsightsPanel';
import DataUsageBar from './DataUsageBar';
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
  onReconfigure,
  onRefresh,
  refreshing,
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Top actions bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <p className="text-xs text-slate-400">
                Last updated {new Date(lastRefreshed).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
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

        {/* Widget grid */}
        <DashboardGrid
          widgets={widgets}
          loading={widgetsLoading}
          onDeleteWidget={onDeleteWidget}
        />

        {/* Insights panel */}
        <InsightsPanel
          insights={insights}
          loading={insightsLoading}
        />

        {/* Data usage bar */}
        <DataUsageBar usage={dataUsage} />
      </div>
    </div>
  );
}
