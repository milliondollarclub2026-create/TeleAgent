import React from 'react';
import { Check } from 'lucide-react';

const qualityColors = {
  good: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  none: 'bg-slate-100 text-slate-500',
};

const qualityLabels = {
  good: 'Rich data',
  partial: 'Partial data',
  none: 'No data',
};

export default function CategoryCard({
  category,
  selected,
  disabled,
  onToggle,
}) {
  const quality = category.data_quality || 'none';
  const isDisabled = disabled || quality === 'none';

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onToggle(category.id)}
      disabled={isDisabled}
      className={`
        relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-emerald-500 bg-emerald-50/30 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Category name */}
      <h3 className="text-sm font-semibold text-slate-900 mb-1 pr-6">
        {category.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">
        {category.description}
      </p>

      {/* Bottom row: quality badge + recommended */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${qualityColors[quality]}`}>
          {qualityLabels[quality]}
        </span>
        {category.recommended && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
            Recommended
          </span>
        )}
      </div>
    </button>
  );
}
