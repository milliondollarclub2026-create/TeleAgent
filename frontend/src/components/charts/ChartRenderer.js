import React from 'react';
import BarChartBlock from './BarChartBlock';
import PieChartBlock from './PieChartBlock';
import LineChartBlock from './LineChartBlock';
import FunnelChartBlock from './FunnelChartBlock';
import KPICardBlock from './KPICardBlock';

/**
 * Chart Renderer - Routes chart type to the correct component
 *
 * @param {Object} chart - Chart data object with type and data
 * @param {string} chart.type - One of: "bar", "pie", "line", "funnel", "kpi"
 */
export default function ChartRenderer({ chart }) {
  if (!chart || !chart.type) {
    console.warn('ChartRenderer: Invalid chart data', chart);
    return null;
  }

  const chartType = chart.type.toLowerCase();

  switch (chartType) {
    case 'bar':
      return <BarChartBlock chart={chart} />;

    case 'pie':
    case 'donut':
      return <PieChartBlock chart={{ ...chart, donut: chartType === 'donut' }} />;

    case 'line':
    case 'area':
      return <LineChartBlock chart={{ ...chart, area: chartType === 'area' || chart.area !== false }} />;

    case 'funnel':
      return <FunnelChartBlock chart={chart} />;

    case 'kpi':
    case 'metric':
      return <KPICardBlock chart={chart} />;

    default:
      console.warn(`ChartRenderer: Unknown chart type "${chart.type}"`);
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Unknown chart type: {chart.type}
          </p>
        </div>
      );
  }
}
