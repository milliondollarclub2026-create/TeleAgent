import React from 'react';
import { formatNumber } from '../charts/chartTheme';

export default function DataUsageBar({ usage }) {
  if (!usage || Object.keys(usage).length === 0) return null;

  // Expected format: { leads: 45000, deals: 12000, contacts: 38000, ... }
  const entries = Object.entries(usage).filter(([_, v]) => v > 0);

  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {entries.map(([entity, count]) => (
          <span key={entity} className="flex items-center gap-1">
            <span className="font-semibold text-slate-700">{formatNumber(count)}</span>
            <span className="capitalize">{entity}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
