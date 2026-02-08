import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Bot, 
  LinkIcon, 
  FileSpreadsheet, 
  Check, 
  X, 
  Loader2,
  ExternalLink,
  AlertCircle
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
  children,
  testId
}) => (
  <Card className="card-hover" data-testid={testId}>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            connected ? 'bg-emerald-500/20' : 'bg-muted'
          }`}>
            <Icon className={`w-6 h-6 ${connected ? 'text-emerald-500' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <CardTitle className="text-lg font-['Manrope']">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={connected 
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
            : 'bg-muted text-muted-foreground'
          }
        >
          {connected ? (
            <><Check className="w-3 h-3 mr-1" /> Connected</>
          ) : (
            <><X className="w-3 h-3 mr-1" /> Not Connected</>
          )}
        </Badge>
      </div>
      {status && (
        <p className="text-sm text-muted-foreground mt-2">{status}</p>
      )}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const ConnectionsPage = () => {
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [botToken, setBotToken] = useState('');
  const [connectingBot, setConnectingBot] = useState(false);
  const [sheetId, setSheetId] = useState('');

  useEffect(() => {
    fetchIntegrations();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" data-testid="connections-page">
      <div>
        <h1 className="text-3xl font-bold font-['Manrope'] tracking-tight">Connections</h1>
        <p className="text-muted-foreground mt-1">
          Manage your integrations with external services
        </p>
      </div>

      <div className="grid gap-6">
        {/* Telegram Bot */}
        <ConnectionCard
          title="Telegram Bot"
          description="Connect your Telegram bot to receive and respond to messages"
          icon={Bot}
          connected={integrations?.telegram?.connected}
          status={integrations?.telegram?.bot_username 
            ? `@${integrations.telegram.bot_username}` 
            : null}
          testId="telegram-connection"
        >
          {integrations?.telegram?.connected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Bot is active and receiving messages</span>
                </div>
                {integrations.telegram.last_webhook_at && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Last webhook: {new Date(integrations.telegram.last_webhook_at).toLocaleString()}
                  </p>
                )}
              </div>
              <Button 
                variant="destructive" 
                onClick={disconnectTelegramBot}
                data-testid="disconnect-bot-btn"
              >
                Disconnect Bot
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="botToken">Bot Token</Label>
                <Input
                  id="botToken"
                  placeholder="Enter your bot token from @BotFather"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  data-testid="bot-token-input"
                />
                <p className="text-xs text-muted-foreground">
                  Get your token from{' '}
                  <a 
                    href="https://t.me/BotFather" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @BotFather <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>
              <Button 
                onClick={connectTelegramBot}
                disabled={connectingBot}
                data-testid="connect-bot-btn"
              >
                {connectingBot && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connect Bot
              </Button>
            </div>
          )}
        </ConnectionCard>

        {/* Bitrix24 */}
        <ConnectionCard
          title="Bitrix24 CRM"
          description="Sync leads and contacts with your Bitrix24 account"
          icon={LinkIcon}
          connected={integrations?.bitrix?.connected}
          testId="bitrix-connection"
        >
          <div className="space-y-4">
            {integrations?.bitrix?.is_demo && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Running in Demo Mode</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Leads are stored locally. Connect your Bitrix24 account for full CRM sync.
                </p>
              </div>
            )}
            <Button variant="outline" disabled data-testid="connect-bitrix-btn">
              <LinkIcon className="w-4 h-4 mr-2" />
              Connect Bitrix24 (Coming Soon)
            </Button>
          </div>
        </ConnectionCard>

        {/* Google Sheets */}
        <ConnectionCard
          title="Google Sheets"
          description="Fallback option to store leads in a Google Sheet"
          icon={FileSpreadsheet}
          connected={integrations?.google_sheets?.connected}
          testId="sheets-connection"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheetId">Sheet ID</Label>
              <Input
                id="sheetId"
                placeholder="Enter your Google Sheet ID"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                disabled
                data-testid="sheet-id-input"
              />
              <p className="text-xs text-muted-foreground">
                Find the Sheet ID in your Google Sheets URL
              </p>
            </div>
            <Button variant="outline" disabled data-testid="connect-sheets-btn">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Connect Sheet (Coming Soon)
            </Button>
          </div>
        </ConnectionCard>
      </div>
    </div>
  );
};

export default ConnectionsPage;
