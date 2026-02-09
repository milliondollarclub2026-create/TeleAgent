import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import {
  Send,
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
  const messagesRef = useRef(null);

  useEffect(() => {
    checkCRMStatus();
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading]);

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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white" strokeWidth={2} />
        </div>
        <p className="text-[13px] text-slate-400">Loading CRM...</p>
      </div>
    );
  }

  if (!crmStatus.connected) {
    return (
      <div className="space-y-5 animate-fade-in" data-testid="crm-chat-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">CRM Chat</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Chat with your CRM data</p>
          </div>
        </div>

        {/* Not Connected State */}
        <Card className="max-w-lg mx-auto bg-white border-slate-200 shadow-sm">
          <div className="p-8 text-center">
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
              className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
            >
              <Database className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
              Connect Bitrix24
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in" data-testid="crm-chat-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">CRM Chat</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Chat with your CRM data</p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetChat}
            className="h-9 border-slate-200 text-slate-600"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
            Reset
          </Button>
        )}
      </div>

      {/* Chat Interface - Full Width */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">CRM Assistant</p>
              <p className="text-xs text-slate-500">Powered by Bitrix24</p>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        </div>

        {/* Messages Area */}
        <div ref={messagesRef} className="flex-1 h-[480px] overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                Ask me anything about your CRM
              </h3>
              <p className="text-[13px] text-slate-500 mb-6 max-w-sm leading-relaxed">
                I can help you understand your leads, deals, products, and sales trends.
              </p>

              {/* Suggested Questions Grid */}
              <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q.text)}
                    className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg text-left text-[13px] text-slate-700 transition-all duration-150 group"
                    data-testid={`suggested-q-${i}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
                      <q.icon className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                    </div>
                    <span className="line-clamp-2 leading-snug">{q.text}</span>
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
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-slate-900' : 'bg-emerald-500'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                      ) : (
                        <Database className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`px-4 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-2xl rounded-br-sm'
                        : msg.isError
                        ? 'bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-bl-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm shadow-sm'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-2 max-w-[80%]">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center">
                      <Database className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="px-5 py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Ask about leads, deals, products, or analytics..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-11 border-slate-200 bg-slate-50 focus:bg-white text-[13px] rounded-xl"
              disabled={loading}
              data-testid="crm-chat-input"
            />
            <Button
              className="bg-slate-900 hover:bg-slate-800 h-11 w-11 p-0 rounded-xl shadow-sm"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              data-testid="crm-chat-send"
            >
              <Send className="w-4 h-4" strokeWidth={2} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
