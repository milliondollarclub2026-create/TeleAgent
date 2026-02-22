import React from 'react';
import { TrendingUp, Zap, Clock } from 'lucide-react';

const effortConfig = {
  low: { label: 'Low effort', color: 'bg-gray-100 text-slate-500' },
  medium: { label: 'Medium effort', color: 'bg-gray-100 text-slate-500' },
  high: { label: 'High effort', color: 'bg-gray-100 text-slate-500' },
};

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-slate-200 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="flex gap-2 mt-2">
            <div className="h-5 bg-slate-100 rounded-full w-20" />
            <div className="h-5 bg-slate-100 rounded-full w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OpportunitiesRow({ opportunities, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return null;
  }

  const displayed = opportunities.slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {displayed.map((opp, idx) => {
        const effort = effortConfig[opp.effort_level] || effortConfig.medium;

        return (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  {opp.title}
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {opp.finding}
                </p>
                {opp.action && (
                  <p className="text-xs text-slate-600 font-medium mt-2">
                    {opp.action}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {opp.estimated_impact && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full px-2 py-0.5">
                      <Zap className="w-3 h-3" strokeWidth={2} />
                      {opp.estimated_impact}
                    </span>
                  )}
                  {opp.effort_level && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${effort.color}`}>
                      <Clock className="w-3 h-3" strokeWidth={2} />
                      {effort.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
