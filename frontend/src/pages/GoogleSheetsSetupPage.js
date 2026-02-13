import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  BookOpen,
  FileSpreadsheet,
  Zap,
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

const GoogleSheetsSetupPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();

  // State
  const [serviceEmail, setServiceEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetchServiceEmail();
    fetchStatus();
  }, []);

  const fetchServiceEmail = async () => {
    try {
      const response = await axios.get(`${API}/google-sheets/service-email`);
      setServiceEmail(response.data.email || '');
    } catch (error) {
      console.error('Failed to fetch service email:', error);
    } finally {
      setLoadingEmail(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API}/google-sheets/status`);
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Google Sheets status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(serviceEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleConnect = async () => {
    if (!sheetUrl.trim()) {
      toast.error('Please paste your Google Sheet link');
      return;
    }

    setConnecting(true);
    try {
      const response = await axios.post(`${API}/google-sheets/connect`, {
        sheet_url: sheetUrl,
      });
      toast.success(response.data.message || 'Google Sheet connected!');
      setSheetUrl('');
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect. Make sure you shared the sheet with our email as Editor.');
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await axios.post(`${API}/google-sheets/test`);
      if (response.data.ok) {
        toast.success(response.data.message || 'Connection test passed!');
      } else {
        toast.error(response.data.message || 'Connection test failed');
      }
    } catch (error) {
      toast.error('Test failed. Check your sheet sharing settings.');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.post(`${API}/google-sheets/disconnect`);
      toast.success('Google Sheets disconnected');
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
        onClick={() => navigate(agentId ? `/app/agents/${agentId}/connections` : '/app/connections')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.75} />
        Back to Connections
      </button>

      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <GoogleSheetsIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Google Sheets</h1>
            <p className="text-sm text-slate-500 mt-0.5">Connect your spreadsheet for product data and lead tracking</p>
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
                  <h2 className="font-semibold text-slate-900">
                    {status.sheet_title || 'Sheet Connected'}
                  </h2>
                  {status.connected_at && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Connected {new Date(status.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Capability Badges */}
              <div className="flex flex-wrap gap-2.5 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-slate-700">Product Data</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Read</span>
                </div>
                {status.has_write && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 shadow-sm">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-white">Lead Tracking</span>
                    <span className="text-[10px] text-emerald-100 uppercase tracking-wide">Write</span>
                  </div>
                )}
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
                      <AlertDialogTitle>Disconnect Google Sheets?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your AI agent will no longer be able to read product data or track leads in this sheet. You can reconnect anytime.
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
          {/* Setup Guide Card - Step 1 */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-[12px] font-semibold text-white">1</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Share your sheet with LeadRelay</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Grant editor access to sync data</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Email Copy Field - Premium style */}
              <div className="mb-6">
                <p className="text-[13px] text-slate-600 mb-3">
                  Add this email as an <span className="font-semibold text-slate-900">Editor</span> on your Google Sheet:
                </p>
                {loadingEmail ? (
                  <div className="h-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-0 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <p className="text-[13px] text-slate-800 font-mono truncate select-all font-medium">
                        {serviceEmail}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyEmail}
                      className="flex items-center gap-2 px-4 py-3 border-l border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                          <span className="text-[13px] font-medium text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" strokeWidth={1.75} />
                          <span className="text-[13px] font-medium">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Steps Timeline */}
              <div className="relative">
                <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-slate-600">1</span>
                    </div>
                    <p className="text-[13px] text-slate-600 pt-0.5">Open your Google Sheet</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-slate-600">2</span>
                    </div>
                    <p className="text-[13px] text-slate-600 pt-0.5">Click <span className="font-medium text-slate-900">Share</span> (top right corner)</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-slate-600">3</span>
                    </div>
                    <p className="text-[13px] text-slate-600 pt-0.5">Paste the email above into <span className="font-medium text-slate-900">"Add people"</span></p>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-slate-600">4</span>
                    </div>
                    <p className="text-[13px] text-slate-600 pt-0.5">
                      Set role to <span className="inline-flex items-center ml-1 px-2 py-0.5 rounded bg-emerald-600 text-[11px] font-medium text-white shadow-sm">Editor</span>
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-[#0F9D58] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                    <p className="text-[13px] text-slate-600 pt-0.5">Uncheck "Notify people" and click <span className="font-medium text-slate-900">Send</span></p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 2: Paste Link */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-[12px] font-semibold text-white">2</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Paste your sheet link</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Connect your spreadsheet to LeadRelay</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-1.5 mb-4">
                <Label className="text-slate-700 text-xs font-medium">Sheet URL</Label>
                <Input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="h-11 text-[13px] border-slate-200 focus:border-[#0F9D58] focus:ring-[#0F9D58]"
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
                <p className="text-[11px] text-slate-400">Paste the full URL from your browser's address bar</p>
              </div>

              <Button
                className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium shadow-sm"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connect Sheet
              </Button>
            </div>
          </Card>

          {/* What happens - Refined info section */}
          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">After connecting</p>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0F9D58]/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-[#0F9D58]" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-900">Product catalog sync</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">First tab becomes your AI's knowledge</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileSpreadsheet className="w-4 h-4 text-white" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-900">Automatic lead tracking</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">"Leads" tab created for you</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-900">Real-time updates</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">New leads saved as they come in</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleSheetsSetupPage;
