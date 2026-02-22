import React from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

function formatCell(value, key) {
  if (value === null || value === undefined) return '—';

  // Boolean
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  // Date detection
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return value; }
  }

  // Currency-like fields
  if (typeof value === 'number' && (key === 'value' || key === 'amount' || key === 'revenue')) {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
  }

  // Other numbers
  if (typeof value === 'number') return value.toLocaleString();

  return String(value);
}

function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-8 bg-slate-100 rounded w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-6 bg-slate-50 rounded w-full" />
      ))}
    </div>
  );
}

export default function DrilldownModal({ open, onClose, drilldownData, loading, onAskBobur }) {
  const { records = [], columns = [], title = '', total_count = 0 } = drilldownData || {};

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900 pr-8">
            {title || 'Records'}
            {total_count > 0 && (
              <span className="text-sm font-normal text-slate-500 ml-2">({total_count})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 mt-2">
          {loading ? (
            <TableSkeleton />
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-500">No records found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 last:border-0 even:bg-slate-50 hover:bg-slate-100/50 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {formatCell(record[col.key], col.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
          <div className="text-xs text-slate-400">
            {records.length > 0 && total_count > records.length && (
              <>Showing {records.length} of {total_count}</>
            )}
          </div>
          {onAskBobur && (
            <button
              onClick={onAskBobur}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
              Ask Bobur
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
