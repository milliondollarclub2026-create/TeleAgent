import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, X } from 'lucide-react';

const severityConfig = {
  critical: {
    border: 'border-l-red-500',
    dot: 'bg-red-500',
  },
  warning: {
    border: 'border-l-amber-400',
    dot: 'bg-amber-400',
  },
  info: {
    border: 'border-l-slate-300',
    dot: 'bg-slate-300',
  },
  opportunity: {
    border: 'border-l-emerald-400',
    dot: 'bg-emerald-400',
  },
};

function InsightSkeleton() {
  return (
    <div className="bg-white border border-slate-100 border-l-2 border-l-slate-200 rounded-lg p-4 animate-pulse">
      <div className="h-3.5 w-40 bg-slate-100 rounded mb-2" />
      <div className="h-3 w-full bg-slate-50 rounded mb-1" />
      <div className="h-3 w-3/4 bg-slate-50 rounded" />
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
      <div className="space-y-2">
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
          <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
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
  const totalCount = insights.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-slate-900">
            Insights
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {totalCount}
          </span>
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {warningCount} warning
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" strokeWidth={2} />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={2} />
        )}
      </button>

      {/* Insight cards */}
      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          {(showAll ? insights : insights.slice(0, INITIAL_LIMIT)).map((insight, idx) => {
            const severity = insight.severity || 'info';
            const config = severityConfig[severity] || severityConfig.info;

            return (
              <div
                key={insight.id || insight.title || `insight-${idx}`}
                className={`bg-white border border-slate-100 border-l-2 ${config.border} rounded-lg p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0`} />
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {insight.title}
                      </h4>
                    </div>
                    <p className="text-[13px] text-slate-600 leading-relaxed pl-4">
                      {insight.description}
                    </p>
                    {insight.suggested_action && (
                      <p className="text-[13px] text-slate-500 mt-1.5 pl-4">
                        → {insight.suggested_action}
                      </p>
                    )}
                  </div>
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
              </div>
            );
          })}
          {insights.length > INITIAL_LIMIT && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-slate-500 hover:text-emerald-600 transition-colors mt-1"
            >
              {showAll ? 'Show less' : `Show all ${insights.length} insights`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
