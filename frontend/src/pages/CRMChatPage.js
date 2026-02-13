import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  ArrowLeft,
  ArrowUp,
  RotateCcw,
  User,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AiOrb from '../components/Orb/AiOrb';
import ChartRenderer from '../components/charts/ChartRenderer';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Bobur's orb colors (orange/amber - matches Bitrix24)
const BOBUR_ORB_COLORS = ['#f97316', '#ea580c', '#f59e0b'];

// Storage key for chat history (global, not per-agent)
const CHAT_STORAGE_KEY = 'analytics_chat_history';
const PENDING_QUESTION_KEY = 'analytics_pending_question';

// Bobur's intro message - always shown first
const INTRO_MESSAGE = "Hi! I'm Bobur, your Analytics Engineer. I can analyze your CRM data, visualize conversion rates with charts, and turn your sales pipeline into actionable insights. What would you like to explore?";

// Bitrix24 icon component
const BitrixIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Suggested action pills
const suggestedActions = [
  { text: "Show me a conversion chart" },
  { text: "Analyze lead trends" },
  { text: "Visualize sales pipeline" },
  { text: "Top performing products" },
];

// Thinking messages for premium cycling effect - more states, slower pace
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

export default function CRMChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [crmConnected, setCrmConnected] = useState(null); // null = checking, true/false = result
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Check CRM connection status
  const checkCrmConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/bitrix-crm/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      return data.connected === true;
    } catch (error) {
      console.error('Failed to check CRM status:', error);
      return false;
    }
  }, [token]);

  // Auto scroll to bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  // Load chat history and check connection on mount
  useEffect(() => {
    const initialize = async () => {
      // Check if returning from connection page
      const returnedFromConnection = location.state?.fromConnection;

      // Check CRM connection status
      const isConnected = await checkCrmConnection();
      setCrmConnected(isConnected);

      // Load saved messages
      const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
      let loadedMessages = [];

      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed)) {
            // Filter out any old connection prompts if now connected
            loadedMessages = isConnected
              ? parsed.filter(m => !m.isConnectionPrompt)
              : parsed;
          }
        } catch (e) {
          console.error('Failed to parse saved chat history:', e);
        }
      }

      // If returning from connection page after successful connection
      if (isConnected && returnedFromConnection) {
        setShowWelcomeBack(true);
        // Filter out connection prompts
        loadedMessages = loadedMessages.filter(m => !m.isConnectionPrompt);

        // Check if there's a pending question to continue with
        const pendingQuestion = localStorage.getItem(PENDING_QUESTION_KEY);
        if (pendingQuestion) {
          // Clear the pending question
          localStorage.removeItem(PENDING_QUESTION_KEY);
          // Set messages without welcome back - we'll answer the question instead
          setMessages(loadedMessages);
          setInitialLoading(false);
          // Clear the navigation state
          window.history.replaceState({}, document.title);
          // Trigger the pending question after a short delay
          setTimeout(() => {
            setShowWelcomeBack(false);
            sendPendingQuestion(pendingQuestion);
          }, 500);
          return;
        }

        // No pending question - show generic connected message
        const connectedMsg = {
          role: 'assistant',
          text: "Great! Your Bitrix24 CRM is now connected. I can now access your leads and sales data. How can I help you today?",
          isWelcomeBack: true
        };
        loadedMessages = [...loadedMessages, connectedMsg];
        // Clear the navigation state
        window.history.replaceState({}, document.title);
      }
      // If no messages at all, show intro (regardless of connection status)
      else if (loadedMessages.length === 0) {
        loadedMessages = [{ role: 'assistant', text: INTRO_MESSAGE, isIntro: true }];
      }

      setMessages(loadedMessages);
      setInitialLoading(false);

      // Clear welcome back animation after delay
      if (returnedFromConnection) {
        setTimeout(() => setShowWelcomeBack(false), 2000);
      }
    };

    initialize();
  }, [checkCrmConnection, location.state]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto scroll when messages change or loading state changes
  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom('smooth'), 100);
    return () => clearTimeout(timer);
  }, [messages, loading, scrollToBottom]);

  // Scroll immediately when new user message is added
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1]?.role === 'user') {
      scrollToBottom('instant');
    }
  }, [messages, scrollToBottom]);

  // Cycle through thinking messages when loading - slower pace (4 seconds)
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

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = { role: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = '56px';
    }
    setLoading(true);

    // Check CRM connection before making the request
    const isConnected = await checkCrmConnection();
    setCrmConnected(isConnected);

    // If CRM not connected, save the question and show connection prompt
    if (!isConnected) {
      // Save the pending question so we can continue after connecting
      localStorage.setItem(PENDING_QUESTION_KEY, messageText);
      setMessages(prev => [...prev, { role: 'assistant', text: '', isConnectionPrompt: true }]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/bitrix-crm/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageText,
          conversation_history: messages.filter(m => !m.isIntro && !m.isWelcomeBack && !m.isConnectionPrompt)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: data.reply,
          charts: data.charts || []
        }]);
      } else {
        const errorMessage = data.detail || 'Unknown error';
        if (errorMessage.toLowerCase().includes('not connected') ||
            errorMessage.toLowerCase().includes('bitrix') ||
            errorMessage.toLowerCase().includes('crm')) {
          setCrmConnected(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: '',
            isConnectionPrompt: true
          }]);
        } else {
          toast.error(errorMessage);
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
            isError: true
          }]);
        }
      }
    } catch (error) {
      setCrmConnected(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '',
        isConnectionPrompt: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Function to send a pending question after CRM connection
  const sendPendingQuestion = async (questionText) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/bitrix-crm/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: questionText,
          conversation_history: messages.filter(m => !m.isIntro && !m.isWelcomeBack && !m.isConnectionPrompt)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: data.reply,
          charts: data.charts || []
        }]);
      } else {
        toast.error(data.detail || 'Failed to get response');
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `Sorry, I encountered an error. Please try asking again.`,
          isError: true
        }]);
      }
    } catch (error) {
      toast.error('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleConnectCRM = () => {
    // Navigate to Bitrix setup with return state
    navigate('/app/connections/bitrix', { state: { returnTo: '/app/analytics' } });
  };

  const resetChat = () => {
    // Always reset to intro message
    setMessages([{ role: 'assistant', text: INTRO_MESSAGE, isIntro: true }]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  if (initialLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
        <AiOrb
          size={64}
          colors={BOBUR_ORB_COLORS}
          state="thinking"
        />
        <p className="text-[13px] text-slate-500 font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex flex-col" data-testid="crm-chat-page">
      {/* Top Bar - Slim and minimal, flush to top */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center justify-between -mt-2 lg:-mt-3 relative">
        {/* Elegant gradient separator line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        {/* Left: Back Button */}
        <button
          onClick={() => navigate('/app/agents')}
          className="flex items-center gap-2 px-2 py-1.5 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
          <span className="text-[13px] font-medium">Back</span>
        </button>

        {/* Center: Title with orb */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          <AiOrb
            size={28}
            colors={BOBUR_ORB_COLORS}
            state={loading ? "thinking" : "idle"}
          />
          <div className="text-center">
            <h1 className="text-[14px] font-semibold text-slate-900 leading-tight">Bobur</h1>
            <p className="text-[10px] text-slate-400 font-medium">Analytics Engineer</p>
          </div>
        </div>

        {/* Right: Reset Button (only when messages exist beyond intro) */}
        <div className="w-[72px] flex justify-end">
          {messages.length > 1 && (
            <button
              onClick={() => setResetDialogOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-medium rounded-lg transition-colors shadow-sm"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        {/* Messages */}
        <div className={`max-w-4xl mx-auto px-4 py-6 space-y-6 ${showWelcomeBack ? 'animate-in fade-in slide-in-from-bottom-4 duration-500' : ''}`}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${
                msg.isWelcomeBack ? 'animate-in fade-in slide-in-from-left-4 duration-500' : ''
              } ${msg.isIntro && idx === 0 ? 'animate-in fade-in slide-in-from-left-2 duration-300' : ''}`}
            >
              {msg.role === 'user' ? (
                /* User Message - Right aligned with avatar, premium depth */
                <div className="flex items-center gap-3 max-w-[75%] flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center shadow-md">
                    <User className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div className="px-4 py-3 bg-slate-900 rounded-2xl rounded-br-md text-[15px] text-white shadow-lg shadow-slate-900/20">
                    {msg.text}
                  </div>
                </div>
              ) : msg.isConnectionPrompt ? (
                /* Connection Prompt - Premium card with orb */
                <div className="flex items-start gap-3 max-w-lg">
                  <AiOrb
                    size={32}
                    colors={BOBUR_ORB_COLORS}
                    state="idle"
                    className="flex-shrink-0 mt-1"
                  />
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[15px] text-slate-700 mb-1 font-medium">
                      Let's get connected!
                    </p>
                    <p className="text-[14px] text-slate-500 mb-4 leading-relaxed">
                      To access your CRM data and help you manage leads, I need to connect to your Bitrix24 account. This takes less than a minute.
                    </p>
                    <Button
                      onClick={handleConnectCRM}
                      className="bg-[#FF5722] hover:bg-[#E64A19] text-white h-10 px-4 text-[14px] font-medium gap-2 shadow-sm"
                    >
                      <BitrixIcon className="w-4 h-4" />
                      Connect Bitrix24
                      <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" strokeWidth={2} />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Assistant Message - Left aligned with orb avatar */
                <div className={`flex items-start gap-3 max-w-[90%] ${msg.isError ? 'text-red-600' : ''}`}>
                  <AiOrb
                    size={32}
                    colors={BOBUR_ORB_COLORS}
                    state="idle"
                    className="flex-shrink-0 -mt-0.5"
                  />
                  <div className="flex-1 space-y-4">
                    {/* Text content */}
                    {msg.text && (
                      <div className="text-[15px] text-slate-700 leading-relaxed crm-chat-markdown">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-4 border border-slate-200 rounded-lg">
                                <table className="min-w-full border-collapse text-[13px]">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-slate-50">{children}</thead>
                            ),
                            th: ({ children }) => (
                              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-4 py-2.5 border-b border-slate-100 text-slate-600">
                                {children}
                              </td>
                            ),
                            tr: ({ children }) => (
                              <tr className="hover:bg-slate-50/50">{children}</tr>
                            ),
                            h1: ({ children }) => (
                              <h1 className="text-xl font-bold text-slate-900 mt-6 mb-3">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-lg font-bold text-slate-900 mt-5 mb-2">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">{children}</h3>
                            ),
                            ul: ({ children }) => (
                              <ul className="my-3 space-y-2">{children}</ul>
                            ),
                            ol: ({ children, start }) => (
                              <ol className="my-3 space-y-2" start={start}>
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-slate-700 flex items-start gap-2">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                                <span className="flex-1">{children}</span>
                              </li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-slate-900">{children}</strong>
                            ),
                            p: ({ children }) => (
                              <p className="mb-3 last:mb-0">{children}</p>
                            ),
                            code: ({ inline, children }) => (
                              inline ? (
                                <code className="px-1.5 py-0.5 bg-slate-100 rounded text-[13px] font-mono">
                                  {children}
                                </code>
                              ) : (
                                <pre className="my-3 p-4 bg-slate-100 rounded-lg overflow-x-auto">
                                  <code className="text-[13px] font-mono">{children}</code>
                                </pre>
                              )
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    {/* Charts - Smart grid layout */}
                    {msg.charts && msg.charts.length > 0 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {(() => {
                          // Separate KPIs from other charts
                          const kpis = msg.charts.filter(c => c.type?.toLowerCase() === 'kpi' || c.type?.toLowerCase() === 'metric');
                          const smallCharts = msg.charts.filter(c => ['pie', 'donut', 'bar'].includes(c.type?.toLowerCase()));
                          const wideCharts = msg.charts.filter(c => ['line', 'area', 'funnel'].includes(c.type?.toLowerCase()));

                          return (
                            <>
                              {/* KPIs in horizontal grid - up to 3 per row */}
                              {kpis.length > 0 && (
                                <div className={`grid gap-3 ${kpis.length === 1 ? 'grid-cols-1 max-w-xs' : kpis.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                  {kpis.map((chart, idx) => (
                                    <ChartRenderer key={`kpi-${idx}`} chart={chart} />
                                  ))}
                                </div>
                              )}

                              {/* Small charts (pie, bar) - 2 per row when multiple */}
                              {smallCharts.length > 0 && (
                                <div className={`grid gap-4 ${smallCharts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                                  {smallCharts.map((chart, idx) => (
                                    <ChartRenderer key={`small-${idx}`} chart={chart} />
                                  ))}
                                </div>
                              )}

                              {/* Wide charts (line, funnel) - full width, stacked */}
                              {wideCharts.length > 0 && (
                                <div className="space-y-4">
                                  {wideCharts.map((chart, idx) => (
                                    <ChartRenderer key={`wide-${idx}`} chart={chart} />
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

          {/* Typing Indicator with thinking orb */}
          {loading && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="flex items-center gap-4 px-1 py-2">
                <AiOrb
                  size={32}
                  colors={BOBUR_ORB_COLORS}
                  state="thinking"
                  className="flex-shrink-0"
                />
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

          {/* Suggested actions - show after intro if no user messages yet */}
          {messages.length === 1 && messages[0]?.isIntro && !loading && (
            <div className="flex flex-wrap gap-2.5 pt-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
              {suggestedActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.text)}
                  className="group px-4 py-2.5 bg-white border border-slate-200/80 rounded-full text-[13px] text-slate-600 font-medium transition-all duration-200 ease-out hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] hover:-translate-y-px active:translate-y-0 active:shadow-none"
                  style={{ animationDelay: `${300 + i * 75}ms` }}
                  data-testid={`suggested-action-${i}`}
                >
                  {action.text}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 px-4 pb-3 pt-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-slate-300 focus-within:shadow-md transition-all duration-200">
            <textarea
              ref={inputRef}
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-grow textarea
                e.target.style.height = '56px';
                const scrollHeight = e.target.scrollHeight;
                const newHeight = Math.min(Math.max(scrollHeight, 56), 160);
                e.target.style.height = newHeight + 'px';
                e.target.style.overflowY = scrollHeight > 160 ? 'auto' : 'hidden';
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full pl-5 pr-14 text-[15px] text-slate-900 placeholder-slate-400 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 overflow-hidden flex items-center"
              style={{ height: '56px', maxHeight: '160px', paddingTop: '16px', paddingBottom: '16px', lineHeight: '24px' }}
              disabled={loading}
              data-testid="crm-chat-input"
            />

            {/* Send Button */}
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-colors shadow-sm"
              data-testid="crm-chat-send"
            >
              <ArrowUp className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Reset Chat Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Reset chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[14px]">
              This will clear the current conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={() => {
                resetChat();
                setResetDialogOpen(false);
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
