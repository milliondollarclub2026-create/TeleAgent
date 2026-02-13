import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowUp,
  Loader2,
  RotateCcw,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Storage key for chat history (global, not per-agent)
const CHAT_STORAGE_KEY = 'crm_chat_history';

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
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved chat history:', e);
      }
    }
    setInitialLoading(false);
  }, []);

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
          conversation_history: messages
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
      } else {
        // Check if the error is about CRM not being connected
        const errorMessage = data.detail || 'Unknown error';
        if (errorMessage.toLowerCase().includes('not connected') ||
            errorMessage.toLowerCase().includes('bitrix') ||
            errorMessage.toLowerCase().includes('crm')) {
          // Show connection prompt
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
      // Assume network error might be CRM not connected
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

  const resetChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  if (initialLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex flex-col relative" data-testid="crm-chat-page">
      {/* Reset Button - Top Right, only when there are messages */}
      {messages.length > 0 && (
        <button
          onClick={() => setResetDialogOpen(true)}
          className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-medium rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
          Reset
        </button>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty State - Clean and Minimal */
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="max-w-2xl w-full text-center">
              {/* Title */}
              <h1 className="text-3xl font-bold text-slate-900 mb-8 tracking-tight">
                Chat with Bobur the CRM Manager
              </h1>

              {/* Suggested Action Pills - 2x2 Grid */}
              <div className="flex flex-wrap justify-center gap-3 mb-12">
                {suggestedActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(action.text)}
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-[14px] text-slate-700 font-medium transition-colors duration-150"
                    data-testid={`suggested-action-${i}`}
                  >
                    <BitrixIcon className="w-4 h-4 text-[#FF5722]" />
                    <span>{action.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                  /* Connection Prompt - Clean card with button */
                  <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[15px] text-slate-700 mb-4">
                      Please connect your Bitrix24 CRM to use this feature.
                    </p>
                    <Button
                      onClick={() => navigate('/app/connections/bitrix')}
                      variant="outline"
                      className="h-10 px-4 text-[14px] font-medium border-slate-200 hover:bg-slate-50 gap-2"
                    >
                      <BitrixIcon className="w-4 h-4 text-[#FF5722]" />
                      Connect to CRM
                    </Button>
                  </div>
                ) : (
                  /* Assistant Message - Left aligned */
                  <div className={`max-w-[85%] ${msg.isError ? 'text-red-600' : ''}`}>
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

            {/* Typing Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-1.5 px-4 py-3">
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 px-4 pb-2 pt-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-slate-300 focus-within:shadow-md transition-all duration-200">
            <textarea
              ref={inputRef}
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full px-4 pr-14 text-[15px] text-slate-900 placeholder-slate-400 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 leading-[56px]"
              style={{ height: '56px', maxHeight: '200px' }}
              disabled={loading}
              data-testid="crm-chat-input"
            />

            {/* Send Button */}
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
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
