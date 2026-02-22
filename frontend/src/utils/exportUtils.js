import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generate a branded PDF report from the dashboard element.
 */
export async function generatePDF(element, metadata = {}) {
  const { title = 'Dashboard Report', dateRange = '', timestamp = '' } = metadata;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#F5F7F6',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header
  pdf.setFontSize(18);
  pdf.setTextColor(5, 150, 105); // emerald-600
  pdf.text('Lead', margin, 20);
  const leadWidth = pdf.getTextWidth('Lead');
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.text('Relay', margin + leadWidth, 20);

  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139); // slate-500
  pdf.text(title, margin, 28);

  if (dateRange) {
    pdf.text(`Period: ${dateRange}`, margin, 34);
  }
  if (timestamp) {
    pdf.text(`Generated: ${timestamp}`, pageWidth - margin - pdf.getTextWidth(`Generated: ${timestamp}`), 34);
  }

  // Separator line
  pdf.setDrawColor(226, 232, 240); // slate-200
  pdf.line(margin, 38, pageWidth - margin, 38);

  // Dashboard image
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const startY = 42;

  // Multi-page support
  let currentY = startY;
  const availableHeight = pageHeight - margin - 10; // leave room for footer

  if (imgHeight <= availableHeight - startY) {
    pdf.addImage(imgData, 'PNG', margin, startY, imgWidth, imgHeight);
  } else {
    // Split across pages
    const sourceWidth = canvas.width;
    const sourceHeight = canvas.height;
    const pixelsPerMM = sourceWidth / imgWidth;
    let remainingSourceY = 0;
    let pageNum = 1;

    while (remainingSourceY < sourceHeight) {
      const availH = pageNum === 1 ? (availableHeight - startY) : (availableHeight - margin);
      const sliceSourceH = Math.min(availH * pixelsPerMM, sourceHeight - remainingSourceY);
      const sliceMMH = sliceSourceH / pixelsPerMM;

      // Create slice canvas
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = sourceWidth;
      sliceCanvas.height = sliceSourceH;
      const sliceCtx = sliceCanvas.getContext('2d');
      sliceCtx.drawImage(canvas, 0, remainingSourceY, sourceWidth, sliceSourceH, 0, 0, sourceWidth, sliceSourceH);

      const sliceData = sliceCanvas.toDataURL('image/png');
      const yPos = pageNum === 1 ? startY : margin;
      pdf.addImage(sliceData, 'PNG', margin, yPos, imgWidth, sliceMMH);

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      remainingSourceY += sliceSourceH;
      if (remainingSourceY < sourceHeight) {
        pdf.addPage();
        pageNum++;
      }
    }
  }

  pdf.save(`leadrelay-report-${new Date().toISOString().slice(0, 10)}.pdf`);
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
