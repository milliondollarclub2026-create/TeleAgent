import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  CHART_STYLES,
  CHART_CONFIG,
  CHART_COLORS,
  TOOLTIP_STYLE,
  AXIS_STYLE,
  GRID_STYLE,
  formatNumber,
} from './chartTheme';

/**
 * Bar Chart Block - Horizontal or vertical bar charts
 *
 * @param {Object} chart - Chart data
 * @param {string} chart.title - Chart title
 * @param {Array} chart.data - Array of {label, value} objects
 * @param {string} chart.orientation - "vertical" (default) or "horizontal"
 */
export default function BarChartBlock({ chart }) {
  const { title, data: rawData = [], orientation = 'vertical' } = chart;

  // Validate and clean data
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

  // Prepare data for Recharts
  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const isHorizontal = orientation === 'horizontal';

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={TOOLTIP_STYLE.contentStyle}>
          <p style={TOOLTIP_STYLE.labelStyle}>{payload[0].payload.name}</p>
          <p style={TOOLTIP_STYLE.itemStyle}>
            Value: <strong>{formatNumber(payload[0].value)}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={CHART_STYLES.wrapper}>
      <div className={CHART_STYLES.innerPadding}>
        <h3 className={CHART_STYLES.title}>{title}</h3>
        <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
          <BarChart
            data={chartData}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
          >
            <CartesianGrid {...GRID_STYLE} horizontal={!isHorizontal} />

            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  {...AXIS_STYLE}
                  tickFormatter={formatNumber}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...AXIS_STYLE}
                  width={100}
                  tick={{ ...AXIS_STYLE.tick, textAnchor: 'end' }}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  {...AXIS_STYLE}
                  interval={0}
                  tick={{ ...AXIS_STYLE.tick, textAnchor: 'middle' }}
                />
                <YAxis
                  {...AXIS_STYLE}
                  tickFormatter={formatNumber}
                />
              </>
            )}

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              animationDuration={CHART_CONFIG.animationDuration}
              animationEasing={CHART_CONFIG.animationEasing}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
