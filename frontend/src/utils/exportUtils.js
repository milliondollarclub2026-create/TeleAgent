import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generate a branded PDF report with per-widget capture and page break control.
 * @param {HTMLElement} element - The dashboard container element
 * @param {object} metadata - { title, dateRange, timestamp }
 * @param {Array} widgets - Array of widget objects with { id, chart_type, title, value, change, data }
 */
export async function generatePDF(element, metadata = {}, widgets = []) {
  const { title = 'Dashboard Report', dateRange = '', timestamp = '' } = metadata;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // ── 1. Branded header ──
  _drawHeader(pdf, margin, pageWidth, title, dateRange, timestamp);
  let currentY = 42;

  // ── 2. KPI summary row (text-drawn, not screenshot) ──
  const kpiWidgets = widgets.filter(w => ['kpi', 'metric'].includes(w.chart_type));
  if (kpiWidgets.length > 0) {
    currentY = _drawKPISummary(pdf, kpiWidgets, margin, currentY, contentWidth);
  }

  // ── 3. Per-chart capture ──
  const chartWidgets = widgets.filter(w => !['kpi', 'metric'].includes(w.chart_type));

  for (let i = 0; i < chartWidgets.length; i++) {
    const widget = chartWidgets[i];
    const widgetEl = element.querySelector(`[data-widget-id="${widget.id}"]`);
    if (!widgetEl) continue;

    try {
      const canvas = await html2canvas(widgetEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if we need a new page
      const availableHeight = pageHeight - margin - 10;
      if (currentY + imgHeight + 8 > availableHeight) {
        _drawFooter(pdf, pageWidth, pageHeight);
        pdf.addPage();
        _drawContinuationHeader(pdf, margin, pageWidth);
        currentY = 20;
      }

      // Widget title above chart
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text(widget.title || 'Chart', margin, currentY + 4);
      currentY += 8;

      pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    } catch (err) {
      console.warn(`Failed to capture widget ${widget.id}:`, err);
    }
  }

  // If no individual charts found, fall back to full dashboard screenshot
  if (chartWidgets.length === 0 && kpiWidgets.length === 0) {
    await _fallbackFullCapture(pdf, element, margin, currentY, contentWidth, pageWidth, pageHeight);
  }

  // Final footer
  _drawFooter(pdf, pageWidth, pageHeight);

  pdf.save(`LeadRelay-Dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function _drawHeader(pdf, margin, pageWidth, title, dateRange, timestamp) {
  // Brand logo text
  pdf.setFontSize(18);
  pdf.setTextColor(5, 150, 105); // emerald-600
  pdf.text('Lead', margin, 20);
  const leadWidth = pdf.getTextWidth('Lead');
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.text('Relay', margin + leadWidth, 20);

  // Subtitle
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139); // slate-500
  pdf.text(title, margin, 28);

  if (dateRange) {
    pdf.text(`Period: ${dateRange}`, margin, 34);
  }
  if (timestamp) {
    const genText = `Generated: ${timestamp}`;
    pdf.text(genText, pageWidth - margin - pdf.getTextWidth(genText), 34);
  }

  // Separator
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, 38, pageWidth - margin, 38);
}

function _drawContinuationHeader(pdf, margin, pageWidth) {
  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184);
  pdf.text('LeadRelay Dashboard Report (continued)', margin, 12);
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, 15, pageWidth - margin, 15);
}

function _drawFooter(pdf, pageWidth, pageHeight) {
  const pageCount = pdf.internal.getNumberOfPages();
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Page ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
}

function _drawKPISummary(pdf, kpis, margin, startY, contentWidth) {
  const boxCount = Math.min(kpis.length, 4);
  const gap = 4;
  const boxWidth = (contentWidth - gap * (boxCount - 1)) / boxCount;
  const boxHeight = 22;

  let y = startY + 2;

  for (let i = 0; i < boxCount; i++) {
    const kpi = kpis[i];
    const x = margin + i * (boxWidth + gap);

    // Box background
    pdf.setFillColor(245, 247, 246); // #F5F7F6
    pdf.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'F');

    // KPI title
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    const kpiTitle = (kpi.title || 'Metric').slice(0, 20);
    pdf.text(kpiTitle, x + 4, y + 7);

    // KPI value
    pdf.setFontSize(14);
    pdf.setTextColor(15, 23, 42);
    const displayValue = String(kpi.value ?? '—');
    pdf.text(displayValue, x + 4, y + 17);

    // Change indicator
    if (kpi.change) {
      const changeX = x + 4 + pdf.getTextWidth(displayValue) + 3;
      pdf.setFontSize(8);
      if (kpi.changeDirection === 'up') {
        pdf.setTextColor(5, 150, 105);
      } else if (kpi.changeDirection === 'down') {
        pdf.setTextColor(220, 38, 38);
      } else {
        pdf.setTextColor(100, 116, 139);
      }
      pdf.text(kpi.change, changeX, y + 17);
    }
  }

  return y + boxHeight + 8;
}

async function _fallbackFullCapture(pdf, element, margin, startY, contentWidth, pageWidth, pageHeight) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#F5F7F6',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight - startY - 15) {
    pdf.addImage(imgData, 'PNG', margin, startY, imgWidth, imgHeight);
  } else {
    // Multi-page split
    const sourceWidth = canvas.width;
    const sourceHeight = canvas.height;
    const pixelsPerMM = sourceWidth / imgWidth;
    let remainingSourceY = 0;
    let pageNum = 1;
    let currentY = startY;

    while (remainingSourceY < sourceHeight) {
      const availH = pageNum === 1 ? (pageHeight - 15 - startY) : (pageHeight - 15 - margin);
      const sliceSourceH = Math.min(availH * pixelsPerMM, sourceHeight - remainingSourceY);
      const sliceMMH = sliceSourceH / pixelsPerMM;

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = sourceWidth;
      sliceCanvas.height = sliceSourceH;
      const sliceCtx = sliceCanvas.getContext('2d');
      sliceCtx.drawImage(canvas, 0, remainingSourceY, sourceWidth, sliceSourceH, 0, 0, sourceWidth, sliceSourceH);

      const sliceData = sliceCanvas.toDataURL('image/png');
      const yPos = pageNum === 1 ? startY : margin;
      pdf.addImage(sliceData, 'PNG', margin, yPos, imgWidth, sliceMMH);

      remainingSourceY += sliceSourceH;
      if (remainingSourceY < sourceHeight) {
        _drawFooter(pdf, pageWidth, pageHeight);
        pdf.addPage();
        _drawContinuationHeader(pdf, margin, pageWidth);
        pageNum++;
      }
    }
  }
}

/**
 * Generate CSV from widget data and trigger download.
 */
export function generateCSV(widgets) {
  if (!widgets || widgets.length === 0) return;

  const rows = [['Widget Title', 'Chart Type', 'Label', 'Value']];

  for (const widget of widgets) {
    const chartType = widget.chart_type || 'unknown';

    if (['kpi', 'metric'].includes(chartType)) {
      rows.push([
        widget.title || 'Untitled',
        chartType,
        widget.title || '',
        String(widget.value ?? ''),
      ]);
    } else if (Array.isArray(widget.data)) {
      for (const item of widget.data) {
        rows.push([
          widget.title || 'Untitled',
          chartType,
          String(item.label || ''),
          String(item.value ?? ''),
        ]);
      }
    }
  }

  const csvContent = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leadrelay-data-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Capture dashboard as image and copy to clipboard.
 */
export async function captureChartImage(element) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#F5F7F6',
  });

  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (blob && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
    } else {
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leadrelay-dashboard-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch {
    // Fallback: download as file
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leadrelay-dashboard-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }
}
