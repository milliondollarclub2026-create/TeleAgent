/**
 * Shared chart utility functions used across dashboard components.
 */

/**
 * Check if a chart object has valid, renderable data.
 * Handles both `chart.type` and `chart.chart_type` field names.
 *
 * @param {Object} chart - Chart configuration object
 * @returns {boolean} Whether the chart has valid data to render
 */
export const chartHasValidData = (chart) => {
  if (!chart) return false;
  const type = (chart.type || chart.chart_type || '').toLowerCase();
  if (!type) return false;
  if (type === 'kpi' || type === 'metric') {
    return chart.value !== undefined && chart.value !== null;
  }
  return (
    Array.isArray(chart.data) &&
    chart.data.length > 0 &&
    chart.data.some((d) => d && d.label !== undefined && d.value !== undefined)
  );
};
