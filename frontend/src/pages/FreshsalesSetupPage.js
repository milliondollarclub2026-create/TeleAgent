import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  Check,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  Users,
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

// Freshsales logo SVG
const FreshsalesIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5v-3.07c-1.64-.34-3-1.47-3.62-3.07L9.2 10.5c.44 1.3 1.57 2.25 2.8 2.45V8.83c-1.89-.42-3-1.65-3-3.33 0-1.8 1.49-3.25 3.43-3.25.32 0 .63.04.93.11l-.36 1.72c-.18-.04-.37-.06-.57-.06-.93 0-1.68.6-1.68 1.42 0 .83.69 1.34 1.75 1.59V2.5H13v4.35c1.49.42 2.5 1.6 2.5 3.15 0 1.9-1.37 3.3-3.5 3.68v3.82H11zm2-6.5c0-.93-.63-1.55-1.5-1.82v3.57c.98-.25 1.5-.93 1.5-1.75z" />
  </svg>
);

const FreshsalesSetupPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo;

  const [domain, setDomain] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API}/freshsales/status`);
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Freshsales status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleConnect = async () => {
    if (!domain.trim()) {
      toast.error('Please enter your Freshsales domain');
      return;
    }
    if (!apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }

    setConnecting(true);
    try {
      const response = await axios.post(`${API}/freshsales/connect`, {
        domain: domain.trim(),
        api_key: apiKey.trim(),
      });
      toast.success(response.data.message || 'Freshsales connected successfully!');
      setDomain('');
      setApiKey('');
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect. Please check your credentials.');
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await axios.post(`${API}/freshsales/test`);
      if (response.data.ok) {
        toast.success('Connection test successful!');
      } else {
        toast.error(`Test failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error('Test failed. Please check your credentials.');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.post(`${API}/freshsales/disconnect`);
      toast.success('Freshsales disconnected');
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
              <FreshsalesIcon className="w-5 h-5 text-[#F26522]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Freshsales</h1>
              <p className="text-sm text-slate-500 mt-0.5">Contacts & deal tracking</p>
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

                <div className="flex flex-wrap gap-2.5 mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 shadow-sm">
                    <ArrowUpRight className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-white">Contacts</span>
                    <span className="text-[10px] text-emerald-100 uppercase tracking-wide">Auto-push</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-slate-700">Deals</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Sync</span>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-[13px] border-slate-200"
                    onClick={handleTest}
                    disabled={testing}
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
                      >
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Freshsales?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Lead syncing will stop. Your existing Freshsales data will not be affected. You can reconnect anytime.
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

                {/* Domain input */}
                <div className="space-y-1.5 mb-4">
                  <Label className="text-slate-700 text-xs font-medium">Freshsales domain</Label>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 h-10 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-[13px] text-slate-500">
                      https://
                    </span>
                    <Input
                      type="text"
                      placeholder="your-company"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="h-10 rounded-l-none rounded-r-none border-r-0 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    />
                    <span className="inline-flex items-center px-3 h-10 rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 text-[13px] text-slate-500">
                      .freshsales.io
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Your Freshsales subdomain</p>
                </div>

                {/* API Key input */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-slate-700 text-xs font-medium">API Key</Label>
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
                      type={showKey ? 'text' : 'password'}
                      placeholder="Your Freshsales API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-10 pr-10 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">Found in Settings &gt; API Settings in your Freshsales account</p>
                </div>

                <Button
                  className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium shadow-sm"
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect Freshsales
                </Button>
              </div>
            </Card>

            {/* Setup Guide */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Setup Guide</h3>
                  <p className="text-xs text-slate-500 mt-0.5">How to find your API key</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <ShieldCheck className="w-3 h-3 text-slate-500" strokeWidth={2} />
                  <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Admin Required</span>
                </div>
              </div>
              <div className="p-6">
                <div className="relative">
                  <div className="absolute left-[11px] top-6 bottom-6 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">1</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Log in to your <span className="font-medium text-slate-900">Freshsales</span> account
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">2</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Go to <span className="font-medium text-slate-900">Settings</span>
                          <span className="text-slate-400 mx-1.5">&rarr;</span>
                          <span className="font-medium text-slate-900">API Settings</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[11px] font-semibold text-white">3</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Copy your <span className="font-medium text-slate-900">API Key</span> and note your subdomain
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-slate-700 leading-relaxed">
                          Paste your domain and API key above, then click <span className="font-semibold text-emerald-700">Connect Freshsales</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* After Connecting */}
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">After connecting</p>
              <div className="grid gap-4">
                <div className="group flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 group-hover:bg-emerald-600 transition-colors flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">Auto-push qualified leads</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">Hot leads sent to Freshsales instantly</p>
                  </div>
                </div>
                <div className="group flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 group-hover:bg-emerald-600 transition-colors flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">Real-time contact sync</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">Details update as conversations happen</p>
                  </div>
                </div>
                <div className="group flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 group-hover:bg-emerald-600 transition-colors flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-4 h-4 text-white" strokeWidth={1.75} />
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

export default FreshsalesSetupPage;
