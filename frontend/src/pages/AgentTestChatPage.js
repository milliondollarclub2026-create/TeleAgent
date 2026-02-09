import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Bot,
  ArrowUp,
  RotateCcw,
  Loader2,
  User,
  MessageCircle
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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white" strokeWidth={2} />
        </div>
        <p className="text-[13px] text-slate-400">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in" data-testid="agent-test-chat-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Test Bot</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Preview how your AI agent responds to customers</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetChat}
          className="h-9 border-slate-200 text-slate-600"
        >
          <RotateCcw className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
          Reset
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat Interface - Takes 2 columns */}
        <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">{config.business_name || 'Your Agent'}</p>
                <p className="text-xs text-slate-500">AI Sales Assistant</p>
              </div>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>

          {/* Messages */}
          <div ref={messagesRef} className="flex-1 h-[520px] overflow-y-auto p-5 space-y-4 bg-slate-50/50">
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
                      <MessageCircle className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`px-4 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-2xl rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2 max-w-[80%]">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-white" strokeWidth={2} />
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
          </div>

          {/* Input Area */}
          <div className="px-5 py-4 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 h-11 border-slate-200 bg-slate-50 focus:bg-white text-[13px] rounded-xl"
                disabled={sending}
                data-testid="chat-input"
              />
              <Button
                className="bg-slate-900 hover:bg-slate-800 h-11 w-11 p-0 rounded-full shadow-sm"
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                data-testid="send-btn"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </Button>
            </div>
          </div>
        </Card>

        {/* AI Insights Panel - Takes 1 column */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm">AI Insights</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time analysis</p>
          </div>

          <div className="p-5">
            {debugInfo ? (
              <div className="space-y-5">
                {/* Stage */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Sales Stage</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{debugInfo.stage?.replace('_', ' ') || 'Awareness'}</p>
                </div>

                {/* Hotness */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Lead Temperature</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                    debugInfo.hotness === 'hot' ? 'bg-rose-100 text-rose-700' :
                    debugInfo.hotness === 'warm' ? 'bg-amber-100 text-amber-700' :
                    'bg-sky-100 text-sky-700'
                  }`}>
                    {debugInfo.hotness || 'Cold'}
                  </span>
                </div>

                {/* Score */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Lead Score</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full transition-all duration-500"
                        style={{ width: `${debugInfo.score || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 font-mono w-12 text-right">{debugInfo.score || 0}</span>
                  </div>
                </div>

                {/* RAG */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Knowledge Base</p>
                  <p className="text-sm font-medium text-slate-700">
                    {debugInfo.rag_used ? `${debugInfo.rag_count} chunks used` : 'Not used'}
                  </p>
                </div>

                {/* Fields Collected */}
                {debugInfo.fields_collected && Object.keys(debugInfo.fields_collected).filter(k => debugInfo.fields_collected[k]).length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-2">Collected Info</p>
                    <div className="space-y-1.5">
                      {Object.entries(debugInfo.fields_collected).filter(([_, v]) => v).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 capitalize">{key}</span>
                          <span className="font-medium text-slate-700 truncate ml-2 max-w-[120px]">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Bot className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">No data yet</p>
                <p className="text-xs text-slate-500">Send a message to see AI insights</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AgentTestChatPage;
