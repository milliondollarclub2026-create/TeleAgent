import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  ArrowLeft,
  Check,
  Loader2,
  ArrowUpRight,
  RefreshCw,
  Users,
  ExternalLink,
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// HubSpot logo SVG
const HubSpotIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.16 5.67V3.39a1.7 1.7 0 0 0 1-1.55 1.7 1.7 0 0 0-1.71-1.71 1.7 1.7 0 0 0-1.71 1.71c0 .67.4 1.25.97 1.52v2.31a5.07 5.07 0 0 0-2.54 1.35l-6.7-5.22a2.04 2.04 0 0 0 .06-.47A2.06 2.06 0 0 0 5.47 0a2.06 2.06 0 0 0-2.06 2.06 2.06 2.06 0 0 0 2.06 2.06c.47 0 .9-.16 1.26-.42l6.58 5.12a5.1 5.1 0 0 0-.56 2.32 5.1 5.1 0 0 0 .7 2.57l-2.13 2.13a1.64 1.64 0 0 0-.48-.08 1.65 1.65 0 0 0-1.65 1.65 1.65 1.65 0 0 0 1.65 1.65 1.65 1.65 0 0 0 1.65-1.65c0-.17-.03-.33-.08-.48l2.1-2.1a5.12 5.12 0 1 0 3.64-8.76zm-.71 7.67a2.57 2.57 0 0 1-2.57-2.57 2.57 2.57 0 0 1 2.57-2.57 2.57 2.57 0 0 1 2.57 2.57 2.57 2.57 0 0 1-2.57 2.57z" />
  </svg>
);

const HubSpotSetupPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = location.state?.returnTo;

  const [status, setStatus] = useState({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchStatus();
    // Handle OAuth redirect results
    if (searchParams.get('success') === 'true') {
      toast.success('HubSpot connected successfully!');
    }
    const error = searchParams.get('error');
    if (error) {
      const messages = {
        missing_params: 'Authorization was incomplete. Please try again.',
        expired: 'Authorization expired. Please try again.',
        invalid_state: 'Invalid authorization request. Please try again.',
        exchange_failed: 'Failed to complete authorization. Please try again.',
        access_denied: 'Authorization was denied. Please try again.',
      };
      toast.error(messages[error] || 'Connection failed. Please try again.');
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API}/hubspot/status`);
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch HubSpot status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await axios.get(`${API}/hubspot/auth-url`);
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start HubSpot authorization');
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await axios.post(`${API}/hubspot/test`);
      if (response.data.ok) {
        toast.success('Connection test successful!');
      } else {
        toast.error(`Test failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error('Test failed. Please try reconnecting.');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.post(`${API}/hubspot/disconnect`);
      toast.success('HubSpot disconnected');
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
            <HubSpotIcon className="w-5 h-5 text-[#FF7A59]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">HubSpot CRM</h1>
            <p className="text-sm text-slate-500 mt-0.5">Contacts, deals & pipelines</p>
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

              {/* Capability Badges */}
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

              {/* Actions */}
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
                      <AlertDialogTitle>Disconnect HubSpot?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Lead syncing will stop. Your existing HubSpot data will not be affected. You can reconnect anytime.
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
              <p className="text-[13px] text-slate-500 mb-5">
                Authorize LeadRelay to sync leads and contacts with your HubSpot account.
              </p>
              <Button
                className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium shadow-sm"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <ExternalLink className="w-4 h-4 mr-2" strokeWidth={1.75} />
                Connect with HubSpot
              </Button>
            </div>
          </Card>

          {/* Setup Guide */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-900">Setup Guide</h3>
              <p className="text-xs text-slate-500 mt-0.5">What happens when you click connect</p>
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
                        You'll be redirected to <span className="font-medium text-slate-900">HubSpot</span> to sign in
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-[11px] font-semibold text-white">2</span>
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        Select your HubSpot account or create a new one
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-[11px] font-semibold text-white">3</span>
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13px] text-slate-700 leading-relaxed mb-2">
                        Authorize LeadRelay to access:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {['Contacts', 'Deals', 'Companies'].map((perm) => (
                          <span key={perm} className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-600 text-[11px] font-medium text-white shadow-sm">
                            <Check className="w-2.5 h-2.5 mr-1" strokeWidth={2.5} />
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        You'll be redirected back automatically
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
                  <p className="text-[12px] text-slate-500 mt-0.5">Hot leads sent to HubSpot instantly</p>
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
  );
};

export default HubSpotSetupPage;
