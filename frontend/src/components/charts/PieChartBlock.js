import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Sector,
} from 'recharts';
import {
  CHART_STYLES,
  CHART_CONFIG,
  TOOLTIP_STYLE,
  formatNumber,
  formatPercent,
  getRotatedPalette,
} from './chartTheme';

// Active shape for hover expansion when interactive
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      />
    </g>
  );
};

export default function PieChartBlock({ chart, chartIndex = 0, interactive = false, onDrillDown }) {
  const { title, data: rawData = [], donut = false } = chart;
  const [activeIndex, setActiveIndex] = React.useState(null);

  const data = (rawData || [])
    .filter(d => d && d.label !== undefined)
    .map(d => ({
      label: d.label || 'Unknown',
      value: Number(d.value) || 0,
    }))
    .filter(d => d.value > 0);

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

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = getRotatedPalette(chartIndex);

  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    fill: colors[index % colors.length],
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));

  const handleClick = (entry, index) => {
    if (interactive && onDrillDown) {
      onDrillDown(entry.name, entry.value);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div style={TOOLTIP_STYLE.contentStyle}>
          <p style={TOOLTIP_STYLE.labelStyle}>{entry.name}</p>
          <p style={TOOLTIP_STYLE.itemStyle}>
            Value: <strong>{formatNumber(entry.value)}</strong>
          </p>
          <p style={TOOLTIP_STYLE.itemStyle}>
            Share: <strong>{formatPercent(entry.percentage)}</strong>
          </p>
          {interactive && (
            <p style={{ ...TOOLTIP_STYLE.itemStyle, fontSize: '11px', color: '#059669', marginTop: '4px' }}>
              Click to explore
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
    if (percentage < 5) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
        {formatPercent(percentage)}
      </text>
    );
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-3">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
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
              label={activeIndex === null ? renderCustomLabel : undefined}
              animationDuration={CHART_CONFIG.animationDuration}
              animationEasing={CHART_CONFIG.animationEasing}
              onClick={handleClick}
              onMouseEnter={(_, index) => interactive && setActiveIndex(index)}
              onMouseLeave={() => interactive && setActiveIndex(null)}
              activeIndex={interactive ? activeIndex : undefined}
              activeShape={interactive ? renderActiveShape : undefined}
              style={interactive ? { cursor: 'pointer' } : {}}
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
