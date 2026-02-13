import React from 'react';
import { CHART_STYLES, KPI_STYLES, formatNumber } from './chartTheme';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * KPI Card Block - Single metric highlight with trend indicator
 *
 * @param {Object} chart - Chart data
 * @param {string} chart.title - KPI title
 * @param {number|string} chart.value - Main metric value
 * @param {string} chart.change - Change percentage (e.g., "+12%", "-5%")
 * @param {string} chart.changeDirection - "up", "down", or "neutral"
 */
export default function KPICardBlock({ chart }) {
  const { title, value, change, changeDirection = 'neutral' } = chart;

  // Determine styling based on direction
  const getChangeStyle = () => {
    if (changeDirection === 'up') return KPI_STYLES.positive;
    if (changeDirection === 'down') return KPI_STYLES.negative;
    return KPI_STYLES.neutral;
  };

  const changeStyle = getChangeStyle();

  // Format value if it's a number
  const displayValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div className={CHART_STYLES.wrapper}>
      <div className="p-5">
        {/* Title */}
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>

        {/* Main Value */}
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold text-slate-900 tracking-tight">
            {displayValue}
          </span>

          {/* Change Indicator */}
          {change && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${changeStyle.bg} ${changeStyle.text}`}>
              {changeDirection === 'up' && <TrendingUp className="w-3 h-3" strokeWidth={2.5} />}
              {changeDirection === 'down' && <TrendingDown className="w-3 h-3" strokeWidth={2.5} />}
              {changeDirection === 'neutral' && <Minus className="w-3 h-3" strokeWidth={2.5} />}
              <span>{change}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
