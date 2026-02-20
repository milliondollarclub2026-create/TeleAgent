import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

function formatTimeAgo(isoString) {
  if (!isoString) return null;
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`;
  } catch {
    return null;
  }
}

function confidenceLabel(trust) {
  if (trust >= 0.7) return { label: `High (${Math.round(trust * 100)}%)`, color: 'text-emerald-700 bg-emerald-50' };
  if (trust >= 0.4) return { label: `Moderate (${Math.round(trust * 100)}%)`, color: 'text-amber-700 bg-amber-50' };
  return { label: `Low (${Math.round(trust * 100)}%)`, color: 'text-red-700 bg-red-50' };
}

function formatMetricValue(value, displayFormat, currency) {
  if (value === null || value === undefined) return '—';
  switch (displayFormat) {
    case 'currency': {
      const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : (currency || '$');
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) return String(value);
      if (num >= 1_000_000) return `${sym}${(num / 1_000_000).toFixed(1)}M`;
      if (num >= 1_000) return `${sym}${(num / 1_000).toFixed(0)}K`;
      return `${sym}${num.toFixed(0)}`;
    }
    case 'percentage':
      return typeof value === 'string' && value.includes('%') ? value : `${value}%`;
    case 'days':
      return `${value}d`;
    default:
      return String(value);
  }
}

function MetricCell({ label, value, subValue, subPositive }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide truncate">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[17px] font-semibold text-slate-900 tabular-nums">{value ?? '—'}</span>
        {subValue != null && (
          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${subPositive === true ? 'text-emerald-600' : subPositive === false ? 'text-red-500' : 'text-slate-400'}`}>
            {subPositive === true && <TrendingUp className="w-3 h-3" strokeWidth={1.75} />}
            {subPositive === false && <TrendingDown className="w-3 h-3" strokeWidth={1.75} />}
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

function SkeletonCell() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" />
      <div className="h-5 w-16 bg-slate-100 rounded animate-pulse" />
    </div>
  );
}

export default function MetricsSummaryCard({ getRevenueOverview }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await getRevenueOverview('30d');
        if (cancelled) return;
        if (result?.error || !result?.data) {
          setError(true);
        } else {
          setData(result.data);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [getRevenueOverview]);

  if (error) return null;

  const metrics = data?.metrics || {};
  const alertCount = data?.alert_count ?? 0;
  const trust = data?.overall_trust ?? 0;
  const computedAt = data?.snapshot?.computed_at;
  const currency = data?.currency || 'USD';
  const timeAgo = formatTimeAgo(computedAt);
  const conf = !loading ? confidenceLabel(trust) : null;

  // Build dynamic metric cells from the snapshot data
  // Pick up to 2 top metrics (first 2 available with values)
  const metricEntries = Object.entries(metrics)
    .filter(([, v]) => v?.value !== undefined && v?.value !== null)
    .slice(0, 2);

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 sm:gap-y-0 sm:divide-x sm:divide-slate-100">

          {/* Dynamic metrics (up to 2) */}
          {metricEntries.map(([key, val], idx) => (
            <div key={key} className={idx === 0 ? 'sm:pr-6' : 'sm:px-6'}>
              {loading ? <SkeletonCell /> : (
                <MetricCell
                  label={val.title || key.replace(/_/g, ' ')}
                  value={formatMetricValue(val.value, val.display_format, currency)}
                />
              )}
            </div>
          ))}

          {/* If no dynamic metrics, show placeholders */}
          {metricEntries.length === 0 && !loading && (
            <>
              <div className="sm:pr-6">
                <MetricCell label="Pipeline Value" value="—" />
              </div>
              <div className="sm:px-6">
                <MetricCell label="Win Rate" value="—" />
              </div>
            </>
          )}
          {metricEntries.length === 0 && loading && (
            <>
              <div className="sm:pr-6"><SkeletonCell /></div>
              <div className="sm:px-6"><SkeletonCell /></div>
            </>
          )}

          {/* Confidence */}
          <div className="sm:px-6">
            {loading ? <SkeletonCell /> : (
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Confidence</p>
                <span className={`self-start text-[12px] font-semibold px-2 py-0.5 rounded-full ${conf.color}`}>
                  {conf.label}
                </span>
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="sm:pl-6">
            {loading ? <SkeletonCell /> : (
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Alerts</p>
                {alertCount > 0 ? (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" strokeWidth={1.75} />
                    <span className="text-[15px] font-semibold text-amber-600 tabular-nums">
                      {alertCount} open
                    </span>
                  </div>
                ) : (
                  <span className="text-[15px] font-semibold text-slate-400">No alerts</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      {!loading && (
        <p className="mt-2.5 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
          Based on last 30 days
          {timeAgo && <span> · Last updated {timeAgo}</span>}
        </p>
      )}
    </div>
  );
}
