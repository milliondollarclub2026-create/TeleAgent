import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Bot,
  Link2,
  Check,
  Loader2
} from 'lucide-react';

// Google Sheets icon (official-style)
const GoogleSheetsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#0F9D58" />
    <rect x="7" y="6" width="10" height="2" rx="0.5" fill="white" />
    <rect x="7" y="10" width="10" height="2" rx="0.5" fill="white" />
    <rect x="7" y="14" width="6" height="2" rx="0.5" fill="white" />
  </svg>
);
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Status indicator component - refined green for light theme
const StatusDot = ({ connected }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-600' : 'bg-slate-300'}`} />
    <span className={`text-xs font-medium ${connected ? 'text-emerald-700' : 'text-slate-500'}`}>
      {connected ? 'Connected' : 'Not connected'}
    </span>
  </div>
);

const ConnectionsPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bitrix24 state
  const [bitrixStatus, setBitrixStatus] = useState({ connected: false });

  // Google Sheets state
  const [gSheetsStatus, setGSheetsStatus] = useState({ connected: false });

  // Helper to get the correct path (works with or without agentId)
  const getConnectionPath = (service) => {
    if (agentId) {
      return `/app/agents/${agentId}/connections/${service}`;
    }
    return `/app/connections/${service}`;
  };

  useEffect(() => {
    fetchIntegrations();
    fetchBitrixStatus();
    fetchGSheetsStatus();
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

  // Google Sheets functions
  const fetchGSheetsStatus = async () => {
    try {
      const response = await axios.get(`${API}/google-sheets/status`);
      setGSheetsStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Google Sheets status:', error);
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
    <div className="space-y-6 animate-fade-in" data-testid="connections-page">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Connections</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage your integrations with external services</p>
      </div>

      {/* Connection Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Telegram Bot Card - Simplified */}
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
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
                    <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-200"
                  onClick={() => navigate(getConnectionPath('telegram'))}
                >
                  Manage
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] text-slate-500">
                  Connect your Telegram bot to start receiving messages
                </p>
                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
                  onClick={() => navigate(getConnectionPath('telegram'))}
                  data-testid="setup-telegram-btn"
                >
                  Connect
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Bitrix24 CRM Card - Simplified */}
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
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
                    <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-200"
                  onClick={() => navigate(getConnectionPath('bitrix'))}
                >
                  Manage
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] text-slate-500">
                  Sync leads and contacts with your CRM
                </p>
                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
                  onClick={() => navigate(getConnectionPath('bitrix'))}
                  data-testid="setup-bitrix-btn"
                >
                  Connect
                </Button>
              </div>
            )}
          </div>
        </Card>

      </div>

      {/* Data Sources Section */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Data Sources</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">Connect external data to power your AI agent</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Google Sheets Card - Simplified, links to setup page */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden" data-testid="gsheets-connection">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <GoogleSheetsIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Google Sheets</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Product catalog & lead tracking</p>
                </div>
              </div>
              <StatusDot connected={gSheetsStatus?.connected} />
            </div>

            {/* Content */}
            {gSheetsStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
                    <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {gSheetsStatus.sheet_title || 'Sheet Connected'}
                    </p>
                    {gSheetsStatus.connected_at && (
                      <p className="text-xs text-slate-500">
                        Since {new Date(gSheetsStatus.connected_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-200"
                  onClick={() => navigate(getConnectionPath('google-sheets'))}
                >
                  Manage
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] text-slate-500">
                  Set up product catalog & lead tracking with your Google Sheet
                </p>
                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
                  onClick={() => navigate(getConnectionPath('google-sheets'))}
                  data-testid="setup-gsheets-btn"
                >
                  Connect
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

    </div>
  );
};

export default ConnectionsPage;
