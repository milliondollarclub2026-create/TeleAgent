import React, { useState, useCallback } from 'react';
import { LayoutGrid, GripVertical, Pencil } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import ChartRenderer from '../charts/ChartRenderer';
import SortableWidgetItem from './SortableWidgetItem';
import { chartHasValidData } from '../../utils/chartUtils';

// Skeleton loaders
function KPISkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-16 bg-slate-200 rounded mb-2" />
      <div className="h-2.5 w-24 bg-slate-100 rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="h-3.5 w-32 bg-slate-200 rounded mb-4" />
      <div className="h-48 bg-slate-100 rounded-lg" />
    </div>
  );
}

// Map widget size to grid column span
function sizeToSpan(size) {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'large': return 'col-span-1 sm:col-span-2';
    case 'medium':
    default: return 'col-span-1';
  }
}

export default function DashboardGrid({
  widgets,
  loading,
  onDeleteWidget,
  onModifyWidget,
  onDrillDown,
  onReorderWidgets,
  onResizeWidget,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [localWidgets, setLocalWidgets] = useState(null);

  // Use local widget order when in edit mode, otherwise use prop
  const displayWidgets = localWidgets || widgets;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalWidgets(prev => {
      const items = prev || widgets;
      const activeWidget = items.find(w => w.id === active.id);
      const overWidget = items.find(w => w.id === over.id);
      if (!activeWidget || !overWidget) return items;

      // Prevent cross-category drag (KPI ↔ chart)
      const activeIsKPI = ['kpi', 'metric'].includes(activeWidget.chart_type?.toLowerCase());
      const overIsKPI = ['kpi', 'metric'].includes(overWidget.chart_type?.toLowerCase());
      if (activeIsKPI !== overIsKPI) return items;

      const oldIndex = items.findIndex(w => w.id === active.id);
      const newIndex = items.findIndex(w => w.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      const reordered = arrayMove(items, oldIndex, newIndex);

      // Persist in background
      if (onReorderWidgets) {
        onReorderWidgets(reordered.map(w => w.id));
      }

      return reordered;
    });
  }, [widgets, onReorderWidgets]);

  const toggleEditMode = useCallback(() => {
    if (editMode) {
      // Exiting edit mode — sync local to parent
      setLocalWidgets(null);
    } else {
      // Entering edit mode — snapshot
      setLocalWidgets([...widgets]);
    }
    setEditMode(!editMode);
  }, [editMode, widgets]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!displayWidgets || displayWidgets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <LayoutGrid className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
        </div>
        <h3 className="font-medium text-slate-900 mb-1">No widgets yet</h3>
        <p className="text-sm text-slate-500">
          Ask Bobur in the chat panel for charts, then add them to your dashboard.
        </p>
      </div>
    );
  }

  const validWidgets = displayWidgets.filter(chartHasValidData);

  // Deduplicate KPIs by title — keep the first occurrence
  const kpisRaw = validWidgets.filter(w => ['kpi', 'metric'].includes(w.chart_type?.toLowerCase()));
  const seenTitles = new Set();
  const kpis = kpisRaw.filter(w => {
    const key = (w.title || '').toLowerCase();
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  const charts = validWidgets.filter(w => !['kpi', 'metric'].includes(w.chart_type?.toLowerCase()));

  const toChart = (widget) => ({
    type: widget.chart_type,
    title: widget.title,
    data: widget.data,
    value: widget.value,
    change: widget.change,
    changeDirection: widget.changeDirection,
    sparkline_data: widget.sparkline_data,
    previous_value: widget.previous_value,
    goal_value: widget.goal_value,
  });

  const isKPI = (widget) => ['kpi', 'metric'].includes(widget.chart_type?.toLowerCase());

  const handleDeleteRequest = (widget) => setDeleteTarget(widget);

  const handleDrillDownClick = (chartTitle) => (label, value) => {
    if (onDrillDown) {
      onDrillDown({ label, value, chartTitle });
    }
  };

  return (
    <>
      {/* Edit Layout toggle */}
      {validWidgets.length > 1 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              editMode
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            {editMode ? (
              <>
                <GripVertical className="w-3.5 h-3.5" strokeWidth={2} />
                Done Editing
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                Edit Layout
              </>
            )}
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {/* KPIs */}
          {kpis.length > 0 && (
            <SortableContext items={kpis.map(w => w.id)} strategy={rectSortingStrategy}>
              <div className={`grid gap-3 ${
                kpis.length === 1 ? 'grid-cols-1 max-w-xs' :
                kpis.length === 2 ? 'grid-cols-2' :
                kpis.length === 3 ? 'grid-cols-3' :
                'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              }`}>
                {kpis.map((widget, idx) => (
                  <SortableWidgetItem
                    key={widget.id}
                    id={widget.id}
                    widget={widget}
                    editMode={editMode}
                    isKPI
                    onDelete={handleDeleteRequest}
                    onModify={onModifyWidget}
                  >
                    <ChartRenderer chart={toChart(widget)} chartIndex={idx} interactive={false} />
                  </SortableWidgetItem>
                ))}
              </div>
            </SortableContext>
          )}

          {/* Charts */}
          {charts.length > 0 && (
            <SortableContext items={charts.map(w => w.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {charts.map((widget, idx) => (
                  <div key={widget.id} className={sizeToSpan(widget.size)}>
                    <SortableWidgetItem
                      id={widget.id}
                      widget={widget}
                      editMode={editMode}
                      isKPI={false}
                      onDelete={handleDeleteRequest}
                      onModify={onModifyWidget}
                      onResize={onResizeWidget}
                    >
                      <ChartRenderer
                        chart={toChart(widget)}
                        chartIndex={kpis.length + idx}
                        interactive
                        onDrillDown={handleDrillDownClick(widget.title)}
                      />
                    </SortableWidgetItem>
                  </div>
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </DndContext>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Remove this widget?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm">
              This will remove "{deleteTarget?.title || 'this widget'}" from your dashboard.
              You can always add it back from the chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteTarget) {
                  onDeleteWidget(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
