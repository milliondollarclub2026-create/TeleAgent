import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  Database,
  TrendingUp,
  Users,
  Package,
  AlertCircle,
  RotateCcw,
  User,
  BarChart3,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const suggestedQuestions = [
  { icon: TrendingUp, text: "What are our top selling products?" },
  { icon: Users, text: "Show me recent leads" },
  { icon: BarChart3, text: "What's our conversion rate?" },
  { icon: Package, text: "How many deals are in the pipeline?" },
  { icon: TrendingUp, text: "Give me a CRM overview" },
  { icon: ShoppingBag, text: "What products are most asked about?" },
];

export default function CRMChatPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [crmStatus, setCrmStatus] = useState({ connected: false, loading: true });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    checkCRMStatus();
  }, []);

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
    // Small delay to ensure DOM is updated before scrolling
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [messages, loading, scrollToBottom]);

  const checkCRMStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bitrix-crm/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCrmStatus({ ...data, loading: false });
    } catch (error) {
      setCrmStatus({ connected: false, loading: false });
    }
  };

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
        toast.error(data.detail || 'Failed to get response');
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `Sorry, I encountered an error: ${data.detail || 'Unknown error'}. Please try again.`,
          isError: true
        }]);
      }
    } catch (error) {
      toast.error('Network error');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, I had trouble connecting. Please check your connection and try again.',
        isError: true
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
  };

  if (crmStatus.loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white" strokeWidth={2} />
        </div>
        <p className="text-[13px] text-slate-400">Loading CRM...</p>
      </div>
    );
  }

  if (!crmStatus.connected) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center" data-testid="crm-chat-page">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">CRM Not Connected</h2>
          <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">
            Connect your Bitrix24 CRM to start chatting with your data.
            You'll be able to ask questions about leads, deals, products, and analytics.
          </p>
          <Button
            onClick={() => navigate(`/app/agents/${agentId}/connections`)}
            className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium shadow-sm"
          >
            <Database className="w-4 h-4 mr-2" strokeWidth={1.75} />
            Connect Bitrix24
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-[calc(100vh-8rem)] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
      data-testid="crm-chat-page"
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">CRM Assistant</p>
            <p className="text-xs text-slate-500">Powered by Bitrix24</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              className="h-8 px-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="p-5 space-y-4 min-h-full">
          {messages.length === 0 ? (
            /* Empty State - Centered */
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                <Database className="w-7 h-7 text-slate-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Ask me anything about your CRM
              </h3>
              <p className="text-[13px] text-slate-500 mb-8 max-w-sm leading-relaxed">
                I can help you understand your leads, deals, products, and sales trends.
              </p>

              {/* Suggested Questions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl w-full px-4">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q.text)}
                    className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-left text-[13px] text-slate-700 transition-all duration-200 group"
                    data-testid={`suggested-q-${i}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
                      <q.icon className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                    </div>
                    <span className="line-clamp-2 leading-snug font-medium">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className={`flex items-end gap-2.5 max-w-[85%] lg:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${
                      msg.role === 'user' ? 'bg-slate-900' : 'bg-slate-900'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 text-white" strokeWidth={2} />
                      ) : (
                        <Database className="w-4 h-4 text-white" strokeWidth={2} />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`px-4 py-3 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-2xl rounded-br-md'
                        : msg.isError
                        ? 'bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-bl-md'
                        : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {loading && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-end gap-2.5 max-w-[85%] lg:max-w-[70%]">
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center shadow-sm">
                      <Database className="w-4 h-4 text-white" strokeWidth={2} />
                    </div>
                    <div className="bg-slate-100 px-4 py-3.5 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Ask about leads, deals, products, or analytics..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-12 border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-300 text-[13px] rounded-xl px-4 transition-colors"
            disabled={loading}
            data-testid="crm-chat-input"
          />
          <Button
            className="bg-slate-900 hover:bg-slate-800 h-12 w-12 p-0 rounded-full shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            data-testid="crm-chat-send"
          >
            <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
          </Button>
        </div>
      </div>

      {/* Reset Chat Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Reset chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[13px]">
              This will clear the current conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-[13px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-slate-900 hover:bg-slate-800 text-white text-[13px]"
              onClick={() => {
                resetChat();
                setResetDialogOpen(false);
              }}
            >
              Reset Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
