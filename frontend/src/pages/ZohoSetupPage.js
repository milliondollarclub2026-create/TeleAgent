import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  Check,
  Loader2,
  ArrowUpRight,
  RefreshCw,
  Users,
  ExternalLink,
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Zoho logo SVG
const ZohoIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.6 9.6L1.2 17.4H6l4.4-7.8H5.6zM14 6.6l-5 10.8h4.2l5-10.8H14zM19.6 2.4l-2.8 6h3.6l2.8-6h-3.6z" />
  </svg>
);

const DATACENTERS = [
  { value: 'us', label: 'United States', domain: 'zoho.com' },
  { value: 'eu', label: 'Europe', domain: 'zoho.eu' },
  { value: 'in', label: 'India', domain: 'zoho.in' },
  { value: 'au', label: 'Australia', domain: 'zoho.com.au' },
  { value: 'jp', label: 'Japan', domain: 'zoho.jp' },
];

const ZohoSetupPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = location.state?.returnTo;

  const [status, setStatus] = useState({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [datacenter, setDatacenter] = useState('us');

  useEffect(() => {
    fetchStatus();
    if (searchParams.get('success') === 'true') {
      toast.success('Zoho CRM connected successfully!');
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
      const response = await axios.get(`${API}/zoho/status`);
      setStatus(response.data);
      if (response.data.datacenter) {
        setDatacenter(response.data.datacenter);
      }
    } catch (error) {
      console.error('Failed to fetch Zoho status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await axios.get(`${API}/zoho/auth-url`, { params: { datacenter } });
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start Zoho authorization');
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await axios.post(`${API}/zoho/test`);
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
      await axios.post(`${API}/zoho/disconnect`);
      toast.success('Zoho CRM disconnected');
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
            <ZohoIcon className="w-5 h-5 text-[#E42527]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Zoho CRM</h1>
            <p className="text-sm text-slate-500 mt-0.5">Leads, contacts & deals</p>
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
                  <span className="text-xs font-medium text-white">Leads</span>
                  <span className="text-[10px] text-emerald-100 uppercase tracking-wide">Auto-push</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-slate-700">Contacts</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Sync</span>
                </div>
                {status.datacenter && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <Globe className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-slate-700">
                      {DATACENTERS.find(dc => dc.value === status.datacenter)?.label || status.datacenter}
                    </span>
                  </div>
                )}
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
                      <AlertDialogTitle>Disconnect Zoho CRM?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Lead syncing will stop. Your existing Zoho data will not be affected. You can reconnect anytime.
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

              {/* Datacenter selector */}
              <div className="space-y-1.5 mb-5">
                <Label className="text-slate-700 text-xs font-medium">Zoho datacenter region</Label>
                <Select value={datacenter} onValueChange={setDatacenter}>
                  <SelectTrigger className="h-10 border-slate-200 text-[13px]">
                    <SelectValue placeholder="Select your region" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATACENTERS.map((dc) => (
                      <SelectItem key={dc.value} value={dc.value} className="text-[13px]">
                        {dc.label} ({dc.domain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">Select the region where your Zoho account is hosted</p>
              </div>

              <Button
                className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium shadow-sm"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <ExternalLink className="w-4 h-4 mr-2" strokeWidth={1.75} />
                Connect with Zoho
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
                        Select your <span className="font-medium text-slate-900">datacenter region</span> above
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-[11px] font-semibold text-white">2</span>
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        You'll be redirected to <span className="font-medium text-slate-900">Zoho</span> to sign in
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
                        {['Leads', 'Contacts', 'Deals', 'Settings'].map((perm) => (
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
                  <p className="text-[12px] text-slate-500 mt-0.5">Hot leads sent to Zoho instantly</p>
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

export default ZohoSetupPage;
