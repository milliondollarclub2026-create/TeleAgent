import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, Loader2, Plus, User, Trash2, Pencil, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AiOrb from '../Orb/AiOrb';
import ChartRenderer from '../charts/ChartRenderer';
import { chartHasValidData } from '../../utils/chartUtils';

// Bobur's orb colors (orange/amber - matches Bitrix24)
const BOBUR_ORB_COLORS = ['#f97316', '#ea580c', '#f59e0b'];

const DEFAULT_INTRO = "Hi! I'm Bobur, your Analytics Team Lead. Ask me anything about your CRM data, and I can analyze leads, visualize pipelines, or build charts for your dashboard.";

const DEFAULT_SUGGESTIONS = [
  { text: "Show me a conversion chart" },
  { text: "Analyze lead trends" },
  { text: "Visualize sales pipeline" },
  { text: "Top performing products" },
];

const thinkingMessages = [
  "Thinking",
  "Connecting to CRM",
  "Fetching your data",
  "Analyzing leads",
  "Reviewing pipelines",
  "Processing metrics",
  "Examining patterns",
  "Gathering insights",
  "Calculating trends",
  "Crunching numbers",
  "Cross-referencing data",
  "Building visualizations",
  "Preparing charts",
  "Connecting the dots",
  "Summarizing findings",
  "Finalizing response",
  "Almost there",
];

// Markdown components (reused from CRMChatPage)
const markdownComponents = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 border border-slate-100 rounded-lg">
      <table className="min-w-full text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-slate-500 border-b border-slate-100">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 border-b border-slate-50 text-slate-700">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-slate-50/50 transition-colors">{children}</tr>
  ),
  h1: ({ children }) => <h1 className="text-xl font-bold text-slate-900 mt-6 mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold text-slate-900 mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">{children}</h3>,
  ul: ({ children }) => <ul className="my-3 space-y-2">{children}</ul>,
  ol: ({ children, start }) => <ol className="my-3 space-y-2" start={start}>{children}</ol>,
  li: ({ children }) => (
    <li className="text-slate-700 flex items-start gap-2">
      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  code: ({ inline, children }) => (
    inline ? (
      <code className="px-1.5 py-0.5 bg-slate-100 rounded text-[13px] font-mono">{children}</code>
    ) : (
      <pre className="my-3 p-4 bg-slate-100 rounded-lg overflow-x-auto">
        <code className="text-[13px] font-mono">{children}</code>
      </pre>
    )
  ),
};

