import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  Link2,
  Check,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
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

const BitrixSetupPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();

  // State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API}/bitrix-crm/status`);
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Bitrix status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleConnect = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter your Bitrix24 webhook URL');
      return;
    }

    setConnecting(true);
    try {
      const response = await axios.post(`${API}/bitrix-crm/connect`, {
        webhook_url: webhookUrl,
      });
      toast.success(response.data.message || 'Bitrix24 connected successfully!');
      setWebhookUrl('');
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect. Please check your webhook URL.');
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
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
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.post(`${API}/bitrix-crm/disconnect`);
      toast.success('Bitrix24 disconnected');
      setStatus({ connected: false });
    } catch (error) {
      toast.error('Failed to disconnect');
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
              <Link2 className="w-5.5 h-5.5 text-slate-600" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Bitrix24 CRM</h1>
              <p className="text-sm text-slate-500 mt-0.5">Sync leads and contacts with your CRM</p>
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
                    <h2 className="font-semibold text-slate-900">CRM Connected</h2>
                    {status.connected_at && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Connected {new Date(status.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Capability Badges */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-emerald-700">Leads</span>
                    <span className="text-[10px] text-emerald-500 uppercase tracking-wide">Auto-push</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-slate-700">Contacts</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Sync</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-[13px] border-slate-200"
                    onClick={handleTest}
                    disabled={testing}
                    data-testid="test-bitrix-btn"
                  >
                    {testing && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Test Connection
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-[13px] text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                        data-testid="disconnect-bitrix-btn"
                      >
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Bitrix24?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Lead syncing will stop. Your existing CRM data will not be affected. You can reconnect anytime.
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
                <h2 className="font-semibold text-slate-900 text-[15px] mb-4">Connect your CRM</h2>

                <div className="space-y-1.5 mb-4">
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
                      type={showUrl ? 'text' : 'password'}
                      placeholder="https://your-portal.bitrix24.com/rest/1/xxx/"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="h-10 pr-10 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                      data-testid="bitrix-webhook-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUrl(!showUrl)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">Your inbound webhook URL from Bitrix24</p>
                </div>

                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium shadow-sm"
                  onClick={handleConnect}
                  disabled={connecting}
                  data-testid="connect-bitrix-btn"
                >
                  {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect Bitrix24
                </Button>
              </div>
            </Card>

            {/* Instructions Box */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-700 mb-3">How to get your webhook URL:</p>

              {/* Admin Notice */}
              <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" strokeWidth={1.75} />
                <p className="text-[12px] text-amber-700">Requires <span className="font-medium text-amber-800">admin privileges</span> on your Bitrix24 portal</p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">1.</span>
                  <p className="text-[13px] text-slate-500">
                    Go to <span className="font-medium text-slate-700">Applications</span> → <span className="font-medium text-slate-700">Developer resources</span> → <span className="font-medium text-slate-700">Other</span> → <span className="font-medium text-slate-700">Inbound webhook</span>
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">2.</span>
                  <p className="text-[13px] text-slate-500">
                    Click <span className="font-medium text-slate-700">Inbound webhook</span> → <span className="font-medium text-slate-700">Add</span> and name it (e.g., "LeadRelay Integration")
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">3.</span>
                  <p className="text-[13px] text-slate-500">
                    In <span className="font-medium text-slate-700">Setting up rights</span>, click <span className="font-medium text-slate-700">+ Select</span> and enable: <span className="font-medium text-slate-700">CRM, Lists, Users, Tasks</span>
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">4.</span>
                  <p className="text-[13px] text-slate-500">Click <span className="font-medium text-slate-700">Save</span> and copy the webhook URL</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-medium shrink-0 text-[13px]">5.</span>
                  <p className="text-[13px] text-slate-500">Paste it above and click <span className="font-medium text-slate-700">Connect Bitrix24</span></p>
                </div>
              </div>
            </div>

            {/* What happens box */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-700 mb-3">What happens when you connect:</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <p className="text-[13px] text-slate-500">Qualified leads are <span className="font-medium text-slate-700">automatically pushed</span> to your Bitrix24 CRM</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <p className="text-[13px] text-slate-500">Contact details are <span className="font-medium text-slate-700">synced in real-time</span> as conversations happen</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <p className="text-[13px] text-slate-500">Existing CRM customers are <span className="font-medium text-slate-700">matched automatically</span> to avoid duplicates</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default BitrixSetupPage;
