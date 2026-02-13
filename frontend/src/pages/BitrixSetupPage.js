import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const returnTo = location.state?.returnTo;

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

      // If there's a return URL, verify connection before navigating
      if (returnTo) {
        // Wait a moment for the connection to be fully persisted
        await new Promise(resolve => setTimeout(resolve, 300));

        // Verify the connection is actually saved before navigating
        try {
          const statusCheck = await axios.get(`${API}/bitrix-crm/status`);
          if (statusCheck.data.connected) {
            navigate(returnTo, { state: { fromConnection: true } });
          } else {
            // Connection succeeded but status not yet reflected, wait and retry
            await new Promise(resolve => setTimeout(resolve, 500));
            navigate(returnTo, { state: { fromConnection: true } });
          }
        } catch {
          // Even if status check fails, navigate since connection succeeded
          navigate(returnTo, { state: { fromConnection: true } });
        }
      } else {
        fetchStatus();
      }
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
          onClick={() => navigate(returnTo || (agentId ? `/app/agents/${agentId}/connections` : '/app/connections'))}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.75} />
          {returnTo ? 'Back' : 'Back to Connections'}
        </button>

        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
              <Link2 className="w-5.5 h-5.5 text-slate-600" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bitrix24 CRM</h1>
              <p className="text-sm text-slate-500 mt-0.5">Sync leads and contacts with your CRM</p>
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
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 shadow-sm">
                    <ArrowUpRight className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-white">Leads</span>
                    <span className="text-[10px] text-emerald-100 uppercase tracking-wide">Auto-push</span>
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
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 cursor-help" strokeWidth={2} />
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

            {/* Setup Guide Card */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              {/* Header with admin badge */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Setup Guide</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Follow these steps in your Bitrix24 portal</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <ShieldCheck className="w-3 h-3 text-slate-500" strokeWidth={2} />
                  <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Admin Required</span>
                </div>
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
                          Navigate to <span className="font-medium text-slate-900">Applications</span>
                          <span className="text-slate-400 mx-1.5">→</span>
                          <span className="font-medium text-slate-900">Developer resources</span>
                          <span className="text-slate-400 mx-1.5">→</span>
                          <span className="font-medium text-slate-900">Other</span>
                          <span className="text-slate-400 mx-1.5">→</span>
                          <span className="font-medium text-slate-900">Inbound webhook</span>
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
                          Click <span className="font-medium text-slate-900">Inbound webhook</span>
                          <span className="text-slate-400 mx-1.5">→</span>
                          <span className="font-medium text-slate-900">Add</span> and name it
                          <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-600">LeadRelay Integration</span>
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 group">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">3</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed mb-2">
                          In <span className="font-medium text-slate-900">Setting up rights</span>, click <span className="font-medium text-slate-900">+ Select</span> and enable:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {['CRM', 'Lists', 'Users', 'Tasks'].map((perm) => (
                            <span key={perm} className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-600 text-[11px] font-medium text-white shadow-sm">
                              <Check className="w-2.5 h-2.5 mr-1" strokeWidth={2.5} />
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4 group">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">4</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Click <span className="font-medium text-slate-900">Save</span> and copy the generated webhook URL
                        </p>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex gap-4 group">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Paste your URL above and click <span className="font-semibold text-emerald-700">Connect Bitrix24</span>
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
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <ArrowUpRight className="w-4 h-4 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">Auto-push qualified leads</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">Hot leads sent to CRM instantly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">Real-time contact sync</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">Details update as conversations happen</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">Smart duplicate detection</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">Existing customers matched automatically</p>
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

export default BitrixSetupPage;
