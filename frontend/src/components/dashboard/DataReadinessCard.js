import React from 'react';
import { Check, Lock, Database } from 'lucide-react';

export default function DataReadinessCard({ readiness, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 bg-slate-100 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!readiness || readiness.overall_score >= 100) return null;

  const { overall_score, unlocks = [] } = readiness;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-slate-900">Data Readiness</h3>
        </div>
        <span className="text-xs font-medium text-slate-500">{overall_score}% complete</span>
      </div>

      {/* Overall progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-5">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${overall_score}%` }}
        />
      </div>

      {/* Feature checklist */}
      <div className="space-y-3">
        {unlocks.map((item) => (
          <div key={item.feature} className="flex items-start gap-3">
            {/* Status icon */}
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              item.status === 'unlocked'
                ? 'bg-emerald-100'
                : 'bg-slate-100'
            }`}>
              {item.status === 'unlocked' ? (
                <Check className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
              ) : (
                <Lock className="w-2.5 h-2.5 text-slate-400" strokeWidth={2} />
              )}
            </div>

            {/* Feature info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-medium ${
                  item.status === 'unlocked' ? 'text-slate-900' : 'text-slate-600'
                }`}>
                  {item.feature}
                </span>
                {item.status === 'unlocked' && (
                  <span className="text-[11px] font-medium text-emerald-600">Ready</span>
                )}
              </div>

              {item.status === 'locked' && (
                <>
                  <p className="text-xs text-slate-400 mt-0.5">{item.needs}</p>
                  {/* Mini progress bar */}
                  {item.progress > 0 && (
                    <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
        Sync more CRM data to unlock advanced analytics
      </p>
    </div>
  );
}
