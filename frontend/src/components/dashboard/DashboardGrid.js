import React, { useState } from 'react';
import { X, LayoutGrid } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import ChartRenderer from '../charts/ChartRenderer';
import { chartHasValidData } from '../../utils/chartUtils';

// Skeleton loaders
function KPISkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-16 bg-slate-200 rounded mb-2" />
      <div className="h-2.5 w-24 bg-slate-100 rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="h-3.5 w-32 bg-slate-200 rounded mb-4" />
      <div className="h-48 bg-slate-100 rounded-lg" />
    </div>
  );
}

export default function DashboardGrid({ widgets, loading, onDeleteWidget }) {
  const [deleteTarget, setDeleteTarget] = useState(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!widgets || widgets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <LayoutGrid className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
        </div>
        <h3 className="font-medium text-slate-900 mb-1">No widgets yet</h3>
        <p className="text-sm text-slate-500">
          Switch to the Chat tab and ask Bobur for charts, then add them to your dashboard.
        </p>
      </div>
    );
  }

  // Convert widget data to ChartRenderer format and categorize
  const validWidgets = widgets.filter(chartHasValidData);
  const kpis = validWidgets.filter(w => ['kpi', 'metric'].includes(w.chart_type?.toLowerCase()));
  const smallCharts = validWidgets.filter(w => ['pie', 'donut', 'bar'].includes(w.chart_type?.toLowerCase()));
  const wideCharts = validWidgets.filter(w => ['line', 'area', 'funnel'].includes(w.chart_type?.toLowerCase()));

  // Map widget to chart format for ChartRenderer
  const toChart = (widget) => ({
    type: widget.chart_type,
    title: widget.title,
    data: widget.data,
    value: widget.value,
    change: widget.change,
    changeDirection: widget.changeDirection,
  });

  const isStandard = (widget) => widget.is_standard;

  const WidgetWrapper = ({ widget, children }) => (
    <div className="relative group">
      {children}
      {/* Remove button for non-standard widgets */}
      {!isStandard(widget) && onDeleteWidget && (
        <button
          onClick={() => setDeleteTarget(widget)}
          className="absolute top-2 right-2 w-6 h-6 rounded-md bg-white/90 border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-200"
          title="Remove widget"
        >
          <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" strokeWidth={2} />
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {/* KPIs */}
        {kpis.length > 0 && (
          <div className={`grid gap-3 ${
            kpis.length === 1 ? 'grid-cols-1 max-w-xs' :
            kpis.length === 2 ? 'grid-cols-2' :
            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          }`}>
            {kpis.map((widget, idx) => (
              <WidgetWrapper key={widget.id} widget={widget}>
                <ChartRenderer chart={toChart(widget)} chartIndex={idx} />
              </WidgetWrapper>
            ))}
          </div>
        )}

        {/* Small charts (bar, pie) */}
        {smallCharts.length > 0 && (
          <div className={`grid gap-4 ${smallCharts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {smallCharts.map((widget, idx) => (
              <WidgetWrapper key={widget.id} widget={widget}>
                <ChartRenderer chart={toChart(widget)} chartIndex={kpis.length + idx} />
              </WidgetWrapper>
            ))}
          </div>
        )}

        {/* Wide charts (line, funnel) */}
        {wideCharts.length > 0 && (
          <div className="space-y-4">
            {wideCharts.map((widget, idx) => (
              <WidgetWrapper key={widget.id} widget={widget}>
                <ChartRenderer chart={toChart(widget)} chartIndex={kpis.length + smallCharts.length + idx} />
              </WidgetWrapper>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Remove this widget?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm">
              This will remove "{deleteTarget?.title || 'this widget'}" from your dashboard.
              You can always add it back from the chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteTarget) {
                  onDeleteWidget(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
