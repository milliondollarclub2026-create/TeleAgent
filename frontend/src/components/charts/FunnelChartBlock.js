import React from 'react';
import {
  CHART_STYLES,
  CHART_CONFIG,
  formatNumber,
  formatPercent,
  getRotatedPalette,
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
  const colors = getRotatedPalette(chartIndex);

  const stages = data.map((item, index) => {
    const widthPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
    const prevValue = index > 0 ? data[index - 1].value : null;
    const conversionRate = prevValue && prevValue > 0
      ? (item.value / prevValue) * 100
      : null;

    return {
      label: item.label,
      value: item.value,
      widthPercent,
      conversionRate,
      color: colors[index % colors.length],
    };
  });

  const handleClick = (stage) => {
    if (interactive && onDrillDown) {
      onDrillDown(stage.label, stage.value);
    }
  };

  return (
    <div className={CHART_STYLES.wrapper}>
      <div className={CHART_STYLES.innerPadding}>
        <h3 className={CHART_STYLES.title}>{title}</h3>

        <div className="space-y-2 pt-2">
          {stages.map((stage, index) => (
            <div key={index} className="relative">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <div
                    className={`h-10 rounded-lg transition-all duration-700 ease-out flex items-center justify-between px-3 ${
                      interactive ? 'cursor-pointer hover:opacity-80' : ''
                    }`}
                    style={{
                      width: `${Math.max(stage.widthPercent, 20)}%`,
                      backgroundColor: stage.color,
                      opacity: 0.9,
                      animationDelay: `${index * 100}ms`,
                    }}
                    onClick={() => handleClick(stage)}
                  >
                    <span className="text-white text-sm font-medium truncate pr-2">
                      {stage.label}
                    </span>
                    <span className="text-white text-sm font-bold whitespace-nowrap">
                      {formatNumber(stage.value)}
                    </span>
                  </div>
                </div>

                {stage.conversionRate !== null && (
                  <div className="w-16 text-right">
                    <span className={`text-xs font-medium ${
                      stage.conversionRate >= 50
                        ? 'text-emerald-600'
                        : stage.conversionRate >= 25
                          ? 'text-amber-600'
                          : 'text-red-500'
                    }`}>
                      {formatPercent(stage.conversionRate)}
                    </span>
                  </div>
                )}
                {stage.conversionRate === null && (
                  <div className="w-16" />
                )}
              </div>

              {index < stages.length - 1 && (
                <div className="absolute left-0 w-full flex justify-center -bottom-1 z-10">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-200" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-4 mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-xs text-slate-500">&ge;50% conversion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-600" />
            <span className="text-xs text-slate-500">25-50%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-slate-500">&lt;25%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
