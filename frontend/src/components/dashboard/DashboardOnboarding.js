import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Plug, ArrowRight, Check, ChevronUp, ChevronDown, AlertTriangle, Minus } from 'lucide-react';
import { toast } from 'sonner';
import AiOrb from '../Orb/AiOrb';

// Bobur's orb colors (orange/amber - matches Bitrix24)
const BOBUR_ORB_COLORS = ['#f97316', '#ea580c', '#f59e0b'];

// Step 4 progress labels
const DEFAULT_GENERATION_STEPS = [
  'Analyzing your data model',
  'Mapping goal metrics',
  'Generating chart configurations',
  'Computing baseline insights',
  'Finalizing dashboard',
];

// Trust badge styling by score
function TrustBadge({ score, available }) {
  if (!available) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400">
        No data
      </span>
    );
  }
  if (score >= 0.7) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
        {Math.round(score * 100)}% confidence
      </span>
    );
  }
  if (score >= 0.4) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
        {Math.round(score * 100)}% confidence
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
      {Math.round(score * 100)}% confidence
    </span>
  );
}

// Inline goal card
function GoalCard({ goal, selected, onToggle }) {
  const disabled = !goal.available;
  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle(goal.id)}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-slate-200 bg-white'
          : selected
          ? 'border-emerald-500 bg-emerald-50/30 cursor-pointer'
          : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Selection indicator */}
        <div
          className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            selected && !disabled
              ? 'border-emerald-600 bg-emerald-600'
              : 'border-slate-300'
          }`}
        >
          {selected && !disabled && (
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-900">{goal.name}</span>
            <TrustBadge score={goal.trust_score} available={goal.available} />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{goal.description}</p>

          {/* Model confirmation note */}
          {goal.model_note && goal.available && (
            <div className="flex items-start gap-1.5 mt-2">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[11px] text-amber-700">{goal.model_note}</p>
            </div>
          )}

          {/* Trust warning */}
          {goal.trust_warning && !goal.model_note && (
            <p className="text-[11px] text-amber-600 mt-1.5">{goal.trust_warning}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// Order question — numbered list with up/down buttons
function OrderQuestion({ options, value, onChange }) {
  const items = value && value.length > 0 ? value : options.map(o => o.value);

  const move = (idx, dir) => {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      {items.map((val, idx) => {
        const opt = options.find(o => o.value === val);
        const label = opt ? opt.label : val;
        return (
          <div
            key={val}
            className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white"
          >
            <span className="w-5 h-5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-500 flex items-center justify-center flex-shrink-0">
              {idx + 1}
            </span>
            <span className="flex-1 text-sm text-slate-700">{label}</span>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronUp className="w-3 h-3 text-slate-500" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === items.length - 1}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronDown className="w-3 h-3 text-slate-500" strokeWidth={2} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardOnboarding({ api, onComplete, hasCRM, config }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=analyzing, 2=goals, 3=refinement, 4=generating
  const [goals, setGoals] = useState([]);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [overallTrust, setOverallTrust] = useState(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [refinementQuestions, setRefinementQuestions] = useState([]);
  const [refinementAnswers, setRefinementAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [syncRetrying, setSyncRetrying] = useState(false);
  const [localSyncStatus, setLocalSyncStatus] = useState(null);
  const [syncElapsed, setSyncElapsed] = useState(0);

  // --- Step 1: Auto-start analysis ---
  const startAnalysis = useCallback(async () => {
    setStep(1);
    setLoading(true);
    const { data, error } = await api.startOnboarding();
    setLoading(false);

    if (error) {
      if (
        error.toLowerCase().includes('no active crm') ||
        error.toLowerCase().includes('not connected') ||
        error.toLowerCase().includes('no crm') ||
        error.toLowerCase().includes('connect your crm')
      ) {
        setStep('no-crm');
        return;
      }
      if (error.toLowerCase().includes('sync') || error.toLowerCase().includes('pending')) {
        // Trigger sync start in case it hasn't been started yet
        api.triggerSync().catch(() => {});
        setStep('syncing');
        return;
      }
      return;
    }

    if (data?.goals) {
      setGoals(data.goals);
      // Pre-select all available goals
      const preSelected = data.goals.filter(g => g.available).map(g => g.id);
      setSelectedGoals(preSelected);
      setOverallTrust(data.overall_trust ?? null);
      setRequiresConfirmation(data.requires_confirmation ?? false);
      setStep(2);
    }
  }, [api]);

  useEffect(() => {
    if (hasCRM === false) {
      setStep('no-crm');
      return;
    }

    // Resume from saved onboarding state if available
    const savedGoals = config?.crm_profile?.goals;
    if (
      (config?.onboarding_state === 'categories' || config?.onboarding_state === 'refinement') &&
      savedGoals
    ) {
      setGoals(savedGoals);
      const preSelected = savedGoals.filter(g => g.available).map(g => g.id);
      // If user had already made a selection, restore it
      const saved = config?.selected_categories;
      setSelectedGoals(saved && saved.length > 0 ? saved : preSelected);
      setOverallTrust(config?.crm_profile?.overall_trust ?? null);
      setStep(2);
      return;
    }

    // Fresh start
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // --- Elapsed timer for sync screen ---
  useEffect(() => {
    if (step !== 'syncing') return;
    setSyncElapsed(0);
    const timer = setInterval(() => setSyncElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [step]);

  // --- Sync polling (immediate + every 4s when syncing) ---
  useEffect(() => {
    if (step !== 'syncing') return;
    let cancelled = false;

    const fetchStatus = async () => {
      setSyncRetrying(true);
      const { data } = await api.getSyncStatus();
      if (cancelled) return;
      setSyncRetrying(false);
      setLocalSyncStatus(data);
      // Deals must be complete (backend gates on deals for revenue model)
      const dealsComplete = data?.statuses?.some(
        s => s.entity === 'deals' && s.status === 'complete'
      );
      const allComplete =
        data?.statuses?.length > 0 && data.statuses.every(s => s.status === 'complete');
      if (dealsComplete || allComplete) {
        // Show brief success state before starting analysis
        setStep('sync-complete');
        setTimeout(() => {
          if (!cancelled) startAnalysis();
        }, 2000);
      }
    };

    // Fetch immediately on entering syncing state
    fetchStatus();

    const interval = setInterval(fetchStatus, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [step, api, startAnalysis]);

  // --- Step 2: Goal selection ---
  const toggleGoal = (id) => {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleGoalsSubmit = async () => {
    if (selectedGoals.length === 0) {
      toast.error('Select at least one goal');
      return;
    }
    setLoading(true);
    const { data, error } = await api.selectCategories(selectedGoals);
    setLoading(false);

    if (error) return;

    if (data?.questions && data.questions.length > 0) {
      setRefinementQuestions(data.questions);
      // Initialize answers per question type
      const initial = {};
      data.questions.forEach(q => {
        const type = q.type || 'radio';
        if (type === 'multiselect') {
          initial[q.id] = Array.isArray(q.default) ? q.default : [];
        } else if (type === 'order') {
          initial[q.id] = Array.isArray(q.default) ? q.default : (q.options || []).map(o => o.value);
        } else {
          // radio — pick default or first option
          initial[q.id] = q.default || (q.options?.[0]?.value ?? q.options?.[0]);
        }
      });
      setRefinementAnswers(initial);
      setStep(3);
    } else {
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

    let progressIdx = 0;
    const progressInterval = setInterval(() => {
      progressIdx++;
      if (progressIdx < DEFAULT_GENERATION_STEPS.length) {
        setGenProgress(progressIdx);
      }
    }, 1500);

    const { data, error } = await api.submitRefinement(answers);
    clearInterval(progressInterval);

    if (error) {
      setStep(2);
      return;
    }

    const elapsed = Date.now() - startTime;
    const minDelay = Math.max(0, 3000 - elapsed);
    setGenProgress(DEFAULT_GENERATION_STEPS.length - 1);

    setTimeout(() => {
      onComplete(data);
    }, minDelay);
  };

  // ─── No CRM ───────────────────────────────────────────────────────────────
  if (step === 'no-crm') {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
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

  // ─── Syncing ──────────────────────────────────────────────────────────────
  if (step === 'syncing') {
    const ALL_ENTITIES = ['leads', 'deals', 'contacts', 'companies', 'activities'];
    const statusMap = {};
    (localSyncStatus?.statuses || []).forEach(s => { statusMap[s.entity] = s; });

    const completedCount = ALL_ENTITIES.filter(e => statusMap[e]?.status === 'complete').length;

    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <AiOrb size={56} colors={BOBUR_ORB_COLORS} state="thinking" className="mb-6" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Syncing your CRM data</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm mb-5">
          Pulling records from your CRM — speed depends on your dataset size.
        </p>

        <div className="w-full max-w-sm space-y-2.5 mb-5">
          {ALL_ENTITIES.map(entity => {
            const s = statusMap[entity];
            const status = s?.status;
            const records = s?.synced_records || 0;

            if (status === 'complete') {
              return (
                <div key={entity} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
                    </div>
                    <span className="capitalize text-slate-700">{entity}</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium tabular-nums">
                    {records.toLocaleString()} record{records !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            }

            if (status === 'syncing') {
              return (
                <div key={entity} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                    <span className="capitalize text-slate-700">{entity}</span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {records.toLocaleString()} records synced...
                  </span>
                </div>
              );
            }

            if (status === 'error') {
              return (
                <div key={entity} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
                    </div>
                    <span className="capitalize text-slate-700">{entity}</span>
                  </div>
                  <span className="text-xs text-red-500 truncate max-w-[140px]">
                    {s?.error_message || 'Error'}
                  </span>
                </div>
              );
            }

            // Pending / not started
            return (
              <div key={entity} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <Minus className="w-3.5 h-3.5 text-slate-300" strokeWidth={2} />
                  </div>
                  <span className="capitalize text-slate-400">{entity}</span>
                </div>
                <span className="text-xs text-slate-400">Waiting</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400">
          {completedCount} of {ALL_ENTITIES.length} entities complete
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="tabular-nums">{syncElapsed}s elapsed</span>
        </p>
      </div>
    );
  }

  // ─── Sync Complete (brief success state) ─────────────────────────────────
  if (step === 'sync-complete') {
    const totalRecords = (localSyncStatus?.statuses || []).reduce(
      (sum, s) => sum + (s.synced_records || 0), 0
    );
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-5 animate-in zoom-in duration-300">
          <Check className="w-7 h-7 text-emerald-600" strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Sync complete</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          {totalRecords.toLocaleString()} records synced from your CRM.
          Starting analysis...
        </p>
      </div>
    );
  }

  // ─── Step 1: Analyzing ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <AiOrb size={64} colors={BOBUR_ORB_COLORS} state="thinking" className="mb-6" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Analyzing your data</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Bobur is mapping your CRM stages, metrics, and pipeline structure to find
          the best analytics goals for your business.
        </p>
      </div>
    );
  }

  // ─── Step 2: Goal selection ───────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="flex items-center gap-3 mb-2">
          <AiOrb size={32} colors={BOBUR_ORB_COLORS} state="idle" />
          <h2 className="text-lg font-semibold text-slate-900">Choose your goals</h2>
        </div>
        <p className="text-sm text-slate-500 mb-1 ml-11">
          Select what you want to track. Bobur will build metrics and charts for each goal.
        </p>
        {overallTrust !== null && (
          <p className="text-xs text-slate-400 mb-6 ml-11">
            Overall data confidence:{' '}
            <span
              className={
                overallTrust >= 0.7
                  ? 'text-emerald-600 font-medium'
                  : overallTrust >= 0.4
                  ? 'text-amber-600 font-medium'
                  : 'text-red-600 font-medium'
              }
            >
              {Math.round(overallTrust * 100)}%
            </span>
          </p>
        )}
        {!overallTrust && <div className="mb-6" />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              selected={selectedGoals.includes(goal.id)}
              onToggle={toggleGoal}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''} selected
          </p>
          <Button
            onClick={handleGoalsSubmit}
            disabled={selectedGoals.length === 0 || loading}
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

  // ─── Step 3: Refinement questions ─────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="flex items-center gap-3 mb-2">
          <AiOrb size={32} colors={BOBUR_ORB_COLORS} state="idle" />
          <h2 className="text-lg font-semibold text-slate-900">A few quick clarifications</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6 ml-11">
          Help Bobur understand your pipeline so your metrics are accurate.
        </p>

        <div className="space-y-5 mb-8">
          {refinementQuestions.map(q => {
            const type = q.type || 'radio';

            return (
              <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-sm font-medium text-slate-900 mb-1">{q.question}</p>
                {q.description && (
                  <p className="text-xs text-slate-400 mb-3">{q.description}</p>
                )}
                {!q.description && <div className="mb-3" />}

                {/* Radio */}
                {type === 'radio' && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oIdx) => {
                      const optValue = typeof opt === 'string' ? opt : opt.value;
                      const optLabel = typeof opt === 'string' ? opt : opt.label;
                      const isSelected = refinementAnswers[q.id] === optValue;
                      return (
                        <label
                          key={oIdx}
                          onClick={() =>
                            setRefinementAnswers(prev => ({ ...prev, [q.id]: optValue }))
                          }
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/30'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-emerald-600' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-emerald-600" />
                            )}
                          </div>
                          <span className="text-sm text-slate-700">{optLabel}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Multiselect */}
                {type === 'multiselect' && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oIdx) => {
                      const optValue = typeof opt === 'string' ? opt : opt.value;
                      const optLabel = typeof opt === 'string' ? opt : opt.label;
                      const current = Array.isArray(refinementAnswers[q.id])
                        ? refinementAnswers[q.id]
                        : [];
                      const isChecked = current.includes(optValue);
                      return (
                        <label
                          key={oIdx}
                          onClick={() => {
                            const next = isChecked
                              ? current.filter(v => v !== optValue)
                              : [...current, optValue];
                            setRefinementAnswers(prev => ({ ...prev, [q.id]: next }));
                          }}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-50/30'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isChecked ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                            }`}
                          >
                            {isChecked && (
                              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                            )}
                          </div>
                          <span className="text-sm text-slate-700">{optLabel}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Order */}
                {type === 'order' && (
                  <OrderQuestion
                    options={q.options || []}
                    value={refinementAnswers[q.id]}
                    onChange={ordered =>
                      setRefinementAnswers(prev => ({ ...prev, [q.id]: ordered }))
                    }
                  />
                )}
              </div>
            );
          })}
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

  // ─── Step 4: Generating ───────────────────────────────────────────────────
  if (step === 4) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <AiOrb size={64} colors={BOBUR_ORB_COLORS} state="thinking" className="mb-8" />
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Building your dashboard</h2>

        <div className="w-full max-w-xs space-y-3">
          {DEFAULT_GENERATION_STEPS.map((label, idx) => (
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
