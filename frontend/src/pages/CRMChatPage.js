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
  Loader2,
  RotateCcw,
  User,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AiOrb from '../components/Orb/AiOrb';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Bobur's orb colors (orange/amber - matches Bitrix24)
const BOBUR_ORB_COLORS = ['#f97316', '#ea580c', '#f59e0b'];

// Storage key for chat history (global, not per-agent)
const CHAT_STORAGE_KEY = 'crm_chat_history';

// Bobur's intro message
const INTRO_MESSAGE = "Hi! I'm Bobur, your CRM Manager. I can help you explore your leads, check conversion rates, and give you insights about your sales pipeline. What would you like to know?";

// Bitrix24 icon component
const BitrixIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Suggested action pills
const suggestedActions = [
  { text: "Show me recent leads" },
  { text: "What's our conversion rate?" },
  { text: "Give me a CRM overview" },
  { text: "What products are most asked about?" },
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
  const messagesEndRef = useRef(null);
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

      // If connected and returning from connection page, show welcome back
      if (isConnected && returnedFromConnection) {
        setShowWelcomeBack(true);
        // Add welcome back message
        const welcomeBackMsg = {
          role: 'assistant',
          text: "Great! Your Bitrix24 CRM is now connected. I can now access your leads and sales data. How can I help you today?",
          isWelcomeBack: true
        };
        loadedMessages = [...loadedMessages.filter(m => !m.isConnectionPrompt), welcomeBackMsg];
        // Clear the state
        window.history.replaceState({}, document.title);
      }
      // If connected and no messages, add intro
      else if (isConnected && loadedMessages.length === 0) {
        loadedMessages = [{ role: 'assistant', text: INTRO_MESSAGE, isIntro: true }];
      }
      // If not connected, show connection prompt as first message
      else if (!isConnected && !loadedMessages.some(m => m.isConnectionPrompt)) {
        loadedMessages = [{ role: 'assistant', text: '', isConnectionPrompt: true }];
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

  // Smooth scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [messages, loading, scrollToBottom]);

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    // If CRM not connected, show connection prompt
    if (!crmConnected) {
      setMessages(prev => [
        ...prev,
        { role: 'user', text: messageText },
        { role: 'assistant', text: '', isConnectionPrompt: true }
      ]);
      setInput('');
      return;
    }

    const userMessage = { role: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

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
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleConnectCRM = () => {
    // Navigate to Bitrix setup with return state
    navigate('/app/connections/bitrix', { state: { returnTo: '/app/crm' } });
  };

  const resetChat = () => {
    // Keep intro message if connected, otherwise keep connection prompt
    if (crmConnected) {
      setMessages([{ role: 'assistant', text: INTRO_MESSAGE, isIntro: true }]);
    } else {
      setMessages([{ role: 'assistant', text: '', isConnectionPrompt: true }]);
    }
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
        <p className="text-[13px] text-slate-400 font-medium">Loading...</p>
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
            <p className="text-[10px] text-slate-400 font-medium">CRM Manager</p>
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
      <div className="flex-1 overflow-y-auto">
        {/* Messages */}
        <div className={`max-w-3xl mx-auto px-4 py-6 space-y-6 ${showWelcomeBack ? 'animate-in fade-in slide-in-from-bottom-4 duration-500' : ''}`}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${
                msg.isWelcomeBack ? 'animate-in fade-in slide-in-from-left-4 duration-500' : ''
              } ${msg.isIntro && idx === 0 ? 'animate-in fade-in slide-in-from-left-2 duration-300' : ''}`}
            >
              {msg.role === 'user' ? (
                /* User Message - Right aligned with avatar, premium depth */
                <div className="flex items-center gap-3 max-w-[80%] flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center shadow-md">
                    <User className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div className="px-4 py-3 bg-slate-900 rounded-2xl rounded-br-md text-[15px] text-white shadow-lg shadow-slate-900/20">
                    {msg.text}
                  </div>
                </div>
              ) : msg.isConnectionPrompt ? (
                /* Connection Prompt - Premium card with orb */
                <div className="flex items-start gap-3 max-w-md">
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
                      To help you manage your CRM, I need access to your Bitrix24 account. This takes less than a minute.
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
                <div className={`flex items-start gap-3 max-w-[85%] ${msg.isError ? 'text-red-600' : ''}`}>
                  <AiOrb
                    size={32}
                    colors={BOBUR_ORB_COLORS}
                    state="idle"
                    className="flex-shrink-0 mt-0.5"
                  />
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
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator with thinking orb */}
          {loading && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="flex items-center gap-3 px-1 py-2">
                <AiOrb
                  size={32}
                  colors={BOBUR_ORB_COLORS}
                  state="thinking"
                  className="flex-shrink-0"
                />
                <span className="text-[13px] text-slate-400 font-medium">Thinking...</span>
              </div>
            </div>
          )}

          {/* Suggested actions - show after intro or welcome back if no user messages yet */}
          {crmConnected && messages.length <= 2 && !messages.some(m => m.role === 'user') && !loading && (
            <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
              {suggestedActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.text)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-[13px] text-slate-600 font-medium transition-colors duration-150"
                  data-testid={`suggested-action-${i}`}
                >
                  <span>{action.text}</span>
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 px-4 pb-2 pt-4">
        <div className="max-w-3xl mx-auto">
          <div className={`relative bg-white border rounded-2xl shadow-sm transition-all duration-200 ${
            crmConnected
              ? 'border-slate-200 focus-within:border-slate-300 focus-within:shadow-md'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <textarea
              ref={inputRef}
              placeholder={crmConnected ? "Ask me anything..." : "Connect CRM to start chatting..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full px-4 pr-14 text-[15px] text-slate-900 placeholder-slate-400 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 leading-[56px] disabled:cursor-not-allowed"
              style={{ height: '56px', maxHeight: '200px' }}
              disabled={loading || !crmConnected}
              data-testid="crm-chat-input"
            />

            {/* Send Button */}
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || !crmConnected}
              className="absolute right-3 bottom-3 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition-colors"
              data-testid="crm-chat-send"
            >
              <ArrowUp className="w-5 h-5 text-slate-600" strokeWidth={2} />
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
