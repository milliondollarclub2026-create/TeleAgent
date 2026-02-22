import React from 'react';
import {
  CHART_STYLES,
  CHART_COLORS,
  HIGHLIGHT_COLOR,
  formatNumber,
} from './chartTheme';

export default function FunnelChartBlock({ chart, chartIndex = 0, interactive = false, onDrillDown }) {
  const { title, data: rawData = [] } = chart;

  const data = (rawData || [])
    .filter(d => d && d.label !== undefined)
    .map(d => ({
      label: d.label || 'Unknown',
      value: Number(d.value) || 0,
    }));

  if (!data || data.length === 0) {
    return (
      <div className={CHART_STYLES.wrapper}>
        <div className={CHART_STYLES.innerPadding}>
          <h3 className={CHART_STYLES.title}>{title}</h3>
          <div className={CHART_STYLES.noData}>No data available</div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const endToEnd = firstValue > 0 ? ((lastValue / firstValue) * 100).toFixed(1) : 0;

  const stages = data.map((item, index) => {
    const prevValue = index > 0 ? data[index - 1].value : null;
    const convRate = prevValue && prevValue > 0 ? (item.value / prevValue) * 100 : null;
    const dropOff = prevValue && prevValue > 0 ? ((prevValue - item.value) / prevValue) * 100 : null;
    const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

    return {
      label: item.label,
      value: item.value,
      convRate,
      dropOff,
      barWidth,
    };
  });

  const handleClick = (stage) => {
    if (interactive && onDrillDown) {
      onDrillDown(stage.label, stage.value);
    }
  };

  const getConvColor = (rate) => {
    if (rate >= 50) return 'text-emerald-600';
    if (rate >= 25) return 'text-amber-600';
    return 'text-red-500';
  };

  const getDropColor = (rate) => {
    if (rate <= 20) return 'text-slate-500';
    if (rate <= 50) return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className={CHART_STYLES.wrapper}>
      <div className={CHART_STYLES.innerPadding}>
        <h3 className={CHART_STYLES.title}>{title}</h3>

        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_80px] gap-1 mb-2 px-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Stage</span>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider text-right">Count</span>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider text-right">Conv %</span>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider text-right">Drop-off</span>
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {stages.map((stage, index) => (
            <div
              key={index}
              className={`grid grid-cols-[1fr_80px_80px_80px] gap-1 items-center px-1 py-2 rounded-lg transition-colors ${
                interactive ? 'cursor-pointer hover:bg-slate-50' : ''
              }`}
              onClick={() => handleClick(stage)}
            >
              {/* Stage name + proportional bar */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate mb-1">{stage.label}</p>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(stage.barWidth, 3)}%`,
                      backgroundColor: index === 0 ? HIGHLIGHT_COLOR : CHART_COLORS[0],
                      opacity: index === 0 ? 1 : Math.max(1.0 - index * 0.12, 0.4),
                    }}
                  />
                </div>
              </div>

              {/* Count */}
              <span className="text-sm font-semibold text-slate-900 text-right tabular-nums">
                {formatNumber(stage.value)}
              </span>

              {/* Conv % */}
              <span className={`text-sm font-medium text-right tabular-nums ${
                stage.convRate !== null ? getConvColor(stage.convRate) : 'text-slate-300'
              }`}>
                {stage.convRate !== null ? `${stage.convRate.toFixed(1)}%` : '—'}
              </span>

              {/* Drop-off */}
              <span className={`text-sm font-medium text-right tabular-nums ${
                stage.dropOff !== null ? getDropColor(stage.dropOff) : 'text-slate-300'
              }`}>
                {stage.dropOff !== null ? `${stage.dropOff.toFixed(1)}%` : '—'}
              </span>
            </div>
          ))}
        </div>

        {/* Summary footer */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between px-1">
          <span className="text-xs text-slate-500">
            Overall: {formatNumber(firstValue)} → {formatNumber(lastValue)} ({endToEnd}% end-to-end)
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="text-[11px] text-slate-400">&ge;50%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-600" />
              <span className="text-[11px] text-slate-400">25-50%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[11px] text-slate-400">&lt;25%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
