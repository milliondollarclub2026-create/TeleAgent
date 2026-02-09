import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Bot,
  Send,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Settings,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AgentTestChatPage = () => {
  const { agentId } = useParams();
  const [config, setConfig] = useState({ business_name: 'Your Agent' });
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    fetchConfig();
  }, [agentId]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      if (response.data) {
        setConfig(response.data);
        // Initialize with professional greeting
        const defaultGreeting = `Hello! Welcome to ${response.data.business_name || 'our store'}. I'm here to help you find what you're looking for. How can I assist you today?`;
        const greeting = response.data.greeting_message || defaultGreeting;
        setMessages([{ role: 'assistant', text: greeting }]);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
      setMessages([{ role: 'assistant', text: "Hello! I'm here to help you. How can I assist you today?" }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setSending(true);

    try {
      const response = await axios.post(`${API}/chat/test`, {
        message: userMessage,
        conversation_history: messages.map(m => ({
          role: m.role === 'assistant' ? 'agent' : 'user',
          text: m.text
        }))
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: response.data.reply
      }]);

      setDebugInfo({
        stage: response.data.sales_stage,
        hotness: response.data.hotness,
        score: response.data.score,
        fields_collected: response.data.fields_collected,
        rag_used: response.data.rag_context_used,
        rag_count: response.data.rag_context_count
      });
    } catch (error) {
      toast.error('Failed to get response');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, there was an error. Please try again.'
      }]);
    } finally {
      setSending(false);
    }
  };

  const resetChat = () => {
    const defaultGreeting = `Hello! Welcome to ${config.business_name || 'our store'}. I'm here to help you find what you're looking for. How can I assist you today?`;
    const greeting = config.greeting_message || defaultGreeting;
    setMessages([{ role: 'assistant', text: greeting }]);
    setDebugInfo(null);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl" data-testid="agent-test-chat-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-['Plus_Jakarta_Sans'] text-slate-900">Test Chat</h1>
          <p className="text-slate-500 text-sm mt-0.5">See how your AI agent responds to customers</p>
        </div>
        <Link to={`/app/agents/${agentId}/settings`}>
          <Button variant="outline" size="sm" className="border-slate-200">
            <Settings className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
            Settings
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/80 border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
        <p className="text-xs text-amber-700">
          <span className="font-medium text-amber-800">Testing Mode:</span> This simulates how your agent responds. Connect your Telegram bot for live testing.
        </p>
      </div>

      {/* Chat Interface */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        {/* Chat Header - Clean and minimal */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <Bot className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">{config.business_name || 'Your Agent'}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetChat}
            className="text-slate-400 hover:text-slate-600 h-8 w-8 p-0"
            title="Reset conversation"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
          </Button>
        </div>

        {/* Messages - Premium feel with neutral tones */}
        <div ref={messagesRef} className="h-[380px] overflow-y-auto p-4 space-y-3 bg-white">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <Bot className="w-3 h-3 text-slate-500" strokeWidth={2} />
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-2xl rounded-br-md'
                  : 'bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                <Bot className="w-3 h-3 text-slate-500" strokeWidth={2} />
              </div>
              <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input - Refined and elegant */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-10 border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-300 focus-visible:ring-1 focus-visible:ring-slate-200 text-sm rounded-lg"
              disabled={sending}
              data-testid="chat-input"
            />
            <Button
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 h-10 w-10 p-0 rounded-lg"
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              data-testid="send-btn"
            >
              <Send className="w-4 h-4" strokeWidth={2} />
            </Button>
          </div>
        </div>

        {/* Insights Drawer - Subtle and informative */}
        <div className="border-t border-slate-100">
          <button
            className="w-full px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50/50 flex items-center justify-center gap-1.5 transition-colors"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDebug ? 'Hide' : 'Show'} AI Insights
          </button>

          {showDebug && (
            <div className="px-5 py-4 bg-slate-50/70 border-t border-slate-100">
              {debugInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">Stage</p>
                      <p className="text-xs font-semibold text-slate-700 capitalize">{debugInfo.stage?.replace('_', ' ') || 'awareness'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">Hotness</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        debugInfo.hotness === 'hot' ? 'bg-red-50 text-red-600' :
                        debugInfo.hotness === 'warm' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {debugInfo.hotness || 'cold'}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">Score</p>
                      <p className="text-xs font-semibold text-slate-700 font-mono">{debugInfo.score || 0}/100</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">RAG</p>
                      <p className="text-xs font-semibold text-slate-700">{debugInfo.rag_used ? `${debugInfo.rag_count} chunks` : 'Inactive'}</p>
                    </div>
                  </div>
                  {debugInfo.fields_collected && Object.keys(debugInfo.fields_collected).length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-2 text-center">Fields Collected</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {Object.entries(debugInfo.fields_collected).filter(([_, v]) => v).map(([key, value]) => (
                          <span key={key} className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                            {key}: {String(value).substring(0, 20)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center">Send a message to see AI insights</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Tips */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-medium text-slate-900 text-sm mb-2">Testing Tips</h3>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• Ask about products or services to test knowledge retrieval</li>
            <li>• Express buying interest to see lead qualification</li>
            <li>• Share contact info to test lead collection</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentTestChatPage;
