// Locked chart styling constants - AI picks chart type, styling is fixed
// Follows Emerald Graphite theme for premium consistency

// Modern, clean color palette - distinct colors for visual clarity
export const CHART_COLORS = [
  '#059669', // emerald-600 — brand primary, always first
  '#4f46e5', // indigo-600 — rich, professional
  '#0891b2', // cyan-600 — clean, distinct from emerald
  '#7c3aed', // violet-600 — premium accent
  '#d97706', // amber-600 — warm contrast
  '#475569', // slate-600 — neutral anchor
  '#0d9488', // teal-600 — nature tones
  '#c026d3', // fuchsia-600 — rare accent
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

// Interactive chart styling
export const INTERACTIVE_STYLES = {
  cursor: 'pointer',
  hoverOpacity: 0.8,
  activeHighlight: 'rgba(5, 150, 105, 0.15)',
  drillHint: { fontSize: '11px', color: '#059669' },
};

// Sparkline styling for KPI cards
export const SPARKLINE_STYLES = {
  width: 120,
  height: 40,
  strokeWidth: 1.5,
  gradientOpacity: { start: 0.15, end: 0 },
};

// Goal progress bar styling
export const GOAL_STYLES = {
  height: '6px',
  borderRadius: '9999px',
  thresholds: {
    excellent: { min: 100, color: '#16a34a' },
    good: { min: 75, color: '#059669' },
    warning: { min: 50, color: '#d97706' },
    danger: { min: 0, color: '#dc2626' },
  },
};

// Get color by index (cycles through palette)
export const getChartColor = (index) => {
  return CHART_COLORS[index % CHART_COLORS.length];
};

// Get color with offset for variety between adjacent charts
// chartIndex is used to rotate the palette start position
export const getChartColorWithOffset = (dataIndex, chartIndex = 0) => {
  const offset = (chartIndex * 3) % CHART_COLORS.length; // Offset by 3 for visual variety
  return CHART_COLORS[(dataIndex + offset) % CHART_COLORS.length];
};

// Generate a rotated color array for a specific chart
export const getRotatedPalette = (chartIndex = 0) => {
  const offset = (chartIndex * 3) % CHART_COLORS.length;
  return [...CHART_COLORS.slice(offset), ...CHART_COLORS.slice(0, offset)];
};

// Format large numbers for display (handles null/undefined)
export const formatNumber = (value) => {
  if (value === null || value === undefined) {
    return '0';
  }
  const num = Number(value);
  if (isNaN(num)) {
    return '0';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

// Format percentage (handles null/undefined)
export const formatPercent = (value) => {
  if (value === null || value === undefined) {
    return '0%';
  }
  const num = Number(value);
  if (isNaN(num)) {
    return '0%';
  }
  return `${num.toFixed(1)}%`;
};
