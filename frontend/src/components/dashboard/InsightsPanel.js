import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, ShieldCheck, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const severityConfig = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50/60',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    textColor: 'text-red-700',
    actionColor: 'text-red-800',
    Icon: AlertCircle,
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/60',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    textColor: 'text-amber-700',
    actionColor: 'text-amber-800',
    Icon: AlertTriangle,
  },
  info: {
    border: 'border-l-blue-400',
    bg: 'bg-blue-50/50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-slate-900',
    textColor: 'text-slate-600',
    actionColor: 'text-blue-700',
    Icon: Info,
  },
};

function InsightSkeleton() {
  return (
    <div className="bg-white border border-slate-200 border-l-4 border-l-slate-200 rounded-lg p-4 animate-pulse">
      <div className="h-3.5 w-40 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-full bg-slate-100 rounded mb-1" />
      <div className="h-3 w-3/4 bg-slate-100 rounded" />
    </div>
  );
}

export default function InsightsPanel({ insights, loading, onDismissAlert }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_LIMIT = 5;

  // Auto-expand when urgent insights arrive
  useEffect(() => {
    if (insights?.some(i => i.severity === 'warning' || i.severity === 'critical')) {
      setExpanded(true);
    }
  }, [insights]);

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
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-500" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">All clear</p>
            <p className="text-xs text-slate-500">No anomalies detected — your data looks healthy.</p>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const warningCount = insights.filter(i => i.severity === 'warning').length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-slate-900">
            Insights
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-[10px] font-semibold text-red-700">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700">
                {warningCount} warning
              </span>
            )}
            {criticalCount === 0 && warningCount === 0 && (
              <span className="text-xs text-slate-400 font-medium">
                {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" strokeWidth={2} />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={2} />
        )}
      </button>

      {/* Insight cards */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          {(showAll ? insights : insights.slice(0, INITIAL_LIMIT)).map((insight, idx) => {
            const severity = insight.severity || 'info';
            const config = severityConfig[severity] || severityConfig.info;
            const SeverityIcon = config.Icon;

            return (
              <div
                key={insight.id || insight.title || `insight-${idx}`}
                className={`border border-slate-200/80 border-l-4 ${config.border} ${config.bg} rounded-lg p-4`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-md ${config.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <SeverityIcon className={`w-3.5 h-3.5 ${config.iconColor}`} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium ${config.titleColor} mb-0.5`}>
                      {insight.title}
                    </h4>
                    <p className={`text-xs ${config.textColor} leading-relaxed`}>
                      {insight.description}
                    </p>
                    {insight.suggested_action && (
                      <p className={`text-xs ${config.actionColor} mt-2 font-medium`}>
                        Suggested: {insight.suggested_action}
                      </p>
                    )}
                  </div>
                  {insight.dismissible && onDismissAlert && (
                    <button
                      onClick={() => onDismissAlert(insight.id)}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200/60 transition-colors ml-1"
                      title="Dismiss alert"
                    >
                      <X className="w-3 h-3 text-slate-400" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {insights.length > INITIAL_LIMIT && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-slate-500 hover:text-emerald-600 transition-colors mt-2"
            >
              {showAll ? 'Show less' : `Show all ${insights.length} insights`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
