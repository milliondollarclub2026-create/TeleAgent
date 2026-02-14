import React, { useState, useEffect } from 'react';
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

  // State
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API}/integrations/status`);
      setStatus(response.data?.telegram || { connected: false });
    } catch (error) {
      console.error('Failed to fetch Telegram status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleConnect = async () => {
    if (!botToken.trim()) {
      toast.error('Please enter a bot token');
      return;
    }

    setConnecting(true);
    try {
      const response = await axios.post(`${API}/telegram/bot`, {
        bot_token: botToken,
      });
      toast.success(`Bot @${response.data.bot_username} connected successfully!`);
      setBotToken('');
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect bot. Please check your token.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.delete(`${API}/telegram/bot`);
      toast.success('Telegram bot disconnected');
      setStatus({ connected: false });
    } catch (error) {
      toast.error('Failed to disconnect bot');
    }
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
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Telegram Bot</h1>
              <p className="text-sm text-slate-500 mt-0.5">Connect your Telegram bot to receive messages</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${status.connected ? 'bg-emerald-600' : 'bg-slate-300'}`} />
            <span className={`text-xs font-medium ${status.connected ? 'text-emerald-700' : 'text-slate-500'}`}>
              {status.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>

        {status.connected ? (
          /* ============ CONNECTED STATE ============ */
          <div className="space-y-5">
            {/* Status Card */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      @{status.bot_username || 'Bot Connected'}
                    </h2>
                    {status.last_webhook_at && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Last activity: {new Date(status.last_webhook_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
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
                </div>

                {/* Local Dev Notice */}
                {window.location.hostname === 'localhost' && (
                  <p className="text-xs text-slate-500 leading-relaxed mb-5">
                    <span className="font-medium text-slate-700">Local mode:</span> Use Test Bot in the sidebar or{' '}
                    <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" className="text-slate-700 underline underline-offset-2">
                      ngrok
                    </a>{' '}
                    for live webhooks.
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-[13px] border-slate-200"
                    onClick={() => navigate(`/app/agents/${agentId}/test-chat`)}
                  >
                    Test Bot
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-[13px] text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                        data-testid="disconnect-bot-btn"
                      >
                        Disconnect Bot
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Telegram Bot?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your bot will stop receiving messages. You can reconnect anytime with a new token.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={handleDisconnect}
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
        ) : (
          /* ============ SETUP STATE ============ */
          <div className="space-y-5">
            {/* Connect Card */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <div className="p-6">
                <h2 className="font-semibold text-slate-900 text-[15px] mb-4">Connect your bot</h2>

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

            {/* Setup Guide Card */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
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

              {/* Steps Timeline */}
              <div className="p-6">
                <div className="relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-[11px] top-6 bottom-6 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

                  <div className="space-y-5">
                    {/* Step 1 */}
                    <div className="flex gap-4 group">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">1</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Open <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-medium text-[#0088cc] hover:underline">@BotFather</a> in Telegram
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4 group">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">2</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Send the command
                          <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-600">/newbot</span>
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 group">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">3</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Choose a <span className="font-medium text-slate-900">name</span> and <span className="font-medium text-slate-900">username</span> for your bot
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4 group">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">4</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Copy the <span className="font-medium text-slate-900">API token</span> BotFather provides
                        </p>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex gap-4 group">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Paste your token above and click <span className="font-semibold text-[#0088cc]">Connect Bot</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* What happens - Refined info section */}
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">After connecting</p>
              <div className="grid gap-4">
                <div className="group flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 group-hover:bg-emerald-600 transition-colors flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">Receive messages instantly</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">All Telegram messages forwarded to your AI</p>
                  </div>
                </div>
                <div className="group flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 group-hover:bg-emerald-600 transition-colors flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">Auto-reply with AI</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">Responses based on your knowledge base</p>
                  </div>
                </div>
                <div className="group flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 group-hover:bg-emerald-600 transition-colors flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">Track & qualify leads</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">Automatic lead scoring and tracking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default TelegramSetupPage;
