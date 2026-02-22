import React, { useState, useEffect, useCallback } from 'react';
import { X, BarChart3, MessageSquare, Calendar, Target } from 'lucide-react';

const TOUR_STEPS = [
  {
    target: '[data-tour="kpi-row"]',
    icon: Target,
    title: 'Your key metrics',
    description: 'Live KPIs from your CRM. These update on every refresh.',
  },
  {
    target: '[data-tour="chart-grid"]',
    icon: BarChart3,
    title: 'Interactive charts',
    description: 'Click any chart segment to drill down into the data.',
  },
  {
    target: '[data-tour="chat-panel"]',
    icon: MessageSquare,
    title: 'Ask Bobur anything',
    description: 'Natural language questions, new widgets on demand.',
  },
  {
    target: '[data-tour="top-actions"]',
    icon: Calendar,
    title: 'Date range & export',
    description: 'Filter by time period. Export as PDF or CSV.',
  },
];

const STORAGE_PREFIX = 'bobur_tour_complete_';

export default function DashboardTour({ tenantId, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const storageKey = `${STORAGE_PREFIX}${tenantId || 'default'}`;

  // Check if tour was already completed
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === 'true') {
        setDismissed(true);
        onComplete?.();
      }
    } catch {}
  }, [storageKey, onComplete]);

  // Position the highlight on the current step's target
  const updatePosition = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (dismissed) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStep, dismissed, updatePosition]);

  const finish = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {}
    onComplete?.();
  }, [storageKey, onComplete]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finish();
    }
  };

  if (dismissed) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const pad = 8;

  // Compute clip-path to cut out the target area
  const clipPath = targetRect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${targetRect.left - pad}px ${targetRect.top - pad}px,
        ${targetRect.right + pad}px ${targetRect.top - pad}px,
        ${targetRect.right + pad}px ${targetRect.bottom + pad}px,
        ${targetRect.left - pad}px ${targetRect.bottom + pad}px,
        ${targetRect.left - pad}px ${targetRect.top - pad}px
      )`
    : 'none';

  // Position popover below or above the target
  let popoverStyle = {};
  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    if (spaceBelow > 180) {
      popoverStyle = {
        top: targetRect.bottom + pad + 12,
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 320)),
      };
    } else {
      popoverStyle = {
        top: targetRect.top - pad - 180,
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 320)),
      };
    }
  } else {
    popoverStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay with cutout */}
      <div
        className="absolute inset-0 bg-black/40 transition-all duration-300"
        style={{ clipPath }}
        onClick={finish}
      />

      {/* Popover card */}
      <div
        className="absolute w-[300px] bg-white rounded-xl shadow-xl border border-slate-200 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={popoverStyle}
      >
        {/* Skip button */}
        <button
          onClick={finish}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-[11px] text-slate-400 font-medium">
            {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <button
            onClick={handleNext}
            className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            {currentStep < TOUR_STEPS.length - 1 ? 'Next' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
