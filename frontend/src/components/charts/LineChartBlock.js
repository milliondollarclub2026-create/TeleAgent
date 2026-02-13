import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
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
 * Line Chart Block - Line or area trend charts
 *
 * @param {Object} chart - Chart data
 * @param {string} chart.title - Chart title
 * @param {Array} chart.data - Array of {label, value} objects
 * @param {boolean} chart.area - If true, renders as area chart with gradient fill
 */
export default function LineChartBlock({ chart }) {
  const { title, data: rawData = [], area = true } = chart;

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
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
  }));

  const primaryColor = CHART_COLORS[0];

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={TOOLTIP_STYLE.contentStyle}>
          <p style={TOOLTIP_STYLE.labelStyle}>{label}</p>
          <p style={TOOLTIP_STYLE.itemStyle}>
            Value: <strong>{formatNumber(payload[0].value)}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Gradient ID for area fill
  const gradientId = `gradient-${title?.replace(/\s+/g, '-').toLowerCase() || 'line'}`;

  if (area) {
    return (
      <div className={CHART_STYLES.wrapper}>
        <div className={CHART_STYLES.innerPadding}>
          <h3 className={CHART_STYLES.title}>{title}</h3>
          <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                dataKey="name"
                {...AXIS_STYLE}
                interval="preserveStartEnd"
              />
              <YAxis
                {...AXIS_STYLE}
                tickFormatter={formatNumber}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={primaryColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                animationDuration={CHART_CONFIG.animationDuration}
                animationEasing={CHART_CONFIG.animationEasing}
                dot={{ fill: primaryColor, strokeWidth: 0, r: 3 }}
                activeDot={{ fill: primaryColor, strokeWidth: 2, stroke: '#fff', r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className={CHART_STYLES.wrapper}>
      <div className={CHART_STYLES.innerPadding}>
        <h3 className={CHART_STYLES.title}>{title}</h3>
        <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
          >
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="name"
              {...AXIS_STYLE}
              interval="preserveStartEnd"
            />
            <YAxis
              {...AXIS_STYLE}
              tickFormatter={formatNumber}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={primaryColor}
              strokeWidth={2}
              animationDuration={CHART_CONFIG.animationDuration}
              animationEasing={CHART_CONFIG.animationEasing}
              dot={{ fill: primaryColor, strokeWidth: 0, r: 3 }}
              activeDot={{ fill: primaryColor, strokeWidth: 2, stroke: '#fff', r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