export default function DashboardChat({ api, onAddWidget, modifyingWidget, onReplaceWidget, onCancelModify }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState(DEFAULT_SUGGESTIONS);
  const [introMessage, setIntroMessage] = useState(DEFAULT_INTRO);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom with secondary scroll for async chart rendering
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      // Immediate scroll attempt
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
      // Secondary scroll after charts render (Recharts typically needs ~300ms)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
      }, 400);
    }
  }, []);

  // Load chat suggestions from API on mount
  useEffect(() => {
    if (!api.getChatSuggestions) return;
    const loadSuggestions = async () => {
      try {
        const { data } = await api.getChatSuggestions();
        if (data?.suggestions?.length > 0) {
          setSuggestedActions(data.suggestions);
        }
        if (data?.intro_message) {
          setIntroMessage(data.intro_message);
        }
      } catch {
        // Keep defaults on failure
      }
    };
    loadSuggestions();
  }, [api]);

  // Load server-persisted chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      const { data, error } = await api.getChatHistory(50, 0);
      setHistoryLoading(false);

      if (error) {
        toast.error('Failed to load chat history');
      }

      if (data?.messages?.length > 0) {
        const normalized = data.messages.map(m => ({
          ...m,
          text: m.content || m.text,
          content: m.content || m.text,
        }));
        setMessages(normalized);
        setHasMore(data.has_more || false);
      } else {
        // No history — show intro
        setMessages([{ id: 'intro', role: 'assistant', text: introMessage, isIntro: true }]);
      }
    };
    loadHistory();
  }, [api, introMessage]);

  // Load older messages (pagination)
  const loadOlderMessages = async () => {
    setLoadingMore(true);
    const { data, error } = await api.getChatHistory(50, messages.filter(m => !m.isIntro).length);
    setLoadingMore(false);
    if (data?.messages?.length > 0) {
      const normalized = data.messages.map(m => ({
        ...m,
        text: m.content || m.text,
        content: m.content || m.text,
      }));
      setMessages(prev => [...normalized.reverse(), ...prev]);
      setHasMore(data.has_more || false);
    } else {
      setHasMore(false);
    }
  };

  // Auto-scroll on messages/loading change
  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom('smooth'), 100);
    return () => clearTimeout(timer);
  }, [messages, loading, scrollToBottom]);

  // Instant scroll for user messages
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1]?.role === 'user') {
      scrollToBottom('instant');
    }
  }, [messages, scrollToBottom]);

  // Cycle thinking messages
  useEffect(() => {
    if (!loading) {
      setThinkingIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingIndex(prev => (prev + 1) % thinkingMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  // Send message
  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = { id: Date.now(), role: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = '56px';
    }
    setLoading(true);

    // Build conversation history (exclude meta and error messages)
    const history = messages
      .filter(m => !m.isIntro && !m.isError)
      .map(m => ({ role: m.role, content: m.text || m.content }));

    const { data, error } = await api.sendChatMessage(messageText, history);

    if (error) {
      toast.error(error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        text: 'Something went wrong. Please try again.',
        isError: true,
      }]);
    } else if (data) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        text: data.reply || '',
        charts: data.charts || [],
      }]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-inject context message when modify mode starts
  useEffect(() => {
    if (modifyingWidget) {
      const chartType = modifyingWidget.chart_type || 'chart';
      const title = modifyingWidget.title || 'widget';
      const contextMsg = {
        id: `modify-ctx-${Date.now()}`,
        role: 'assistant',
        text: `I'm ready to modify your **${title}** (${chartType} chart). What changes would you like? For example: "make this a bar chart", "change to last 30 days", or "show by source instead".`,
        isModifyContext: true,
      };
      setMessages(prev => [...prev, contextMsg]);
    }
  }, [modifyingWidget]);

  // Replace widget handler (wraps onReplaceWidget with chart data)
  const handleReplaceOnDashboard = async (chart) => {
    if (onReplaceWidget) {
      const chartType = chart.type || chart.chart_type || 'bar';
      const { error } = await onReplaceWidget({
        title: chart.title || modifyingWidget?.title || 'Chart',
        chart_type: chartType,
        data_source: chart.data_source || modifyingWidget?.data_source || 'crm_leads',
        crm_source: chart.crm_source || 'bitrix24',
        x_field: chart.x_field || null,
        y_field: chart.y_field || 'count',
        aggregation: chart.aggregation || 'count',
        filter_field: chart.filter_field || null,
        filter_value: chart.filter_value || null,
        time_range_days: chart.time_range_days || null,
        sort_order: chart.sort_order || 'desc',
        item_limit: chart.item_limit || 10,
        size: ['line', 'funnel'].includes(chartType) ? 'large' : 'medium',
      });
      return { error };
    }
    return { error: null };
  };

  // Clear chat history
  const handleClearChat = async () => {
    const { error } = await api.clearChatHistory();
    if (!error) {
      setMessages([{ id: 'intro', role: 'assistant', text: introMessage, isIntro: true }]);
      setHasMore(false);
      toast.success('Chat cleared');
    }
  };

  // Add chart to dashboard
  const handleAddToDashboard = async (chart) => {
    if (onAddWidget) {
      const chartType = chart.type || chart.chart_type || 'bar';
      const { error } = await onAddWidget({
        title: chart.title || 'Chart',
        chart_type: chartType,
        data_source: chart.data_source || 'crm_leads',
        crm_source: chart.crm_source || 'bitrix24',
        x_field: chart.x_field || null,
        y_field: chart.y_field || 'count',
        aggregation: chart.aggregation || 'count',
        filter_field: chart.filter_field || null,
        filter_value: chart.filter_value || null,
        time_range_days: chart.time_range_days || null,
        sort_order: chart.sort_order || 'desc',
        item_limit: chart.item_limit || 10,
        size: ['line', 'funnel'].includes(chartType) ? 'large' : 'medium',
      });
      if (!error) {
        toast.success('Added to dashboard');
      }
      return { error };
    }
    return { error: null };
  };

  // --- History loading skeleton ---
  if (historyLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`animate-pulse flex items-start gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
                  <div className={`space-y-2 ${i % 2 === 0 ? 'max-w-[70%]' : 'max-w-[60%]'}`}>
                    <div className="h-3 bg-slate-200 rounded w-48" />
                    <div className="h-3 bg-slate-100 rounded w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Modify mode banner */}
      {modifyingWidget && (
        <div className="flex-shrink-0 px-4 py-2.5 bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Pencil className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
              <span className="text-emerald-800 font-medium">
                Modifying: {modifyingWidget.title}
              </span>
              <span className="text-emerald-600 text-xs">({modifyingWidget.chart_type})</span>
            </div>
            <button
              onClick={onCancelModify}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {hasMore && (
            <div className="flex justify-center py-2">
              <button
                onClick={loadOlderMessages}
                disabled={loadingMore}
                className="text-xs text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-1.5"
              >
                {loadingMore ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : null}
                {loadingMore ? 'Loading...' : 'Load older messages'}
              </button>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="flex items-center gap-3 max-w-[75%] sm:max-w-[75%] md:max-w-[85%] flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center shadow-md">
                    <User className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div className="px-4 py-3 bg-slate-900 rounded-2xl rounded-br-md text-[15px] text-white shadow-lg shadow-slate-900/20">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div className={`flex items-start gap-3 max-w-[90%] ${msg.isError ? 'text-red-600' : ''}`}>
                  <AiOrb
                    size={32}
                    colors={BOBUR_ORB_COLORS}
                    state="idle"
                    className="flex-shrink-0 -mt-0.5"
                  />
                  <div className="flex-1 space-y-4">
                    {/* Text */}
                    {msg.text && (
                      <div className="text-[15px] text-slate-700 leading-relaxed crm-chat-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    {/* Charts */}
                    {msg.charts && msg.charts.length > 0 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {(() => {
                          const validCharts = msg.charts.filter(chartHasValidData);
                          if (validCharts.length === 0) return null;

                          const dealTables = validCharts.filter(c => ['deal_table', 'record_table'].includes(c.type?.toLowerCase()));
                          const kpis = validCharts.filter(c => ['kpi', 'metric'].includes(c.type?.toLowerCase()));
                          const smallCharts = validCharts.filter(c => ['pie', 'donut', 'bar'].includes(c.type?.toLowerCase()));
                          const wideCharts = validCharts.filter(c => ['line', 'area', 'funnel'].includes(c.type?.toLowerCase()));

                          return (
                            <>
                              {dealTables.length > 0 && (
                                <div className="space-y-3">
                                  {dealTables.map((chart, i) => (
                                    <RecordTable key={`deal-${i}`} chart={chart} />
                                  ))}
                                </div>
                              )}
                              {kpis.length > 0 && (
                                <div className={`grid gap-3 ${kpis.length === 1 ? 'grid-cols-1 max-w-xs' : kpis.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                  {kpis.map((chart, i) => (
                                    <div key={`kpi-${i}`}>
                                      <ChartRenderer chart={chart} chartIndex={i} />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {smallCharts.length > 0 && (
                                <div className={`grid gap-4 ${smallCharts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                                  {smallCharts.map((chart, i) => (
                                    <div key={`small-${i}`}>
                                      <ChartRenderer chart={chart} chartIndex={kpis.length + i} />
                                      <AddToDashboardBtn chart={chart} onAdd={modifyingWidget ? handleReplaceOnDashboard : handleAddToDashboard} isReplace={!!modifyingWidget} />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {wideCharts.length > 0 && (
                                <div className="space-y-4">
                                  {wideCharts.map((chart, i) => (
                                    <div key={`wide-${i}`}>
                                      <ChartRenderer chart={chart} chartIndex={kpis.length + smallCharts.length + i} />
                                      <AddToDashboardBtn chart={chart} onAdd={modifyingWidget ? handleReplaceOnDashboard : handleAddToDashboard} isReplace={!!modifyingWidget} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="flex items-center gap-4 px-1 py-2">
                <AiOrb size={32} colors={BOBUR_ORB_COLORS} state="thinking" className="flex-shrink-0" />
                <span className="text-[13px] text-slate-500 font-medium flex items-center gap-0.5">
                  <span className="transition-opacity duration-300">{thinkingMessages[thinkingIndex]}</span>
                  <span className="inline-flex ml-0.5">
                    <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                    <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce ml-0.5" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
                    <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce ml-0.5" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Suggested actions after intro */}
          {messages.length === 1 && messages[0]?.isIntro && !loading && (
            <div className="flex flex-wrap gap-2.5 pt-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
              {suggestedActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.text)}
                  className="group px-4 py-2.5 bg-white border border-slate-200 rounded-full text-[13px] text-slate-600 font-medium transition-colors duration-150 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50"
                  style={{ animationDelay: `${300 + i * 75}ms` }}
                >
                  {action.text}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 pb-3 pt-4">
        <div className="max-w-4xl mx-auto">
          {/* Clear chat — only show when there are real messages */}
          {messages.some(m => !m.isIntro) && (
            <div className="flex justify-end mb-1.5">
              <button
                onClick={handleClearChat}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                Clear chat
              </button>
            </div>
          )}
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-slate-300 focus-within:shadow-md transition-all duration-200">
            <textarea
              ref={inputRef}
              aria-label="Type a message"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                requestAnimationFrame(() => {
                  const textarea = e.target;
                  if (textarea) {
                    textarea.style.height = '56px';
                    const scrollHeight = textarea.scrollHeight;
                    const newHeight = Math.min(Math.max(scrollHeight, 56), 160);
                    textarea.style.height = newHeight + 'px';
                    textarea.style.overflowY = scrollHeight > 160 ? 'auto' : 'hidden';
                  }
                });
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full pl-5 pr-14 text-[15px] text-slate-900 placeholder-slate-400 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 overflow-hidden flex items-center"
              style={{ height: '56px', maxHeight: '160px', paddingTop: '16px', paddingBottom: '16px', lineHeight: '24px' }}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-colors shadow-sm"
            >
              <ArrowUp className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Record table renderer for deal_query / record_query results
// Supports dynamic columns via chart.columns, falls back to hardcoded deal columns
function RecordTable({ chart }) {
  const { deals = [], title, truncated, crm_source, columns } = chart;

  // Default deal columns (backward compat)
  const defaultColumns = [
    { key: 'title', label: 'Deal' },
    { key: 'stage', label: 'Stage' },
    { key: 'value', label: 'Value', format: 'currency' },
    { key: 'assigned_to', label: 'Owner' },
    { key: 'days_in_stage', label: 'Days in Stage', format: 'days_highlight' },
  ];
  const cols = columns?.length > 0 ? columns : defaultColumns;

  const formatValue = (val) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'string') return val;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val}`;
  };

  const formatCell = (val, format) => {
    if (format === 'currency') return formatValue(val);
    if (format === 'days_highlight') {
      if (val === null || val === undefined) return '—';
      return (
        <span className={`font-medium ${val > 30 ? 'text-red-600' : val > 14 ? 'text-amber-600' : 'text-slate-600'}`}>
          {val}d
        </span>
      );
    }
    if (val === null || val === undefined) return '—';
    return String(val);
  };

  const rowClass = (row) => {
    const days = row.days_in_stage;
    if (days === null || days === undefined) return '';
    if (days > 30) return 'bg-red-50';
    if (days > 14) return 'bg-amber-50';
    return '';
  };

  const buildCrmLink = (deal) => {
    if (!deal.source_id) return null;
    if (crm_source === 'bitrix24') {
      return `https://crm.bitrix24.com/crm/deal/details/${deal.source_id}/`;
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden text-[13px]">
      {title && (
        <div className="px-4 py-2.5 border-b border-slate-100">
          <span className="font-medium text-slate-700 text-xs">{title}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-100">
            <tr>
              {cols.map((col) => (
                <th key={col.key || col.label} className="px-3 py-2 text-left text-[11px] font-medium text-slate-500 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deals.map((deal, i) => {
              const crmUrl = buildCrmLink(deal);
              return (
                <tr key={i} className={`${rowClass(deal)} hover:bg-slate-50 transition-colors`}>
                  {cols.map((col) => (
                    <td key={col.key || col.label} className={`px-3 py-2.5 ${col.key === 'title' ? 'font-medium text-slate-800 max-w-[180px] truncate' : 'text-slate-600 whitespace-nowrap'}`} title={col.key === 'title' ? deal[col.key] : undefined}>
                      {formatCell(deal[col.key], col.format)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    {crmUrl && (
                      <a
                        href={crmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
                      >
                        <ExternalLink className="w-3 h-3" strokeWidth={2} />
                        Open
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {truncated && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
          <span className="text-[11px] text-slate-400">Showing {deals.length} deals — more exist. Refine your query to narrow results.</span>
        </div>
      )}
    </div>
  );
}

// "Add to Dashboard" / "Replace Widget" button under non-KPI charts
function AddToDashboardBtn({ chart, onAdd, isReplace }) {
  const [done, setDone] = useState(false);
  const [working, setWorking] = useState(false);

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 mt-2">
        {isReplace ? 'Widget replaced' : 'Added to dashboard'}
      </span>
    );
  }

  return (
    <button
      onClick={async () => {
        if (working) return;
        setWorking(true);
        try {
          const { error } = await onAdd(chart);
          if (!error) setDone(true);
        } finally {
          setWorking(false);
        }
      }}
      disabled={working}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        isReplace
          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
          : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
      }`}
    >
      {working ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
      ) : isReplace ? (
        <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
      ) : (
        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
      )}
      {working
        ? (isReplace ? 'Replacing...' : 'Adding...')
        : (isReplace ? 'Replace on Dashboard' : 'Add to Dashboard')
      }
    </button>
  );
}
