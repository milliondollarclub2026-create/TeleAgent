import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  Bot,
  Check,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  MessageSquare,
  Zap,
  Globe,
  Crown,
  Copy,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TelegramSetupPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();

  // Connection status
  const [botStatus, setBotStatus] = useState({ connected: false });
  const [businessStatus, setBusinessStatus] = useState({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Mode: 'select' | 'business' | 'botfather'
  const [mode, setMode] = useState('select');

  // BotFather state
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Business state
  const [linkCode, setLinkCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState(null);
  const [pollingBusiness, setPollingBusiness] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const pollIntervalRef = useRef(null);

  const isConnected = botStatus.connected || businessStatus.connected;
  const connectionType = businessStatus.connected ? 'business' : botStatus.connected ? 'botfather' : null;

  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/integrations/status`);
      setBotStatus(response.data?.telegram || { connected: false });
      setBusinessStatus(response.data?.telegram_business || { connected: false });
    } catch (error) {
      console.error('Failed to fetch Telegram status:', error);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchStatus]);

  // BotFather handlers
  const handleConnect = async () => {
    if (!botToken.trim()) {
      toast.error('Please enter a bot token');
      return;
    }
    setConnecting(true);
    try {
      const response = await axios.post(`${API}/telegram/bot`, { bot_token: botToken });
      toast.success(`Bot @${response.data.bot_username} connected successfully!`);
      setBotToken('');
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect bot. Please check your token.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectBot = async () => {
    try {
      await axios.delete(`${API}/telegram/bot`);
      toast.success('Telegram bot disconnected');
      setBotStatus({ connected: false });
    } catch (error) {
      toast.error('Failed to disconnect bot');
    }
  };

  // Business handlers
  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await axios.post(`${API}/telegram/business/generate-link-code`);
      setLinkCode(response.data.code);
      setCodeExpiresAt(Date.now() + (response.data.expires_in * 1000));
      startPolling();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate link code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleDisconnectBusiness = async () => {
    try {
      await axios.delete(`${API}/telegram/business/disconnect`);
      toast.success('Telegram Business disconnected');
      setBusinessStatus({ connected: false });
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(linkCode);
    toast.success('Code copied to clipboard');
  };

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setPollingBusiness(true);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API}/telegram/business/status`);
        if (response.data?.connected) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setPollingBusiness(false);
          setBusinessStatus(response.data);
          setLinkCode('');
          setJustConnected(true);
          // Transition to normal connected state after the success moment
          setTimeout(() => setJustConnected(false), 4000);
        }
      } catch {
        // Silently continue polling
      }
    }, 4000);
    // Stop polling after 10 minutes
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setPollingBusiness(false);
      }
    }, 600000);
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" strokeWidth={2} />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="max-w-2xl mx-auto py-2">
        {/* Back Navigation */}
        <button
          onClick={() => navigate(agentId ? `/app/agents/${agentId}/connections` : '/app/connections')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.75} />
          Back to Connections
        </button>

        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
              <Bot className="w-5.5 h-5.5 text-[#0088cc]" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Telegram</h1>
              <p className="text-sm text-slate-500 mt-0.5">Connect Telegram to receive and reply to messages</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-600' : 'bg-slate-300'}`} />
            <span className={`text-xs font-medium ${isConnected ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>

        {isConnected ? (
          /* ============ CONNECTED STATE ============ */
          <div className="space-y-5">
            {/* Success moment — shown briefly after connection completes */}
            {justConnected && (
              <Card className="bg-white border-emerald-200 shadow-sm overflow-hidden animate-[fadeIn_0.4s_ease-out]">
                <div className="p-8 text-center">
                  {/* Animated checkmark */}
                  <div className="relative w-16 h-16 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-full bg-emerald-600 animate-[scaleIn_0.3s_ease-out]" />
                    <svg className="relative w-16 h-16" viewBox="0 0 64 64">
                      <path
                        d="M20 33 L28 41 L44 25"
                        fill="none"
                        stroke="white"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-[drawCheck_0.4s_ease-out_0.3s_both]"
                        style={{ strokeDasharray: 40, strokeDashoffset: 40 }}
                      />
                    </svg>
                    {/* Subtle pulse ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-[pulseRing_1.5s_ease-out_0.5s_both]" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-1 animate-[fadeSlideUp_0.4s_ease-out_0.5s_both]">
                    Connected
                  </h2>
                  <p className="text-sm text-slate-500 animate-[fadeSlideUp_0.4s_ease-out_0.65s_both]">
                    {connectionType === 'business'
                      ? `${businessStatus.telegram_first_name || 'Your account'} is now linked to LeadRelay`
                      : `@${botStatus.bot_username} is ready to receive messages`
                    }
                  </p>
                </div>
              </Card>
            )}

            <Card className={`bg-white border-slate-200 shadow-sm transition-all duration-500 ${justConnected ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
              <div className="p-6">
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {connectionType === 'business'
                        ? (businessStatus.telegram_first_name || businessStatus.telegram_username || 'Business Connected')
                        : `@${botStatus.bot_username || 'Bot Connected'}`
                      }
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {connectionType === 'business' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700">
                          <Crown className="w-3 h-3" strokeWidth={2} />
                          Premium Business
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-600">
                          <Wrench className="w-3 h-3" strokeWidth={2} />
                          BotFather
                        </span>
                      )}
                      {connectionType === 'botfather' && botStatus.last_webhook_at && (
                        <span className="text-xs text-slate-500">
                          Last activity: {new Date(botStatus.last_webhook_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      {connectionType === 'business' && businessStatus.connected_at && (
                        <span className="text-xs text-slate-500">
                          Since {new Date(businessStatus.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Capability Badges */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-slate-700">Messages</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Receive</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 shadow-sm">
                    <Zap className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-white">AI Replies</span>
                    <span className="text-[10px] text-emerald-100 uppercase tracking-wide">Auto</span>
                  </div>
                  {connectionType === 'business' && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      <Crown className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
                      <span className="text-xs font-medium text-slate-700">Replies as you</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2.5">
                  {connectionType === 'botfather' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-[13px] border-slate-200"
                      onClick={() => navigate(`/app/agents/${agentId}/test-chat`)}
                    >
                      Test Bot
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-[13px] text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                        data-testid="disconnect-bot-btn"
                      >
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Disconnect {connectionType === 'business' ? 'Telegram Business' : 'Telegram Bot'}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {connectionType === 'business'
                            ? 'Your AI will stop replying to messages in your Telegram Business account. You can reconnect anytime.'
                            : 'Your bot will stop receiving messages. You can reconnect anytime with a new token.'
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={connectionType === 'business' ? handleDisconnectBusiness : handleDisconnectBot}
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          </div>
        ) : mode === 'select' ? (
          /* ============ MODE SELECTOR ============ */
          <div className="space-y-5">
            <p className="text-sm text-slate-600 mb-2">Choose how to connect Telegram:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Business Mode Card */}
              <button
                onClick={() => setMode('business')}
                className="text-left p-5 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-400 shadow-sm hover:shadow transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <Crown className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                  <span className="text-[10px] font-medium tracking-wide uppercase text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-[15px] mb-1">Telegram Premium</h3>
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  AI replies as you, directly in your Telegram account. Requires Telegram Premium.
                </p>
              </button>

              {/* BotFather Mode Card */}
              <button
                onClick={() => setMode('botfather')}
                className="text-left p-5 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-400 shadow-sm hover:shadow transition-all group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-5 h-5 text-slate-500" strokeWidth={1.75} />
                </div>
                <h3 className="font-semibold text-slate-900 text-[15px] mb-1">BotFather Bot</h3>
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  Create a dedicated bot via @BotFather. Customers message the bot directly.
                </p>
              </button>
            </div>
          </div>
        ) : mode === 'business' ? (
          /* ============ BUSINESS MODE SETUP ============ */
          <div className="space-y-5">
            <button
              onClick={() => { setMode('select'); setLinkCode(''); setPollingBusiness(false); if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); }}
              className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              Back to options
            </button>

            <Card className="bg-white border-slate-200 shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <Crown className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                  <h2 className="font-semibold text-slate-900 text-[15px]">Connect via Telegram Premium</h2>
                </div>

                {!linkCode ? (
                  /* Generate Code */
                  <div className="space-y-4">
                    <p className="text-[13px] text-slate-600 leading-relaxed">
                      Generate a link code and send it to <a href="https://t.me/TheLeadRelayBot" target="_blank" rel="noopener noreferrer" className="font-medium text-[#0088cc] hover:underline">@TheLeadRelayBot</a> on Telegram to connect your business account.
                    </p>
                    <Button
                      className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium shadow-sm"
                      onClick={handleGenerateCode}
                      disabled={generatingCode}
                    >
                      {generatingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Generate Link Code
                    </Button>
                  </div>
                ) : (
                  /* Show Code + Instructions */
                  <div className="space-y-5">
                    {/* Code Display */}
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex-1">
                        <p className="text-[11px] text-slate-500 font-medium mb-1">Your link code</p>
                        <p className="text-2xl font-bold text-slate-900 tracking-[0.15em] font-mono">{linkCode}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 border-slate-200"
                        onClick={copyCode}
                      >
                        <Copy className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
                        Copy
                      </Button>
                    </div>

                    {/* Polling Status */}
                    {pollingBusiness && (
                      <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" strokeWidth={2} />
                        <span className="text-[13px] text-amber-800 font-medium">Waiting for connection...</span>
                      </div>
                    )}

                    {/* Regenerate */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[12px] border-slate-200"
                      onClick={handleGenerateCode}
                      disabled={generatingCode}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                      Generate New Code
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Business Setup Guide */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-[15px] font-semibold text-slate-900">Setup Guide</h3>
                <p className="text-xs text-slate-500 mt-0.5">Connect your Telegram Business account</p>
              </div>
              <div className="p-6">
                <div className="relative">
                  <div className="absolute left-[11px] top-6 bottom-6 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">1</span>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Open <a href="https://t.me/TheLeadRelayBot" target="_blank" rel="noopener noreferrer" className="font-medium text-[#0088cc] hover:underline">@TheLeadRelayBot</a> in Telegram
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">2</span>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Send your <span className="font-medium text-slate-900">link code</span> to the bot
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">3</span>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Go to Telegram <span className="font-medium text-slate-900">Settings &gt; Telegram Business &gt; Chatbots</span>
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">4</span>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Add <span className="font-medium text-[#0088cc]">@TheLeadRelayBot</span> as your business chatbot
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Done! AI will reply to customer messages <span className="font-medium text-slate-900">as you</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          /* ============ BOTFATHER MODE SETUP ============ */
          <div className="space-y-5">
            <button
              onClick={() => setMode('select')}
              className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              Back to options
            </button>

            {/* Connect Card */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <Wrench className="w-5 h-5 text-slate-500" strokeWidth={1.75} />
                  <h2 className="font-semibold text-slate-900 text-[15px]">Connect via BotFather</h2>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-slate-700 text-xs font-medium">Bot Token</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 cursor-help" strokeWidth={2} />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-slate-900 text-white text-xs px-2 py-1">
                        Encrypted & secured
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="relative">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder="Paste your bot token from @BotFather"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      className="h-10 pr-10 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                      data-testid="bot-token-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">Format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz</p>
                </div>

                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium shadow-sm"
                  onClick={handleConnect}
                  disabled={connecting}
                  data-testid="connect-bot-btn"
                >
                  {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect Bot
                </Button>
              </div>
            </Card>

            {/* BotFather Setup Guide */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Setup Guide</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Get your bot token from BotFather</p>
                </div>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0088cc]/10 border border-[#0088cc]/20 text-[10px] font-medium text-[#0088cc] hover:bg-[#0088cc]/20 transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1.01.54-1.45.53-.48-.01-1.39-.27-2.07-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.38-3.61 3.99-1.66 4.83-1.95 5.37-1.96.12 0 .38.03.55.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
                  </svg>
                  @BotFather
                </a>
              </div>
              <div className="p-6">
                <div className="relative">
                  <div className="absolute left-[11px] top-6 bottom-6 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">1</span>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Open <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-medium text-[#0088cc] hover:underline">@BotFather</a> in Telegram
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">2</span>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Send the command
                        <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-600">/newbot</span>
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">3</span>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Choose a <span className="font-medium text-slate-900">name</span> and <span className="font-medium text-slate-900">username</span> for your bot
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">4</span>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Copy the <span className="font-medium text-slate-900">API token</span> BotFather provides
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed pt-0.5">
                        Paste your token above and click <span className="font-semibold text-[#0088cc]">Connect Bot</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default TelegramSetupPage;
