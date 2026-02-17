import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, ShieldCheck } from 'lucide-react';

const severityStyles = {
  critical: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-slate-400',
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

export default function InsightsPanel({ insights, loading }) {
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
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">No anomalies detected</p>
            <p className="text-xs text-slate-500">Your data looks healthy.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Lightbulb className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-slate-900">
            Insights
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
          </span>
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
            return (
              <div
                key={insight.title || `insight-${idx}`}
                className={`border border-slate-200 border-l-4 ${severityStyles[severity]} rounded-lg p-4`}
              >
                <h4 className="text-sm font-medium text-slate-900 mb-1">
                  {insight.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {insight.description}
                </p>
                {insight.suggested_action && (
                  <p className="text-xs text-slate-600 mt-2 font-medium">
                    Suggested: {insight.suggested_action}
                  </p>
                )}
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
