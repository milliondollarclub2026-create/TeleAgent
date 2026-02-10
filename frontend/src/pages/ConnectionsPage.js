import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Bot,
  Link2,
  Check,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Info,
  CreditCard,
  ShieldCheck
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

// Status indicator component
const StatusDot = ({ connected }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
    <span className={`text-xs font-medium ${connected ? 'text-emerald-600' : 'text-slate-500'}`}>
      {connected ? 'Connected' : 'Not connected'}
    </span>
  </div>
);

// Help section component (controlled by parent)
const HelpSection = ({ children, isOpen, onToggle, title = "How to get this" }) => {
  return (
    <div className="border-t border-slate-100 mt-4 pt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors w-full"
      >
        <Info className="w-3.5 h-3.5" strokeWidth={1.75} />
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 ml-auto" strokeWidth={1.75} />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-auto" strokeWidth={1.75} />
        )}
      </button>
      {isOpen && (
        <div className="mt-3 text-xs text-slate-500 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
};

const ConnectionsPage = () => {
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connectingBot, setConnectingBot] = useState(false);

  // Bitrix24 state
  const [bitrixWebhookUrl, setBitrixWebhookUrl] = useState('');
  const [showBitrixUrl, setShowBitrixUrl] = useState(false);
  const [connectingBitrix, setConnectingBitrix] = useState(false);
  const [testingBitrix, setTestingBitrix] = useState(false);
  const [bitrixStatus, setBitrixStatus] = useState({ connected: false });

  // Shared help section state
  const [showHelp, setShowHelp] = useState(false);
  const [showPaymeHelp, setShowPaymeHelp] = useState(false);
  const [showClickHelp, setShowClickHelp] = useState(false);

  // Payme state
  const [paymeMerchantId, setPaymeMerchantId] = useState('');
  const [paymeSecretKey, setPaymeSecretKey] = useState('');
  const [showPaymeSecret, setShowPaymeSecret] = useState(false);
  const [connectingPayme, setConnectingPayme] = useState(false);
  const [testingPayme, setTestingPayme] = useState(false);
  const [paymeStatus, setPaymeStatus] = useState({ connected: false });

  // Click state
  const [clickServiceId, setClickServiceId] = useState('');
  const [clickSecretKey, setClickSecretKey] = useState('');
  const [showClickSecret, setShowClickSecret] = useState(false);
  const [connectingClick, setConnectingClick] = useState(false);
  const [testingClick, setTestingClick] = useState(false);
  const [clickStatus, setClickStatus] = useState({ connected: false });

  useEffect(() => {
    fetchIntegrations();
    fetchBitrixStatus();
    fetchPaymeStatus();
    fetchClickStatus();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await axios.get(`${API}/integrations/status`);
      setIntegrations(response.data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchBitrixStatus = async () => {
    try {
      const response = await axios.get(`${API}/bitrix-crm/status`);
      setBitrixStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Bitrix status:', error);
    }
  };

  const connectTelegramBot = async () => {
    if (!botToken.trim()) {
      toast.error('Please enter a bot token');
      return;
    }

    setConnectingBot(true);
    try {
      const response = await axios.post(`${API}/telegram/bot`, {
        bot_token: botToken
      });
      toast.success(`Bot @${response.data.bot_username} connected successfully!`);
      setBotToken('');
      fetchIntegrations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect bot');
    } finally {
      setConnectingBot(false);
    }
  };

  const disconnectTelegramBot = async () => {
    try {
      await axios.delete(`${API}/telegram/bot`);
      toast.success('Bot disconnected');
      fetchIntegrations();
    } catch (error) {
      toast.error('Failed to disconnect bot');
    }
  };

  const connectBitrix = async () => {
    if (!bitrixWebhookUrl.trim()) {
      toast.error('Please enter your Bitrix24 webhook URL');
      return;
    }

    setConnectingBitrix(true);
    try {
      const response = await axios.post(`${API}/bitrix-crm/connect`, {
        webhook_url: bitrixWebhookUrl
      });
      toast.success(response.data.message || 'Bitrix24 connected successfully!');
      setBitrixWebhookUrl('');
      fetchBitrixStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect Bitrix24');
    } finally {
      setConnectingBitrix(false);
    }
  };

  const testBitrixConnection = async () => {
    setTestingBitrix(true);
    try {
      const response = await axios.post(`${API}/bitrix-crm/test`);
      if (response.data.ok) {
        toast.success('Connection test successful!');
      } else {
        toast.error(`Test failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error('Test failed. Please check your webhook URL.');
    } finally {
      setTestingBitrix(false);
    }
  };

  const disconnectBitrix = async () => {
    try {
      await axios.post(`${API}/bitrix-crm/disconnect`);
      toast.success('Bitrix24 disconnected');
      fetchBitrixStatus();
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  // Payme functions
  const fetchPaymeStatus = async () => {
    try {
      const response = await axios.get(`${API}/payme/status`);
      setPaymeStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Payme status:', error);
    }
  };

  const connectPayme = async () => {
    if (!paymeMerchantId.trim() || !paymeSecretKey.trim()) {
      toast.error('Please enter both Merchant ID and Secret Key');
      return;
    }

    setConnectingPayme(true);
    try {
      const response = await axios.post(`${API}/payme/connect`, {
        merchant_id: paymeMerchantId,
        secret_key: paymeSecretKey
      });
      toast.success(response.data.message || 'Payme connected successfully!');
      setPaymeMerchantId('');
      setPaymeSecretKey('');
      fetchPaymeStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect Payme');
    } finally {
      setConnectingPayme(false);
    }
  };

  const testPaymeConnection = async () => {
    setTestingPayme(true);
    try {
      const response = await axios.post(`${API}/payme/test`);
      if (response.data.ok) {
        toast.success('Payme connection test successful!');
      } else {
        toast.error(`Test failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error('Test failed. Please check your credentials.');
    } finally {
      setTestingPayme(false);
    }
  };

  const disconnectPayme = async () => {
    try {
      await axios.post(`${API}/payme/disconnect`);
      toast.success('Payme disconnected');
      fetchPaymeStatus();
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  // Click functions
  const fetchClickStatus = async () => {
    try {
      const response = await axios.get(`${API}/click/status`);
      setClickStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Click status:', error);
    }
  };

  const connectClick = async () => {
    if (!clickServiceId.trim() || !clickSecretKey.trim()) {
      toast.error('Please enter both Service ID and Secret Key');
      return;
    }

    setConnectingClick(true);
    try {
      const response = await axios.post(`${API}/click/connect`, {
        service_id: clickServiceId,
        secret_key: clickSecretKey
      });
      toast.success(response.data.message || 'Click connected successfully!');
      setClickServiceId('');
      setClickSecretKey('');
      fetchClickStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect Click');
    } finally {
      setConnectingClick(false);
    }
  };

  const testClickConnection = async () => {
    setTestingClick(true);
    try {
      const response = await axios.post(`${API}/click/test`);
      if (response.data.ok) {
        toast.success('Click connection test successful!');
      } else {
        toast.error(`Test failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error('Test failed. Please check your credentials.');
    } finally {
      setTestingClick(false);
    }
  };

  const disconnectClick = async () => {
    try {
      await axios.post(`${API}/click/disconnect`);
      toast.success('Click disconnected');
      fetchClickStatus();
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white" strokeWidth={2} />
        </div>
        <p className="text-[13px] text-slate-400">Loading connections...</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
    <div className="space-y-6 animate-fade-in" data-testid="connections-page">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Connections</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage your integrations with external services</p>
      </div>

      {/* Connection Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Telegram Bot Card */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden" data-testid="telegram-connection">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Telegram Bot</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Receive and respond to messages</p>
                </div>
              </div>
              <StatusDot connected={integrations?.telegram?.connected} />
            </div>

            {/* Content */}
            {integrations?.telegram?.connected ? (
              <div className="space-y-4">
                {/* Connected State */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      @{integrations.telegram.bot_username}
                    </p>
                    {integrations.telegram.last_webhook_at && (
                      <p className="text-xs text-slate-500">
                        Last activity: {new Date(integrations.telegram.last_webhook_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Local Development Notice */}
                {window.location.hostname === 'localhost' && (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-medium text-slate-700">Local mode:</span> Use Test Bot in the sidebar or{' '}
                    <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" className="text-slate-700 underline underline-offset-2">
                      ngrok
                    </a>{' '}
                    for live webhooks.
                  </p>
                )}

                {/* Disconnect Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                      data-testid="disconnect-bot-btn"
                    >
                      Disconnect Bot
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Telegram Bot?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your bot will stop receiving messages. You can reconnect anytime.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={disconnectTelegramBot}
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Token Input */}
                <div className="space-y-1.5">
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
                      type={showToken ? "text" : "password"}
                      placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      className="h-9 pr-10 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
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
                </div>

                {/* Connect Button */}
                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
                  onClick={connectTelegramBot}
                  disabled={connectingBot}
                  data-testid="connect-bot-btn"
                >
                  {connectingBot && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect Bot
                </Button>
              </div>
            )}

            {/* Help Section - Always visible */}
            <HelpSection isOpen={showHelp} onToggle={() => setShowHelp(!showHelp)} title="Setup instructions">
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Open <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-slate-700 underline underline-offset-2">@BotFather</a> in Telegram</li>
                <li>Send <code className="px-1 py-0.5 bg-slate-100 rounded text-[11px]">/newbot</code> to create a bot</li>
                <li>Copy the API token provided</li>
                <li>Paste it above and connect</li>
              </ol>
            </HelpSection>
          </div>
        </Card>

        {/* Bitrix24 CRM Card */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden" data-testid="bitrix-connection">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Bitrix24 CRM</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sync leads and contacts</p>
                </div>
              </div>
              <StatusDot connected={bitrixStatus?.connected} />
            </div>

            {/* Content */}
            {bitrixStatus?.connected ? (
              <div className="space-y-4">
                {/* Connected State */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">CRM Connected</p>
                    {bitrixStatus.connected_at && (
                      <p className="text-xs text-slate-500">
                        Since {new Date(bitrixStatus.connected_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-slate-200"
                    onClick={testBitrixConnection}
                    disabled={testingBitrix}
                    data-testid="test-bitrix-btn"
                  >
                    {testingBitrix && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Test Connection
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                        data-testid="disconnect-bitrix-btn"
                      >
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Bitrix24?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Lead syncing will stop. You can reconnect anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={disconnectBitrix}
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Webhook Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-slate-700 text-xs font-medium">Webhook URL</Label>
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
                      type={showBitrixUrl ? "text" : "password"}
                      placeholder="https://your-portal.bitrix24.com/rest/1/xxx/"
                      value={bitrixWebhookUrl}
                      onChange={(e) => setBitrixWebhookUrl(e.target.value)}
                      className="h-9 pr-10 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                      data-testid="bitrix-webhook-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBitrixUrl(!showBitrixUrl)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showBitrixUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Connect Button */}
                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
                  onClick={connectBitrix}
                  disabled={connectingBitrix}
                  data-testid="connect-bitrix-btn"
                >
                  {connectingBitrix && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect Bitrix24
                </Button>
              </div>
            )}

            {/* Help Section - Always visible */}
            <HelpSection isOpen={showHelp} onToggle={() => setShowHelp(!showHelp)} title="Setup instructions">
              <p className="text-amber-600 font-medium mb-2">Requires admin privileges on Bitrix24</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Go to <span className="font-medium text-slate-700">Applications</span> → <span className="font-medium text-slate-700">Developer resources</span> → <span className="font-medium text-slate-700">Other</span> → <span className="font-medium text-slate-700">Inbound webhook</span></li>
                <li>Click <span className="font-medium text-slate-700">Inbound webhook</span> → <span className="font-medium text-slate-700">Add</span> and name it (e.g., "LeadRelay Integration")</li>
                <li>In <span className="font-medium text-slate-700">Setting up rights</span>, click <span className="font-medium text-slate-700">+ Select</span> and enable: <span className="font-medium text-slate-700">CRM, Lists, Users, Tasks</span></li>
                <li>Click <span className="font-medium text-slate-700">Save</span> and copy the webhook URL</li>
                <li>Paste the URL above and click Connect</li>
              </ol>
            </HelpSection>
          </div>
        </Card>

      </div>

      {/* Payment Gateways Section */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Payment Gateways</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">Accept payments directly through your AI agent</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payme Card */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden" data-testid="payme-connection">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00CCCC]/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#00CCCC]" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Payme</h3>
                  <p className="text-xs text-slate-500 mt-0.5">UzCard, Humo, Visa, Mastercard</p>
                </div>
              </div>
              <StatusDot connected={paymeStatus?.connected} />
            </div>

            {/* Content */}
            {paymeStatus?.connected ? (
              <div className="space-y-4">
                {/* Connected State */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">Payme Connected</p>
                    {paymeStatus.connected_at && (
                      <p className="text-xs text-slate-500">
                        Since {new Date(paymeStatus.connected_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-slate-200"
                    onClick={testPaymeConnection}
                    disabled={testingPayme}
                    data-testid="test-payme-btn"
                  >
                    {testingPayme && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Test Connection
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                        data-testid="disconnect-payme-btn"
                      >
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Payme?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Payment link generation will stop. You can reconnect anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={disconnectPayme}
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Merchant ID Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-slate-700 text-xs font-medium">Merchant ID</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 cursor-help" strokeWidth={2} />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-slate-900 text-white text-xs px-2 py-1">
                        Encrypted & secured
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="text"
                    placeholder="5e730e8e0b852a417aa49ceb"
                    value={paymeMerchantId}
                    onChange={(e) => setPaymeMerchantId(e.target.value)}
                    className="h-9 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    data-testid="payme-merchant-input"
                  />
                </div>

                {/* Secret Key Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-slate-700 text-xs font-medium">Secret Key</Label>
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
                      type={showPaymeSecret ? "text" : "password"}
                      placeholder="Your Payme secret key"
                      value={paymeSecretKey}
                      onChange={(e) => setPaymeSecretKey(e.target.value)}
                      className="h-9 pr-10 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                      data-testid="payme-secret-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPaymeSecret(!showPaymeSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPaymeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Connect Button */}
                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
                  onClick={connectPayme}
                  disabled={connectingPayme}
                  data-testid="connect-payme-btn"
                >
                  {connectingPayme && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect Payme
                </Button>
              </div>
            )}

            {/* Help Section */}
            <HelpSection isOpen={showPaymeHelp} onToggle={() => setShowPaymeHelp(!showPaymeHelp)} title="How to get credentials">
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Register at <a href="https://business.payme.uz" target="_blank" rel="noopener noreferrer" className="text-slate-700 underline underline-offset-2">business.payme.uz</a></li>
                <li>Complete merchant verification (1-3 days)</li>
                <li>Login to <a href="https://merchant.payme.uz" target="_blank" rel="noopener noreferrer" className="text-slate-700 underline underline-offset-2">merchant.payme.uz</a></li>
                <li>Go to <span className="font-medium text-slate-700">Developer Tools</span></li>
                <li>Copy your Merchant ID and Secret Key</li>
              </ol>
            </HelpSection>
          </div>
        </Card>

        {/* Click Card */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden" data-testid="click-connection">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00B2FF]/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#00B2FF]" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Click</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Click wallet, UzCard, Humo</p>
                </div>
              </div>
              <StatusDot connected={clickStatus?.connected} />
            </div>

            {/* Content */}
            {clickStatus?.connected ? (
              <div className="space-y-4">
                {/* Connected State */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">Click Connected</p>
                    {clickStatus.connected_at && (
                      <p className="text-xs text-slate-500">
                        Since {new Date(clickStatus.connected_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-slate-200"
                    onClick={testClickConnection}
                    disabled={testingClick}
                    data-testid="test-click-btn"
                  >
                    {testingClick && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Test Connection
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                        data-testid="disconnect-click-btn"
                      >
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Click?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Payment link generation will stop. You can reconnect anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={disconnectClick}
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Service ID Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-slate-700 text-xs font-medium">Service ID</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 cursor-help" strokeWidth={2} />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-slate-900 text-white text-xs px-2 py-1">
                        Encrypted & secured
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="text"
                    placeholder="12345"
                    value={clickServiceId}
                    onChange={(e) => setClickServiceId(e.target.value)}
                    className="h-9 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    data-testid="click-service-input"
                  />
                </div>

                {/* Secret Key Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-slate-700 text-xs font-medium">Secret Key</Label>
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
                      type={showClickSecret ? "text" : "password"}
                      placeholder="Your Click secret key"
                      value={clickSecretKey}
                      onChange={(e) => setClickSecretKey(e.target.value)}
                      className="h-9 pr-10 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                      data-testid="click-secret-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClickSecret(!showClickSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showClickSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Connect Button */}
                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
                  onClick={connectClick}
                  disabled={connectingClick}
                  data-testid="connect-click-btn"
                >
                  {connectingClick && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect Click
                </Button>
              </div>
            )}

            {/* Help Section */}
            <HelpSection isOpen={showClickHelp} onToggle={() => setShowClickHelp(!showClickHelp)} title="How to get credentials">
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Register at <a href="https://my.click.uz" target="_blank" rel="noopener noreferrer" className="text-slate-700 underline underline-offset-2">my.click.uz</a></li>
                <li>Create a merchant account</li>
                <li>Go to <span className="font-medium text-slate-700">Settings</span> → <span className="font-medium text-slate-700">API</span></li>
                <li>Copy your Service ID and Secret Key</li>
              </ol>
            </HelpSection>
          </div>
        </Card>
      </div>

      {/* Info Footer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <CircleDot className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="font-medium text-slate-900 text-sm">Connection Status</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Connected services sync automatically. Telegram messages trigger your AI agent,
            and qualified leads are pushed to your CRM in real-time.
          </p>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default ConnectionsPage;
