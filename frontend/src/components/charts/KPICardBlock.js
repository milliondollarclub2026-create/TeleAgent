import React, { useId } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { CHART_STYLES, KPI_STYLES, formatNumber } from './chartTheme';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * KPI Card Block - Enhanced with sparklines, goals, and period comparison
 */
export default function KPICardBlock({ chart }) {
  const uniqueId = useId();
  const {
    title = 'Metric',
    value,
    change,
    changeDirection = 'neutral',
    sparkline_data,
    previous_value,
    goal_value,
  } = chart || {};

  const getChangeStyle = () => {
    if (changeDirection === 'up') return KPI_STYLES.positive;
    if (changeDirection === 'down') return KPI_STYLES.negative;
    return KPI_STYLES.neutral;
  };

  const changeStyle = getChangeStyle();

  const displayValue = value === null || value === undefined
    ? '0'
    : typeof value === 'number'
      ? formatNumber(value)
      : String(value);

  // Goal progress
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const goalProgress = goal_value && goal_value > 0 ? Math.min((numericValue / goal_value) * 100, 100) : null;

  // Sparkline data
  const sparkData = sparkline_data?.length > 1
    ? sparkline_data.map((v, i) => ({ v: typeof v === 'number' ? v : (v?.value || 0) }))
    : null;

  // Determine sparkline color from change direction
  const sparkColor = changeDirection === 'up' ? '#059669' : changeDirection === 'down' ? '#dc2626' : '#94a3b8';

  return (
    <div className={CHART_STYLES.wrapper}>
      <div className="p-5">
        {/* Title */}
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>

        {/* Main Value + Change */}
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold text-slate-900 tracking-tight">
            {displayValue}
          </span>

          {change && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${changeStyle.bg} ${changeStyle.text}`}>
              {changeDirection === 'up' && <TrendingUp className="w-3 h-3" strokeWidth={2.5} />}
              {changeDirection === 'down' && <TrendingDown className="w-3 h-3" strokeWidth={2.5} />}
              {changeDirection === 'neutral' && <Minus className="w-3 h-3" strokeWidth={2.5} />}
              <span>{change}</span>
            </div>
          )}
        </div>

        {/* Period comparison */}
        {previous_value !== null && previous_value !== undefined && (
          <p className="text-[11px] text-slate-400 mt-1">
            vs {formatNumber(previous_value)} prev period
          </p>
        )}

        {/* Goal progress bar */}
        {goalProgress !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-400">Goal</span>
              <span className="text-[10px] font-medium text-slate-500">
                {formatNumber(numericValue)} / {formatNumber(goal_value)}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${goalProgress}%`,
                  backgroundColor: goalProgress >= 100 ? '#16a34a' : goalProgress >= 75 ? '#059669' : goalProgress >= 50 ? '#d97706' : '#dc2626',
                }}
              />
            </div>
          </div>
        )}

        {/* Sparkline */}
        {sparkData && (
          <div className="mt-2 -mx-1">
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`spark-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sparkColor} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  fill={`url(#spark-${uniqueId})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
