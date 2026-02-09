import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  ArrowLeft,
  Database,
  TrendingUp,
  Users,
  Package,
  AlertCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const suggestedQuestions = [
  { icon: TrendingUp, text: "What are our top selling products?", category: "Sales" },
  { icon: Users, text: "Show me recent leads", category: "Leads" },
  { icon: Database, text: "What's our conversion rate?", category: "Analytics" },
  { icon: Package, text: "How many deals are in the pipeline?", category: "Deals" },
  { icon: TrendingUp, text: "Give me a CRM overview", category: "Summary" },
  { icon: Users, text: "What products are most asked about?", category: "Products" },
];

export default function CRMChatPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [crmStatus, setCrmStatus] = useState({ connected: false, loading: true });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    checkCRMStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (crmStatus.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!crmStatus.connected) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/app/agents/${agentId}`)}
            className="text-slate-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">CRM Not Connected</h2>
            <p className="text-slate-600 mb-6">
              Connect your Bitrix24 CRM to start chatting with your data. 
              You'll be able to ask questions about leads, deals, products, and analytics.
            </p>
            <Button
              onClick={() => navigate('/connections')}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Database className="w-4 h-4 mr-2" />
              Connect Bitrix24
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="crm-chat-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/app/agents/${agentId}`)}
            className="text-slate-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">CRM Chat</h1>
              <p className="text-xs text-slate-500">Ask questions about your CRM data</p>
            </div>
          </div>
        </div>
        
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearChat}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Clear Chat
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Ask me anything about your CRM
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md">
                I can help you understand your leads, deals, products, and sales trends. 
                Try one of the suggestions below or type your own question.
              </p>
              
              {/* Suggested Questions */}
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q.text)}
                    className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-left text-sm text-slate-700 transition-colors"
                    data-testid={`suggested-q-${i}`}
                  >
                    <q.icon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="line-clamp-2">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : msg.isError
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {msg.role === 'assistant' && !msg.isError && (
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-600">CRM Assistant</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span className="text-sm text-slate-600">Analyzing CRM data...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about leads, deals, products, or analytics..."
              className="flex-1"
              disabled={loading}
              data-testid="crm-chat-input"
            />
            <Button 
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="crm-chat-send"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Powered by AI • Data from your Bitrix24 CRM
          </p>
        </div>
      </Card>
    </div>
  );
}
