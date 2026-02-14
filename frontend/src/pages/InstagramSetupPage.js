import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageSquare,
  Zap,
  Globe,
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Instagram icon (standard camera logo)
const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const InstagramSetupPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check for OAuth callback status
  useEffect(() => {
    const oauthStatus = searchParams.get('status');
    if (oauthStatus === 'success') {
      toast.success('Instagram account connected successfully!');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API}/instagram/account`);
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Instagram status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await axios.get(`${API}/instagram/oauth/start`);
      const { oauth_url } = response.data;
      if (oauth_url) {
        window.location.href = oauth_url;
      } else {
        toast.error('Failed to start Instagram connection');
        setConnecting(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start Instagram connection. Make sure Meta App is configured.');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await axios.delete(`${API}/instagram/account`);
      toast.success('Instagram account disconnected');
      setStatus({ connected: false });
    } catch (error) {
      toast.error('Failed to disconnect Instagram');
    } finally {
      setDisconnecting(false);
    }
  };

  // Token expiry warning
  const getTokenExpiryWarning = () => {
    if (!status.token_expires_at) return null;
    const expiresAt = new Date(status.token_expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7 && daysLeft > 0) {
      return `Token expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. It will be refreshed automatically.`;
    }
    if (daysLeft <= 0) {
      return 'Token has expired. Please reconnect your Instagram account.';
    }
    return null;
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" strokeWidth={2} />
      </div>
    );
  }

  const tokenWarning = getTokenExpiryWarning();

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
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
            <InstagramIcon className="w-5.5 h-5.5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Instagram DM</h1>
            <p className="text-sm text-slate-500 mt-0.5">Automate Instagram Direct Messages</p>
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
          {/* Token Expiry Warning */}
          {tokenWarning && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Token Notice</p>
                <p className="text-amber-700 mt-0.5">{tokenWarning}</p>
              </div>
            </div>
          )}

          {/* Status Card */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
                  <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    @{status.username || 'Instagram Connected'}
                  </h2>
                  {status.last_webhook_at && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Last activity: {new Date(status.last_webhook_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Capability Badges */}
              <div className="flex flex-wrap gap-2.5 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-slate-700">DMs</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Receive</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 shadow-sm">
                  <Zap className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-white">AI Replies</span>
                  <span className="text-[10px] text-emerald-100 uppercase tracking-wide">Auto</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-[13px] text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                    >
                      {disconnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Instagram?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your AI agent will stop responding to Instagram DMs. You can reconnect anytime.
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
              <h2 className="font-semibold text-slate-900 text-[15px] mb-2">Connect your Instagram account</h2>
              <p className="text-[13px] text-slate-500 mb-5">
                Authorize LeadRelay to send and receive messages on your Instagram Business account via Meta's secure OAuth.
              </p>

              <Button
                className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium shadow-sm"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connect Instagram
              </Button>
            </div>
          </Card>

          {/* Setup Guide */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-900">Setup Guide</h3>
              <p className="text-xs text-slate-500 mt-0.5">Before connecting, ensure the following</p>
            </div>

            <div className="p-6">
              <div className="relative">
                <div className="absolute left-[11px] top-6 bottom-6 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

                <div className="space-y-5">
                  <div className="flex gap-4 group">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-[11px] font-semibold text-white">1</span>
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        You have an <span className="font-medium text-slate-900">Instagram Business</span> or <span className="font-medium text-slate-900">Creator</span> account
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 group">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-[11px] font-semibold text-white">2</span>
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        Your Instagram is connected to a <span className="font-medium text-slate-900">Facebook Page</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 group">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-[11px] font-semibold text-white">3</span>
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        You have <span className="font-medium text-slate-900">admin access</span> to the Facebook Page
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 group">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13px] text-slate-700 leading-relaxed">
                        Click <span className="font-semibold text-slate-900">Connect Instagram</span> above to authorize
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* What happens after connecting */}
          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">After connecting</p>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-900">Receive DMs instantly</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">Instagram messages forwarded to your AI</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Zap className="w-4 h-4 text-white" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-900">Auto-reply with AI</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">Same sales agent, new channel</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-900">Track & qualify leads</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">Leads from Instagram scored alongside Telegram</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramSetupPage;
