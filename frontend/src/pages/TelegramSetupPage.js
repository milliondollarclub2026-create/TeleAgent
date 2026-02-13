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
          onClick={() => navigate(`/app/agents/${agentId}/connections`)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.75} />
          Back to Connections
        </button>

        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
              <Bot className="w-5.5 h-5.5 text-slate-600" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Telegram Bot</h1>
              <p className="text-sm text-slate-500 mt-0.5">Connect your Telegram bot to receive messages</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${status.connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className={`text-xs font-medium ${status.connected ? 'text-emerald-600' : 'text-slate-500'}`}>
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
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600" strokeWidth={2} />
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
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-emerald-700">AI Replies</span>
                    <span className="text-[10px] text-emerald-500 uppercase tracking-wide">Auto</span>
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
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 cursor-help" strokeWidth={2} />
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

            {/* Info Box */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-700 mb-3">How to get your bot token:</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">1.</span>
                  <p className="text-[13px] text-slate-500">
                    Open{' '}
                    <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-700 underline underline-offset-2">
                      @BotFather
                    </a>{' '}
                    in Telegram
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">2.</span>
                  <p className="text-[13px] text-slate-500">
                    Send <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono">/newbot</code> to create a new bot
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">3.</span>
                  <p className="text-[13px] text-slate-500">Choose a <span className="font-medium text-slate-700">name</span> and <span className="font-medium text-slate-700">username</span> for your bot</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">4.</span>
                  <p className="text-[13px] text-slate-500">Copy the <span className="font-medium text-slate-700">API token</span> provided</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">5.</span>
                  <p className="text-[13px] text-slate-500">Paste it above and click <span className="font-medium text-slate-700">Connect Bot</span></p>
                </div>
              </div>
            </div>

            {/* What happens box */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-700 mb-3">What happens when you connect:</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <p className="text-[13px] text-slate-500">Your bot starts <span className="font-medium text-slate-700">receiving messages</span> from Telegram users</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Zap className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <p className="text-[13px] text-slate-500">AI agent <span className="font-medium text-slate-700">auto-replies</span> based on your settings and knowledge base</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <p className="text-[13px] text-slate-500">Leads are <span className="font-medium text-slate-700">qualified and tracked</span> automatically</p>
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
