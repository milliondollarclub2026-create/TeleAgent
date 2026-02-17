import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Plug, ArrowRight, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import AiOrb from '../Orb/AiOrb';
import CategoryCard from './CategoryCard';

// Bobur's orb colors (orange/amber - matches Bitrix24)
const BOBUR_ORB_COLORS = ['#f97316', '#ea580c', '#f59e0b'];

// Step 4 progress items (staggered appearance)
const generationSteps = [
  'Analyzing selected categories',
  'Building KPI widgets',
  'Generating chart configurations',
  'Computing insights',
  'Finalizing dashboard',
];

export default function DashboardOnboarding({ api, onComplete, hasCRM, config }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=analyzing, 2=categories, 3=refinement, 4=generating
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [refinementQuestions, setRefinementQuestions] = useState([]);
  const [refinementAnswers, setRefinementAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [syncRetrying, setSyncRetrying] = useState(false);
  const [localSyncStatus, setLocalSyncStatus] = useState(null);

  // --- Step 1: Auto-start analysis ---
  const startAnalysis = useCallback(async () => {
    setStep(1);
    setLoading(true);
    const { data, error } = await api.startOnboarding();
    setLoading(false);

    if (error) {
      // Check for specific error types
      if (error.toLowerCase().includes('no active crm') ||
          error.toLowerCase().includes('not connected') ||
          error.toLowerCase().includes('no crm') ||
          error.toLowerCase().includes('connect your crm')) {
        setStep('no-crm');
        return;
      }
      if (error.toLowerCase().includes('sync') || error.toLowerCase().includes('pending')) {
        setStep('syncing');
        return;
      }
      // apiCallWithToast already shows a toast, no need for a duplicate here
      return;
    }

    if (data?.categories) {
      setCategories(data.categories);
      // Pre-select recommended
      const recommended = data.categories
        .filter(c => c.recommended && c.data_quality !== 'none')
        .map(c => c.id);
      setSelectedCategories(recommended);
      setStep(2);
    }
  }, [api]);

  useEffect(() => {
    if (hasCRM === false) {
      setStep('no-crm');
      return;
    }

    // Resume from saved onboarding state if available
    if (config?.onboarding_state === 'categories' && config?.categories) {
      setCategories(config.categories);
      const recommended = config.categories
        .filter(c => c.recommended && c.data_quality !== 'none')
        .map(c => c.id);
      setSelectedCategories(recommended);
      setStep(2);
      return;
    }
    if (config?.onboarding_state === 'refinement' && config?.categories) {
      setCategories(config.categories);
      const recommended = config.categories
        .filter(c => c.recommended && c.data_quality !== 'none')
        .map(c => c.id);
      setSelectedCategories(recommended);
      setStep(2); // Show categories so user can proceed to refinement
      return;
    }

    // Fresh start or no saved state
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // --- Sync retry (every 10s when syncing) ---
  useEffect(() => {
    if (step !== 'syncing') return;
    const interval = setInterval(async () => {
      setSyncRetrying(true);
      const { data } = await api.getSyncStatus();
      setSyncRetrying(false);
      setLocalSyncStatus(data);
      const allComplete = data?.statuses?.length > 0 && data.statuses.every(s => s.status === 'completed');
      if (allComplete || data?.status === 'complete' || data?.status === 'ready') {
        startAnalysis();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [step, api, startAnalysis]);

  // --- Step 2: Category selection ---
  const toggleCategory = (id) => {
    setSelectedCategories(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  const handleCategoriesSubmit = async () => {
    if (selectedCategories.length === 0) {
      toast.error('Select at least one category');
      return;
    }
    setLoading(true);
    const { data, error } = await api.selectCategories(selectedCategories);
    setLoading(false);

    if (error) {
      // apiCallWithToast already shows a toast, no duplicate needed
      return;
    }

    if (data?.questions && data.questions.length > 0) {
      setRefinementQuestions(data.questions);
      // Initialize answers with first option
      const initial = {};
      data.questions.forEach(q => {
        if (q.options && q.options.length > 0) {
          initial[q.id] = q.options[0].value || q.options[0];
        }
      });
      setRefinementAnswers(initial);
      setStep(3);
    } else {
      // Skip refinement, go straight to generation
      handleGenerate({});
    }
  };

  // --- Step 3: Refinement ---
  const handleRefinementSubmit = () => {
    handleGenerate(refinementAnswers);
  };

  // --- Step 4: Generate dashboard ---
  const handleGenerate = async (answers) => {
    setStep(4);
    setGenProgress(0);
    const startTime = Date.now();

    // Staggered progress animation
    let progressIdx = 0;
    const progressInterval = setInterval(() => {
      progressIdx++;
      if (progressIdx < generationSteps.length) {
        setGenProgress(progressIdx);
      }
    }, 1500);

    // API call
    const { data, error } = await api.submitRefinement(answers);
    clearInterval(progressInterval);

    if (error) {
      // apiCallWithToast already shows a toast, no duplicate needed
      setStep(2); // Go back to category selection
      return;
    }

    // Ensure minimum 3 seconds of animation before completing
    const elapsed = Date.now() - startTime;
    const minDelay = Math.max(0, 3000 - elapsed);

    // Finish progress animation — show all steps as complete
    setGenProgress(generationSteps.length - 1);

    setTimeout(() => {
      onComplete(data);
    }, minDelay);
  };

  // --- No CRM state ---
  if (step === 'no-crm') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <Plug className="w-7 h-7 text-slate-400" strokeWidth={1.75} />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Connect your CRM</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
          To build your analytics dashboard, we need access to your CRM data.
          Connect Bitrix24 or another supported CRM to get started.
        </p>
        <Button
          onClick={() => navigate('/app/connections')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plug className="w-4 h-4" strokeWidth={2} />
          Go to Connections
        </Button>
      </div>
    );
  }

  // --- Sync in progress ---
  if (step === 'syncing') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <AiOrb size={56} colors={BOBUR_ORB_COLORS} state="thinking" className="mb-6" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Syncing your CRM data</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm mb-4">
          We're pulling your latest data. This usually takes a minute or two.
        </p>
        {localSyncStatus?.statuses && (
          <div className="space-y-2 w-full max-w-sm">
            {localSyncStatus.statuses.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-slate-500">
                <span className="capitalize">{s.entity}</span>
                <span className={s.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}>
                  {s.status === 'completed' ? `${s.synced_records || 0} records` : s.status}
                </span>
              </div>
            ))}
          </div>
        )}
        {!localSyncStatus && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className={`w-2 h-2 rounded-full bg-amber-400 ${syncRetrying ? 'animate-pulse' : ''}`} />
            <span>Sync in progress...</span>
          </div>
        )}
      </div>
    );
  }

  // --- Step 1: Analyzing ---
  if (step === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <AiOrb size={64} colors={BOBUR_ORB_COLORS} state="thinking" className="mb-6" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Analyzing your CRM data</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Bobur is scanning your CRM schema and identifying what data is available
          to build your personalized dashboard.
        </p>
      </div>
    );
  }

  // --- Step 2: Category selection ---
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="flex items-center gap-3 mb-2">
          <AiOrb size={32} colors={BOBUR_ORB_COLORS} state="idle" />
          <h2 className="text-lg font-semibold text-slate-900">Choose your dashboard focus</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6 ml-11">
          Select the categories you'd like to track. We'll build widgets and insights based on your choices.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {categories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              selected={selectedCategories.includes(cat.id)}
              disabled={cat.data_quality === 'none'}
              onToggle={toggleCategory}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {selectedCategories.length} selected
          </p>
          <Button
            onClick={handleCategoriesSubmit}
            disabled={selectedCategories.length === 0 || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // --- Step 3: Refinement questions ---
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="flex items-center gap-3 mb-2">
          <AiOrb size={32} colors={BOBUR_ORB_COLORS} state="idle" />
          <h2 className="text-lg font-semibold text-slate-900">A few preferences</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6 ml-11">
          Help us tailor your dashboard with a few quick choices.
        </p>

        <div className="space-y-6 mb-8">
          {refinementQuestions.map(q => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-medium text-slate-900 mb-3">{q.question}</p>
              <div className="space-y-2">
                {(q.options || []).map((opt, oIdx) => {
                  const optValue = typeof opt === 'string' ? opt : opt.value;
                  const optLabel = typeof opt === 'string' ? opt : opt.label;
                  const isSelected = refinementAnswers[q.id] === optValue;

                  return (
                    <label
                      key={oIdx}
                      onClick={() => setRefinementAnswers(prev => ({ ...prev, [q.id]: optValue }))}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-emerald-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                      </div>
                      <span className="text-sm text-slate-700">{optLabel}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep(2)}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Back
          </button>
          <Button
            onClick={handleRefinementSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            Generate Dashboard
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Button>
        </div>
      </div>
    );
  }

  // --- Step 4: Generating ---
  if (step === 4) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <AiOrb size={64} colors={BOBUR_ORB_COLORS} state="thinking" className="mb-8" />
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Building your dashboard</h2>

        <div className="w-full max-w-xs space-y-3">
          {generationSteps.map((label, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 transition-all duration-500 ${
                idx <= genProgress ? 'opacity-100' : 'opacity-0 translate-y-2'
              }`}
            >
              {idx < genProgress ? (
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
                </div>
              ) : idx === genProgress ? (
                <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
              )}
              <span className={`text-sm ${idx <= genProgress ? 'text-slate-900' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
