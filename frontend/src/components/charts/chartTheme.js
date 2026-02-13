// Locked chart styling constants - AI picks chart type, styling is fixed
// Follows Emerald Graphite theme for premium consistency

export const CHART_COLORS = [
  '#059669', // emerald-600 (primary)
  '#0891b2', // cyan-600
  '#d97706', // amber-600
  '#dc2626', // red-600
  '#7c3aed', // violet-600
  '#0d9488', // teal-600
  '#2563eb', // blue-600
  '#c026d3', // fuchsia-600
];

export const CHART_CONFIG = {
  height: 280,
  mobileHeight: 220,
  animationDuration: 800,
  animationEasing: 'ease-out',
};

export const CHART_STYLES = {
  wrapper: 'bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden',
  innerPadding: 'p-4',
  title: 'text-sm font-semibold text-slate-900 mb-3',
  noData: 'flex items-center justify-center h-48 text-sm text-slate-400',
};

// Tooltip styling for Recharts
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    padding: '8px 12px',
    fontSize: '13px',
  },
  labelStyle: {
    color: '#1e293b',
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemStyle: {
    color: '#64748b',
    padding: '2px 0',
  },
};

// Axis styling
export const AXIS_STYLE = {
  tick: {
    fill: '#64748b',
    fontSize: 12,
  },
  line: {
    stroke: '#e2e8f0',
  },
  axisLine: false,
  tickLine: false,
};

// Grid styling
export const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: '#e2e8f0',
  vertical: false,
};

// Legend styling
export const LEGEND_STYLE = {
  wrapperStyle: {
    paddingTop: '12px',
  },
  iconType: 'circle',
  iconSize: 8,
};

// KPI specific styling
export const KPI_STYLES = {
  positive: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    icon: '↑',
  },
  negative: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    icon: '↓',
  },
  neutral: {
    text: 'text-slate-500',
    bg: 'bg-slate-50',
    icon: '→',
  },
};

// Get color by index (cycles through palette)
export const getChartColor = (index) => {
  return CHART_COLORS[index % CHART_COLORS.length];
};

// Format large numbers for display
export const formatNumber = (value) => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
};

// Format percentage
export const formatPercent = (value) => {
  return `${value.toFixed(1)}%`;
};
