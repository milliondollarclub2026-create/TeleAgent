import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Pencil, Maximize2, Minimize2, Square } from 'lucide-react';

const SIZE_OPTIONS = [
  { value: 'small', label: 'S', icon: Minimize2 },
  { value: 'medium', label: 'M', icon: Square },
  { value: 'large', label: 'L', icon: Maximize2 },
];

export default function SortableWidgetItem({
  id,
  widget,
  children,
  editMode,
  onDelete,
  onModify,
  onResize,
  isKPI,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const currentSize = widget.size || 'medium';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${editMode ? 'ring-1 ring-dashed ring-slate-300 rounded-xl' : ''}`}
      data-widget-id={widget.id}
    >
      {children}

      {/* Edit mode controls */}
      {editMode && (
        <>
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 w-6 h-6 rounded-md bg-white/90 border border-slate-200 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-colors z-10"
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
          </div>

          {/* Top right controls */}
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            {/* Size selector (non-KPI only) */}
            {!isKPI && onResize && (
              <div className="flex items-center bg-white/90 border border-slate-200 rounded-md overflow-hidden">
                {SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onResize(widget.id, opt.value)}
                    className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold transition-colors ${
                      currentSize === opt.value
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                    title={`${opt.value} size`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Modify */}
            {!isKPI && onModify && (
              <button
                onClick={() => onModify(widget)}
                className="w-6 h-6 rounded-md bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-gray-100 hover:border-slate-300 transition-colors"
                title="Modify widget"
              >
                <Pencil className="w-3 h-3 text-slate-400" strokeWidth={2} />
              </button>
            )}

            {/* Delete */}
            {onDelete && (
              <button
                onClick={() => onDelete(widget)}
                className="w-6 h-6 rounded-md bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-gray-100 hover:border-slate-300 transition-colors"
                title="Remove widget"
              >
                <X className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
              </button>
            )}
          </div>
        </>
      )}

      {/* View mode hover controls */}
      {!editMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isKPI && onModify && (
            <button
              onClick={() => onModify(widget)}
              className="w-6 h-6 rounded-md bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-gray-100 hover:border-slate-300 transition-colors"
              title="Modify widget"
            >
              <Pencil className="w-3 h-3 text-slate-400" strokeWidth={2} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(widget)}
              className="w-6 h-6 rounded-md bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-gray-100 hover:border-slate-300 transition-colors"
              title="Remove widget"
            >
              <X className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
