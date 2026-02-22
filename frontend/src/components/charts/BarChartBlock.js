import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

export default function BarChartBlock({ chart, chartIndex = 0, interactive = false, onDrillDown }) {
  const mounted = React.useRef(false);
  React.useEffect(() => { mounted.current = true; }, []);
  const { title, data: rawData = [], orientation = 'vertical' } = chart;

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

  const barColor = CHART_COLORS[0];

  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
  }));

  const isHorizontal = orientation === 'horizontal';

  const handleClick = (entry, index) => {
    if (interactive && onDrillDown && entry) {
      onDrillDown(entry.name || entry.payload?.name, entry.value || entry.payload?.value);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={TOOLTIP_STYLE.contentStyle}>
          <p style={TOOLTIP_STYLE.labelStyle}>{payload[0].payload.name}</p>
          <p style={TOOLTIP_STYLE.itemStyle}>
            Value: <strong>{formatNumber(payload[0].value)}</strong>
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
                <XAxis type="number" {...AXIS_STYLE} tickFormatter={formatNumber} />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...AXIS_STYLE}
                  width={120}
                  tick={{ ...AXIS_STYLE.tick, textAnchor: 'end' }}
                  tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + '...' : v}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  {...AXIS_STYLE}
                  interval={0}
                  tick={chartData.length > 5
                    ? { ...AXIS_STYLE.tick, textAnchor: 'end', angle: -35 }
                    : { ...AXIS_STYLE.tick, textAnchor: 'middle' }
                  }
                  height={chartData.length > 5 ? 60 : undefined}
                />
                <YAxis {...AXIS_STYLE} tickFormatter={formatNumber} />
              </>
            )}

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

            <Bar
              dataKey="value"
              fill={barColor}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!mounted.current}
              animationDuration={CHART_CONFIG.animationDuration}
              animationEasing={CHART_CONFIG.animationEasing}
              onClick={handleClick}
              style={interactive ? { cursor: 'pointer' } : {}}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
