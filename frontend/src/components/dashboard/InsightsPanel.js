import React from 'react';
import { AlertTriangle, AlertCircle, Lightbulb, Info, ArrowRight, ShieldCheck, X } from 'lucide-react';

const severityConfig = {
  critical: {
    border: 'border-l-4 border-l-amber-400',
    bg: 'bg-white',
    Icon: AlertTriangle,
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  warning: {
    border: 'border-l-4 border-l-amber-400',
    bg: 'bg-white',
    Icon: AlertCircle,
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  opportunity: {
    border: 'border-l-4 border-l-slate-300',
    bg: 'bg-white',
    Icon: Lightbulb,
    iconColor: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-600',
  },
  info: {
    border: 'border-l-4 border-l-slate-300',
    bg: 'bg-white',
    Icon: Info,
    iconColor: 'text-slate-400',
    badge: 'bg-slate-100 text-slate-600',
  },
};

function InsightSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 border-l-4 border-l-slate-200 bg-white p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded bg-slate-100 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-4 w-48 bg-slate-100 rounded mb-2" />
          <div className="h-3 w-full bg-slate-50 rounded mb-1" />
          <div className="h-3 w-3/4 bg-slate-50 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function InsightsPanel({ insights, loading, onDismissAlert }) {
  if (loading) {
    return (
      <div className="space-y-3">
        <InsightSkeleton />
        <InsightSkeleton />
      </div>
    );
  }

  // Empty state
  if (!insights || insights.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-medium text-slate-900">All clear</p>
            <p className="text-xs text-slate-500">No issues detected. Your data looks healthy.</p>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const warningCount = insights.filter(i => i.severity === 'warning').length;

  return (
    <div>
      {/* Header with severity badges */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-base font-semibold text-slate-900">Insights</h3>
        {criticalCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
            {criticalCount} critical
          </span>
        )}
        {warningCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
            {warningCount} warning
          </span>
        )}
      </div>

      {/* Insight cards — 2-col grid when >2 insights */}
      <div className={`grid gap-3 ${insights.length > 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {insights.map((insight, idx) => {
          const severity = insight.severity || 'info';
          const config = severityConfig[severity] || severityConfig.info;
          const { Icon } = config;

          return (
            <div
              key={insight.id || insight.title || `insight-${idx}`}
              className={`rounded-lg border border-slate-200 ${config.border} ${config.bg} p-4`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-[15px] font-semibold text-slate-900">{insight.title}</h4>
                    {insight.dismissible && onDismissAlert && (
                      <button
                        onClick={() => onDismissAlert(insight.id)}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3 h-3 text-slate-400" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1">{insight.description}</p>
                  {insight.suggested_action && (
                    <p className="text-[13px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                      {insight.suggested_action}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
