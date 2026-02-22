import React, { useState } from 'react';
import { Download, FileText, Table, Image, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';
import { generatePDF, generateCSV, captureChartImage } from '../../utils/exportUtils';

export default function ExportMenu({ dashboardRef, widgets, dateRange }) {
  const [exporting, setExporting] = useState(null); // 'pdf' | 'csv' | 'image' | null

  const handleExportPDF = async () => {
    if (!dashboardRef?.current) return;
    setExporting('pdf');
    toast.loading('Generating PDF...', { id: 'export-pdf' });
    try {
      await generatePDF(dashboardRef.current, {
        title: 'LeadRelay Dashboard Report',
        dateRange: dateRange?.label || 'Last 30 days',
        timestamp: new Date().toLocaleString(),
      }, widgets || []);
      toast.success('PDF downloaded', { id: 'export-pdf' });
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF export failed', { id: 'export-pdf' });
    } finally {
      setExporting(null);
    }
  };

  const handleExportCSV = () => {
    setExporting('csv');
    try {
      generateCSV(widgets);
      toast.success('CSV downloaded');
    } catch (err) {
      console.error('CSV export failed:', err);
      toast.error('CSV export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleCaptureImage = async () => {
    if (!dashboardRef?.current) return;
    setExporting('image');
    try {
      await captureChartImage(dashboardRef.current);
      toast.success('Image copied to clipboard');
    } catch (err) {
      console.error('Image capture failed:', err);
      toast.error('Image capture failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
          disabled={!!exporting}
        >
          {exporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <Download className="w-3.5 h-3.5" strokeWidth={2} />
          )}
          Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportPDF} disabled={!!exporting}>
          <FileText className="w-4 h-4 mr-2 text-slate-500" strokeWidth={1.75} />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV} disabled={!!exporting}>
          <Table className="w-4 h-4 mr-2 text-slate-500" strokeWidth={1.75} />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCaptureImage} disabled={!!exporting}>
          <Image className="w-4 h-4 mr-2 text-slate-500" strokeWidth={1.75} />
          Copy as Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
