import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Image,
  ImageOff,
  ChevronDown,
  Cpu,
  Mic,
  Paperclip,
  X,
  FileText,
  Square,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import AiOrb from '../components/Orb/AiOrb';
import { toast } from 'sonner';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
  { value: 'gpt-4.1', label: 'GPT-4.1', provider: 'OpenAI' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'Anthropic' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'Anthropic' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'Anthropic' },
];

const getModelLabel = (modelId) => MODEL_OPTIONS.find(m => m.value === modelId)?.label || modelId;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper to get storage key for chat history
const getChatStorageKey = (agentId) => `test_bot_chat_history_${agentId}`;
const getDebugStorageKey = (agentId) => `test_bot_debug_info_${agentId}`;

// Image URL cache to avoid repeated API calls
const imageUrlCache = new Map();

// Parse message text for [[image:name]] patterns
const parseMessageForImages = (text) => {
  const regex = /\[\[image:([^\]]+)\]\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the image reference
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    // Add the image reference
    parts.push({ type: 'image', name: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
};

// Component to render inline image
const InlineImage = ({ name, onLoad }) => {
  const [imageUrl, setImageUrl] = useState(imageUrlCache.get(name) || null);
  const [loading, setLoading] = useState(!imageUrlCache.has(name));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (imageUrlCache.has(name)) {
      setImageUrl(imageUrlCache.get(name));
      setLoading(false);
      return;
    }

    const fetchImageUrl = async () => {
      try {
        const response = await axios.get(`${API}/media/by-name/${encodeURIComponent(name)}`);
        if (response.data && response.data.public_url) {
          imageUrlCache.set(name, response.data.public_url);
          setImageUrl(response.data.public_url);
          if (onLoad) onLoad({ name, url: response.data.public_url });
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(`Failed to fetch image "${name}":`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImageUrl();
  }, [name, onLoad]);

  if (loading) {
    return (
      <div className="my-2 flex items-center justify-center w-full max-w-[240px] h-32 rounded-lg bg-slate-100 animate-pulse">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="my-2 flex items-center justify-center gap-2 w-full max-w-[200px] h-24 rounded-lg bg-slate-100 border border-slate-200">
        <ImageOff className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400">Image not found</span>
      </div>
    );
  }

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block my-2"
    >
      <img
        src={imageUrl}
        alt={name}
        className="max-w-full w-auto max-h-[200px] rounded-lg object-cover hover:opacity-90 transition-opacity cursor-pointer"
        onError={() => setError(true)}
      />
    </a>
  );
};

// Component to render message content with inline images
const MessageContent = ({ text, onImageLoad }) => {
  const parts = parseMessageForImages(text);

  return (
    <div className="space-y-1">
      {parts.map((part, idx) => {
        if (part.type === 'image') {
          return <InlineImage key={idx} name={part.name} onLoad={onImageLoad} />;
        }
        // Render text, preserving whitespace and line breaks
        return (
          <span key={idx} className="whitespace-pre-wrap">
            {part.content}
          </span>
        );
      })}
    </div>
  );
};

const AgentTestChatPage = () => {
  const { agentId } = useParams();
  const [config, setConfig] = useState({ business_name: 'Your Agent' });
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [activeModel, setActiveModel] = useState('gpt-4o');
  const [switchingModel, setSwitchingModel] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(null);
  const messagesEndRef = useRef(null);
  const {
    isRecording,
    elapsedSeconds,
    audioBlob,
    error: recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
    discardAudio,
  } = useAudioRecorder();

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [agentId]);

  // Show recorder errors as toasts
  useEffect(() => {
    if (recorderError) toast.error(recorderError);
  }, [recorderError]);

  // Smooth auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(getChatStorageKey(agentId));
    const savedDebug = localStorage.getItem(getDebugStorageKey(agentId));
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved chat history:', e);
      }
    }
    if (savedDebug) {
      try {
        setDebugInfo(JSON.parse(savedDebug));
      } catch (e) {
        console.error('Failed to parse saved debug info:', e);
      }
    }
  }, [agentId]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(getChatStorageKey(agentId), JSON.stringify(messages));
    }
  }, [messages, agentId]);

  // Save debug info to localStorage whenever it changes
  useEffect(() => {
    if (debugInfo) {
      localStorage.setItem(getDebugStorageKey(agentId), JSON.stringify(debugInfo));
    }
  }, [debugInfo, agentId]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      if (response.data) {
        setConfig(response.data);
        // Load the tenant's configured model
        const savedModel = response.data.sales_model || 'gpt-4o';
        const validModels = MODEL_OPTIONS.map(m => m.value);
        setActiveModel(validModels.includes(savedModel) ? savedModel : 'gpt-4o');
        // Only set default greeting if no saved messages exist
        const savedMessages = localStorage.getItem(getChatStorageKey(agentId));
        if (!savedMessages) {
          const defaultGreeting = `Hello! Welcome to ${response.data.business_name || 'our store'}. I'm here to help you find what you're looking for. How can I assist you today?`;
          const greeting = response.data.greeting_message || defaultGreeting;
          setMessages([{ role: 'assistant', text: greeting }]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
      const savedMessages = localStorage.getItem(getChatStorageKey(agentId));
      if (!savedMessages) {
        setMessages([{ role: 'assistant', text: "Hello! I'm here to help you. How can I assist you today?" }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModelSwitch = async (newModel) => {
    setSwitchingModel(true);
    const previousModel = activeModel;
    setActiveModel(newModel);
    try {
      await axios.put(`${API}/config`, { sales_model: newModel });
      toast.success(`Switched to ${getModelLabel(newModel)}`);
    } catch (error) {
      setActiveModel(previousModel);
      toast.error('Failed to switch model');
    } finally {
      setSwitchingModel(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large (max 25MB)');
      return;
    }
    setAttachedFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isAudioFile = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    return ['webm', 'mp3', 'wav', 'ogg', 'mp4', 'm4a', 'oga'].includes(ext);
  };

  const isImageFile = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  };

  const sendMessage = async () => {
    const hasText = input.trim().length > 0;
    const hasAudio = !!audioBlob;
    const hasFile = !!attachedFile;
    if ((!hasText && !hasAudio && !hasFile) || sending) return;

    const userMessage = input.trim();
    setInput('');

    // Capture duration before any state resets
    const capturedDuration = elapsedSeconds;

    // Build user message metadata for display
    const userMsg = { role: 'user', text: userMessage };
    if (hasAudio) {
      userMsg.isVoice = true;
      userMsg.voiceDuration = capturedDuration;
      userMsg.text = userMessage || 'Voice message';
    } else if (hasFile) {
      userMsg.fileName = attachedFile.name;
      userMsg.fileSize = attachedFile.size;
      userMsg.isImage = isImageFile(attachedFile.name);
      userMsg.isAudioFile = isAudioFile(attachedFile.name);
    }

    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      let response;

      if (hasAudio) {
        // Voice recording → send as audio
        setIsTranscribing(true);
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('message', userMessage);
        formData.append('file_type', 'audio');
        formData.append('conversation_history', JSON.stringify(
          messages.map(m => ({ role: m.role === 'assistant' ? 'agent' : 'user', text: m.text }))
        ));
        response = await axios.post(`${API}/chat/test-media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        discardAudio();
        setIsTranscribing(false);

        // Update user message with transcript
        if (response.data.transcript) {
          setMessages(prev => {
            const updated = [...prev];
            const lastUserIdx = updated.findLastIndex(m => m.role === 'user');
            if (lastUserIdx >= 0) {
              updated[lastUserIdx] = { ...updated[lastUserIdx], text: response.data.transcript, transcript: response.data.transcript };
            }
            return updated;
          });
        }
      } else if (hasFile) {
        // File attachment → detect type
        const fileIsAudio = isAudioFile(attachedFile.name);
        const fType = fileIsAudio ? 'audio' : 'document';
        if (fileIsAudio) setIsTranscribing(true);
        else setIsExtracting(true);

        const formData = new FormData();
        formData.append('file', attachedFile);
        formData.append('message', userMessage);
        formData.append('file_type', fType);
        formData.append('conversation_history', JSON.stringify(
          messages.map(m => ({ role: m.role === 'assistant' ? 'agent' : 'user', text: m.text }))
        ));
        response = await axios.post(`${API}/chat/test-media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setAttachedFile(null);
        setIsTranscribing(false);
        setIsExtracting(false);

        // Update transcript for audio files
        if (fileIsAudio && response.data.transcript) {
          setMessages(prev => {
            const updated = [...prev];
            const lastUserIdx = updated.findLastIndex(m => m.role === 'user');
            if (lastUserIdx >= 0) {
              updated[lastUserIdx] = { ...updated[lastUserIdx], text: response.data.transcript, transcript: response.data.transcript };
            }
            return updated;
          });
        }
      } else {
        // Text only
        response = await axios.post(`${API}/chat/test`, {
          message: userMessage,
          conversation_history: messages.map(m => ({
            role: m.role === 'assistant' ? 'agent' : 'user',
            text: m.text
          }))
        });
      }

      const respondedModel = response.data.model || activeModel;
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: response.data.reply,
        model: respondedModel,
      }]);

      setDebugInfo({
        stage: response.data.sales_stage,
        hotness: response.data.hotness,
        score: response.data.score,
        fields_collected: response.data.fields_collected,
        rag_used: response.data.rag_context_used,
        rag_count: response.data.rag_context_count,
        model: respondedModel,
        whisper_used: response.data.whisper_used,
        transcript: response.data.transcript,
        document_extracted: response.data.document_extracted,
        document_name: response.data.document_name,
      });
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(detail || 'Failed to get response');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: detail || 'Sorry, there was an error. Please try again.'
      }]);
      setIsTranscribing(false);
      setIsExtracting(false);
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
    setAttachedFile(null);
    if (isRecording) cancelRecording();
    discardAudio();
    // Clear localStorage
    localStorage.removeItem(getChatStorageKey(agentId));
    localStorage.removeItem(getDebugStorageKey(agentId));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isRecording) {
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
    <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex flex-col animate-fade-in" data-testid="agent-test-chat-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Test Bot</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Preview how your AI agent responds to customers</p>
        </div>
        <Button
          size="sm"
          onClick={resetChat}
          className="h-9 bg-slate-900 hover:bg-slate-800 text-white"
        >
          <RotateCcw className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
          Reset
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Chat Interface - Takes 2 columns */}
        <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <AiOrb
                size={40}
                colors={['#10b981', '#059669', '#14b8a6']}
                state="idle"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">{config.business_name || 'Your Agent'}</p>
                <p className="text-xs text-slate-500">AI Sales Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={activeModel} onValueChange={handleModelSwitch} disabled={switchingModel || sending}>
                <SelectTrigger className="h-8 w-[170px] text-[12px] border-slate-200 bg-slate-50 font-medium gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" strokeWidth={1.75} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model.value} value={model.value} className="text-[12px]">
                      <span>{model.label}</span>
                      <span className="text-slate-400 ml-1.5">{model.provider}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  {msg.role === 'user' ? (
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-slate-900">
                      <User className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                    </div>
                  ) : (
                    <AiOrb
                      size={28}
                      colors={['#10b981', '#059669', '#14b8a6']}
                      state="idle"
                      className="flex-shrink-0"
                    />
                  )}

                  {/* Message Bubble */}
                  <div className="flex flex-col gap-1">
                    <div className={`px-4 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-2xl rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <MessageContent text={msg.text} />
                      ) : (
                        <div>
                          {/* Voice message indicator */}
                          {msg.isVoice && (
                            <div className="flex items-center gap-1.5 mb-1 opacity-70">
                              <Mic className="w-3.5 h-3.5" strokeWidth={2} />
                              <span className="text-[11px]">Voice message</span>
                              {msg.voiceDuration > 0 && (
                                <span className="text-[11px]">{formatDuration(msg.voiceDuration)}</span>
                              )}
                            </div>
                          )}
                          {/* File attachment indicator */}
                          {msg.fileName && !msg.isAudioFile && (
                            <div className="flex items-center gap-1.5 mb-1 opacity-70">
                              <FileText className="w-3.5 h-3.5" strokeWidth={2} />
                              <span className="text-[11px] truncate max-w-[180px]">{msg.fileName}</span>
                            </div>
                          )}
                          {/* Audio file indicator */}
                          {msg.isAudioFile && (
                            <div className="flex items-center gap-1.5 mb-1 opacity-70">
                              <Mic className="w-3.5 h-3.5" strokeWidth={2} />
                              <span className="text-[11px] truncate max-w-[180px]">{msg.fileName}</span>
                            </div>
                          )}
                          <span className="whitespace-pre-wrap">{msg.text}</span>
                        </div>
                      )}
                    </div>
                    {msg.role === 'assistant' && msg.model && (
                      <span className="text-[10px] text-slate-400 ml-1">{getModelLabel(msg.model)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing / Processing Indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2 max-w-[80%]">
                  <AiOrb
                    size={28}
                    colors={['#10b981', '#059669', '#14b8a6']}
                    state="thinking"
                    className="flex-shrink-0"
                  />
                  <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                    {isTranscribing ? (
                      <div className="flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5 text-emerald-500 animate-pulse" strokeWidth={2} />
                        <span className="text-xs text-slate-500">Transcribing audio...</span>
                      </div>
                    ) : isExtracting ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 animate-pulse" strokeWidth={2} />
                        <span className="text-xs text-slate-500">Reading document...</span>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Scroll anchor for smooth auto-scroll */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-5 py-4 border-t border-slate-100 bg-white flex-shrink-0">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.ogg,.webm,.mp4,.m4a"
              onChange={handleFileSelect}
            />

            {/* Attached file preview chip */}
            {attachedFile && !isRecording && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                {isImageFile(attachedFile.name) ? (
                  <Image className="w-4 h-4 text-slate-500 flex-shrink-0" strokeWidth={1.75} />
                ) : isAudioFile(attachedFile.name) ? (
                  <Mic className="w-4 h-4 text-slate-500 flex-shrink-0" strokeWidth={1.75} />
                ) : (
                  <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" strokeWidth={1.75} />
                )}
                <span className="text-[12px] text-slate-700 truncate flex-1">{attachedFile.name}</span>
                <span className="text-[11px] text-slate-400 flex-shrink-0">{formatFileSize(attachedFile.size)}</span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                </button>
              </div>
            )}

            {/* Audio recording preview chip */}
            {audioBlob && !isRecording && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Mic className="w-4 h-4 text-emerald-600 flex-shrink-0" strokeWidth={1.75} />
                <span className="text-[12px] text-emerald-700 flex-1">Voice recording ({formatDuration(elapsedSeconds)})</span>
                <button
                  onClick={discardAudio}
                  className="p-0.5 rounded-full hover:bg-emerald-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2} />
                </button>
              </div>
            )}

            {isRecording ? (
              /* Recording mode */
              <div className="flex items-center justify-between h-11">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-slate-700 font-mono">{formatDuration(elapsedSeconds)}</span>
                  <span className="text-xs text-slate-400">Recording...</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelRecording}
                    className="h-9 text-slate-500 border-slate-200 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={stopRecording}
                    className="bg-red-600 hover:bg-red-700 h-9 w-9 p-0 rounded-full"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" strokeWidth={0} />
                  </Button>
                </div>
              </div>
            ) : (
              /* Normal mode */
              <div className="flex items-center gap-2">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending || !!audioBlob}
                        className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Paperclip className="w-5 h-5" strokeWidth={1.75} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p className="text-xs">Attach file</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Input
                  placeholder={audioBlob ? "Add a note (optional)..." : attachedFile ? "Ask about this file..." : "Type a message..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 h-11 border-slate-200 bg-slate-50 focus:bg-white text-[13px] rounded-xl"
                  disabled={sending}
                  data-testid="chat-input"
                />

                {/* Show mic button when no text/file, otherwise show send */}
                {!input.trim() && !attachedFile && !audioBlob ? (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={startRecording}
                          disabled={sending}
                          className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Mic className="w-5 h-5" strokeWidth={1.75} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p className="text-xs">Record voice</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 h-11 w-11 p-0 rounded-full shadow-sm flex-shrink-0"
                    onClick={sendMessage}
                    disabled={sending || (!input.trim() && !attachedFile && !audioBlob)}
                    data-testid="send-btn"
                  >
                    {(isTranscribing || isExtracting) ? (
                      <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                    ) : (
                      <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* AI Insights Panel - Takes 1 column */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden lg:max-h-full lg:overflow-y-auto">
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

                {/* Active Model */}
                {debugInfo.model && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Model Used</p>
                    <p className="text-sm font-semibold text-slate-900">{getModelLabel(debugInfo.model)}</p>
                  </div>
                )}

                {/* RAG */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Knowledge Base</p>
                  <p className="text-sm font-medium text-slate-700">
                    {debugInfo.rag_used ? `${debugInfo.rag_count} chunks used` : 'Not used'}
                  </p>
                </div>

                {/* Whisper transcription */}
                {debugInfo.whisper_used && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Voice Transcription</p>
                    <p className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                      {debugInfo.transcript || 'Transcribed via Whisper'}
                    </p>
                  </div>
                )}

                {/* Document extraction */}
                {debugInfo.document_extracted && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">Document Context</p>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                      <p className="text-xs font-medium text-slate-700 truncate">{debugInfo.document_name}</p>
                    </div>
                  </div>
                )}

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
