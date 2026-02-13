import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  CHART_STYLES,
  CHART_CONFIG,
  CHART_COLORS,
  TOOLTIP_STYLE,
  formatNumber,
  formatPercent,
} from './chartTheme';

/**
 * Pie Chart Block - Pie or donut charts for proportions
 *
 * @param {Object} chart - Chart data
 * @param {string} chart.title - Chart title
 * @param {Array} chart.data - Array of {label, value} objects
 * @param {boolean} chart.donut - If true, renders as donut chart
 */
export default function PieChartBlock({ chart }) {
  const { title, data = [], donut = false } = chart;

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

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Prepare data for Recharts
  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    fill: CHART_COLORS[index % CHART_COLORS.length],
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={TOOLTIP_STYLE.contentStyle}>
          <p style={TOOLTIP_STYLE.labelStyle}>{data.name}</p>
          <p style={TOOLTIP_STYLE.itemStyle}>
            Value: <strong>{formatNumber(data.value)}</strong>
          </p>
          <p style={TOOLTIP_STYLE.itemStyle}>
            Share: <strong>{formatPercent(data.percentage)}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage, name }) => {
    if (percentage < 5) return null; // Don't show labels for very small slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {formatPercent(percentage)}
      </text>
    );
  };

  // Custom legend
  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-3">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-slate-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={CHART_STYLES.wrapper}>
      <div className={CHART_STYLES.innerPadding}>
        <h3 className={CHART_STYLES.title}>{title}</h3>
        <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={donut ? 60 : 0}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
              animationDuration={CHART_CONFIG.animationDuration}
              animationEasing={CHART_CONFIG.animationEasing}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
