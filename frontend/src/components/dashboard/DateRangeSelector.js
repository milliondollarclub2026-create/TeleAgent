import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, startOfYear } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';

const PRESETS = [
  { label: 'Today', getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Last 7 days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'This Month', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Last Month', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'This Quarter', getValue: () => ({ from: startOfQuarter(new Date()), to: new Date() }) },
  { label: 'Year to Date', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

const DATE_RANGE_STORAGE_KEY = 'leadrelay-date-range';

function getStoredRange() {
  try {
    const stored = localStorage.getItem(DATE_RANGE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        from: new Date(parsed.from),
        to: new Date(parsed.to),
        label: parsed.label,
      };
    }
  } catch {}
  return null;
}

function storeRange(range) {
  try {
    localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      label: range.label,
    }));
  } catch {}
}

export function getDefaultDateRange() {
  const stored = getStoredRange();
  if (stored) return stored;
  return { from: subDays(new Date(), 30), to: new Date(), label: 'Last 30 days' };
}

export function dateRangeToParams(range) {
  if (!range?.from || !range?.to) return {};
  return {
    from_date: format(range.from, 'yyyy-MM-dd'),
    to_date: format(range.to, 'yyyy-MM-dd'),
  };
}

export default function DateRangeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const handlePreset = (preset) => {
    const range = { ...preset.getValue(), label: preset.label };
    storeRange(range);
    onChange(range);
    setOpen(false);
    setCustomMode(false);
  };

  const handleCustomSelect = (range) => {
    if (range?.from && range?.to) {
      const newRange = {
        from: range.from,
        to: range.to,
        label: `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`,
      };
      storeRange(newRange);
      onChange(newRange);
    }
  };

  const displayLabel = value?.label || 'Last 30 days';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">
          <CalendarDays className="w-3.5 h-3.5" strokeWidth={2} />
          {displayLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0" sideOffset={4}>
        <div className="flex">
          {/* Presets */}
          <div className="border-r border-slate-100 p-2 space-y-0.5 min-w-[140px]">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                  value?.label === preset.label
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <div className="border-t border-slate-100 my-1.5" />
            <button
              onClick={() => setCustomMode(!customMode)}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                customMode ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Calendar (custom mode) */}
          {customMode && (
            <div className="p-2">
              <Calendar
                mode="range"
                selected={{ from: value?.from, to: value?.to }}
                onSelect={handleCustomSelect}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
                className="text-xs"
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
