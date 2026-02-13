import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  Table,
  Check,
  Copy,
  Loader2,
  BookOpen,
  FileSpreadsheet,
  Zap,
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
        onClick={() => navigate(`/app/agents/${agentId}/connections`)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.75} />
        Back to Connections
      </button>

      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#0F9D58]/10 flex items-center justify-center">
            <Table className="w-5.5 h-5.5 text-[#0F9D58]" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Google Sheets</h1>
            <p className="text-sm text-slate-500 mt-0.5">Connect your spreadsheet for product data and lead tracking</p>
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
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                    <span className="text-xs font-medium text-emerald-700">Lead Tracking</span>
                    <span className="text-[10px] text-emerald-500 uppercase tracking-wide">Write</span>
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
          {/* Step 1: Share with LeadRelay */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-white">1</span>
                </div>
                <h2 className="font-semibold text-slate-900 text-[15px]">Share your sheet with LeadRelay</h2>
              </div>

              <p className="text-[13px] text-slate-500 mb-4">
                Add this email as an <span className="font-medium text-slate-700">Editor</span> on your Google Sheet:
              </p>

              {/* Email Copy Field */}
              <div className="mb-5">
                {loadingEmail ? (
                  <div className="h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="flex-1 px-3.5 py-2.5 min-w-0">
                      <p className="text-[13px] text-slate-700 font-mono truncate select-all">
                        {serviceEmail}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyEmail}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 border-l border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                          <span className="text-xs font-medium text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span className="text-xs font-medium">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs font-medium text-slate-600 mb-2.5">How to do this:</p>
                <ol className="space-y-2 text-[13px] text-slate-500">
                  <li className="flex gap-2.5">
                    <span className="text-slate-400 font-medium shrink-0">1.</span>
                    Open your Google Sheet
                  </li>
                  <li className="flex gap-2.5">
                    <span className="text-slate-400 font-medium shrink-0">2.</span>
                    Click <span className="font-medium text-slate-700">Share</span> (top right)
                  </li>
                  <li className="flex gap-2.5">
                    <span className="text-slate-400 font-medium shrink-0">3.</span>
                    Paste the email above into the <span className="font-medium text-slate-700">"Add people"</span> field
                  </li>
                  <li className="flex gap-2.5">
                    <span className="text-slate-400 font-medium shrink-0">4.</span>
                    Change role from "Viewer" to <span className="font-medium text-slate-700">Editor</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="text-slate-400 font-medium shrink-0">5.</span>
                    Uncheck "Notify people" and click <span className="font-medium text-slate-700">Send</span>
                  </li>
                </ol>
              </div>
            </div>
          </Card>

          {/* Step 2: Paste Link */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-white">2</span>
                </div>
                <h2 className="font-semibold text-slate-900 text-[15px]">Paste your sheet link</h2>
              </div>

              <div className="space-y-1.5 mb-4">
                <Label className="text-slate-700 text-xs font-medium">Sheet URL</Label>
                <Input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="h-10 text-[13px] border-slate-200 focus:border-slate-400 focus:ring-slate-400"
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

          {/* Info Box */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-700 mb-3">What happens when you connect:</p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                <p className="text-[13px] text-slate-500">Your first tab is used as <span className="font-medium text-slate-700">product catalog data</span> for the AI agent</p>
              </div>
              <div className="flex items-start gap-2.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                <p className="text-[13px] text-slate-500">A <span className="font-medium text-slate-700">"Leads" tab</span> is auto-created for lead tracking</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                <p className="text-[13px] text-slate-500">New leads from Telegram are <span className="font-medium text-slate-700">saved in real-time</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleSheetsSetupPage;
