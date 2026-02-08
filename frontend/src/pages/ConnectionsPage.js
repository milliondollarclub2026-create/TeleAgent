import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Bot, 
  Link2, 
  FileSpreadsheet, 
  Check, 
  X, 
  Loader2,
  ExternalLink,
  AlertTriangle,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConnectionCard = ({ 
  title, 
  description, 
  icon: Icon, 
  connected, 
  status,
  iconBg,
  children,
  testId
}) => (
  <Card className="bg-white border-slate-200 shadow-sm" data-testid={testId}>
    <CardHeader className="pb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            connected 
              ? 'bg-emerald-100' 
              : iconBg || 'bg-slate-100'
          }`}>
            <Icon className={`w-5 h-5 ${connected ? 'text-emerald-600' : 'text-slate-500'}`} strokeWidth={1.75} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900">{title}</CardTitle>
            <CardDescription className="text-sm text-slate-500 mt-0.5">{description}</CardDescription>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={connected 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-slate-50 text-slate-500 border-slate-200'
          }
        >
          {connected ? (
            <><Check className="w-3 h-3 mr-1" strokeWidth={2} /> Connected</>
          ) : (
            <><X className="w-3 h-3 mr-1" strokeWidth={2} /> Not Connected</>
          )}
        </Badge>
      </div>
      {status && (
        <p className="text-sm text-emerald-600 font-medium mt-2">{status}</p>
      )}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const ConnectionsPage = () => {
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connectingBot, setConnectingBot] = useState(false);
  const [sheetId, setSheetId] = useState('');
  
  // Bitrix24 state
  const [bitrixWebhookUrl, setBitrixWebhookUrl] = useState('');
  const [showBitrixUrl, setShowBitrixUrl] = useState(false);
  const [connectingBitrix, setConnectingBitrix] = useState(false);
  const [testingBitrix, setTestingBitrix] = useState(false);
  const [bitrixStatus, setBitrixStatus] = useState({ connected: false });

  useEffect(() => {
    fetchIntegrations();
    fetchBitrixStatus();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in" data-testid="connections-page">
      <div>
        <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">Connections</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your integrations with external services</p>
      </div>

      <div className="grid gap-4">
        {/* Telegram Bot */}
        <ConnectionCard
          title="Telegram Bot"
          description="Connect your Telegram bot to receive and respond to messages"
          icon={Bot}
          iconBg="bg-blue-100"
          connected={integrations?.telegram?.connected}
          status={integrations?.telegram?.bot_username 
            ? `@${integrations.telegram.bot_username}` 
            : null}
          testId="telegram-connection"
        >
          {integrations?.telegram?.connected ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Zap className="w-4 h-4" strokeWidth={2} />
                  <span className="font-medium text-sm">Bot is active and receiving messages</span>
                </div>
                {integrations.telegram.last_webhook_at && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Last webhook: {new Date(integrations.telegram.last_webhook_at).toLocaleString()}
                  </p>
                )}
              </div>
              <Button 
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={disconnectTelegramBot}
                data-testid="disconnect-bot-btn"
              >
                Disconnect Bot
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="botToken" className="text-slate-700 text-sm">Bot Token</Label>
                <div className="relative">
                  <Input
                    id="botToken"
                    type={showToken ? "text" : "password"}
                    placeholder="Enter your bot token from @BotFather"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="pr-10 h-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    data-testid="bot-token-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showToken ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Get your token from{' '}
                  <a 
                    href="https://t.me/BotFather" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    @BotFather <ExternalLink className="w-3 h-3 inline" strokeWidth={1.75} />
                  </a>
                </p>
              </div>
              <Button 
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={connectTelegramBot}
                disabled={connectingBot}
                data-testid="connect-bot-btn"
              >
                {connectingBot && <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />}
                Connect Bot
              </Button>
            </div>
          )}
        </ConnectionCard>

        {/* Bitrix24 */}
        <ConnectionCard
          title="Bitrix24 CRM"
          description="Sync leads and contacts with your Bitrix24 account"
          icon={Link2}
          iconBg="bg-indigo-100"
          connected={integrations?.bitrix?.connected}
          testId="bitrix-connection"
        >
          <div className="space-y-3">
            {integrations?.bitrix?.is_demo && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                  <span className="font-medium text-sm">Running in Demo Mode</span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Leads are stored locally. Connect your Bitrix24 account for full CRM sync.
                </p>
              </div>
            )}
            <Button variant="outline" size="sm" disabled className="text-slate-500" data-testid="connect-bitrix-btn">
              <Link2 className="w-4 h-4 mr-2" strokeWidth={1.75} />
              Connect Bitrix24 (Coming Soon)
            </Button>
          </div>
        </ConnectionCard>

        {/* Google Sheets */}
        <ConnectionCard
          title="Google Sheets"
          description="Fallback option to store leads in a Google Sheet"
          icon={FileSpreadsheet}
          iconBg="bg-green-100"
          connected={integrations?.google_sheets?.connected}
          testId="sheets-connection"
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sheetId" className="text-slate-700 text-sm">Sheet ID</Label>
              <Input
                id="sheetId"
                placeholder="Enter your Google Sheet ID"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                disabled
                className="h-9 border-slate-200"
                data-testid="sheet-id-input"
              />
              <p className="text-xs text-slate-500">
                Find the Sheet ID in your Google Sheets URL
              </p>
            </div>
            <Button variant="outline" size="sm" disabled className="text-slate-500" data-testid="connect-sheets-btn">
              <FileSpreadsheet className="w-4 h-4 mr-2" strokeWidth={1.75} />
              Connect Sheet (Coming Soon)
            </Button>
          </div>
        </ConnectionCard>
      </div>
    </div>
  );
};

export default ConnectionsPage;
