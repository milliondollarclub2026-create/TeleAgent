import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Settings,
  Database,
  Trash2,
  AlertTriangle,
  Loader2,
  User,
  ChevronRight,
  Shield,
  Sparkles,
  Image,
  Cpu,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', description: 'Best overall quality' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and affordable' },
  { value: 'gpt-4.1', label: 'GPT-4.1', provider: 'OpenAI', description: 'Strong multilingual support' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'OpenAI', description: 'Affordable multilingual' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Strong reasoning' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'Anthropic', description: 'Fast and affordable' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Excellent multilingual' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Budget multilingual' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'Google', description: 'Ultra-fast responses' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Google', description: 'High quality' },
];

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(false);


  // AI Capabilities state
  const [imageResponsesEnabled, setImageResponsesEnabled] = useState(false);
  const [savingImageToggle, setSavingImageToggle] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [salesModel, setSalesModel] = useState('gpt-4o');
  const [savingModel, setSavingModel] = useState(false);

  // Fetch config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setImageResponsesEnabled(response.data.image_responses_enabled || false);
        const returnedModel = response.data.sales_model || 'gpt-4o';
        const validModels = MODEL_OPTIONS.map(m => m.value);
        setSalesModel(validModels.includes(returnedModel) ? returnedModel : 'gpt-4o');
      } catch (error) {
        console.error('Failed to fetch config:', error);
      } finally {
        setLoadingConfig(false);
      }
    };
    if (token) {
      fetchConfig();
    }
  }, [token]);

  const handleImageResponsesToggle = async (enabled) => {
    setSavingImageToggle(true);
    const previousValue = imageResponsesEnabled;
    setImageResponsesEnabled(enabled); // Optimistic update

    try {
      await axios.put(`${API_URL}/api/config`, {
        image_responses_enabled: enabled
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(enabled ? 'Image responses enabled' : 'Image responses disabled');
    } catch (error) {
      setImageResponsesEnabled(previousValue); // Rollback on error
      toast.error('Failed to update setting');
    } finally {
      setSavingImageToggle(false);
    }
  };

  const handleSalesModelChange = async (newModel) => {
    setSavingModel(true);
    const previousModel = salesModel;
    setSalesModel(newModel); // Optimistic update

    try {
      await axios.put(`${API_URL}/api/config`, {
        sales_model: newModel
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Sales model updated to ${MODEL_OPTIONS.find(m => m.value === newModel)?.label || newModel}`);
    } catch (error) {
      setSalesModel(previousModel); // Rollback on error
      toast.error('Failed to update sales model');
    } finally {
      setSavingModel(false);
    }
  };

  const handleDeleteData = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/account/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('All data deleted successfully');
      setDeleteDataDialogOpen(false);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg || String(d)).join(', ')
        : 'Failed to delete data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/account`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword },
      });
      toast.success('Account deleted successfully');
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      const detail = error.response?.data?.detail;
      // Pydantic validation errors return an array of objects — extract the message
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg || String(d)).join(', ')
        : 'Failed to delete account';
      toast.error(msg);
      setDeleteAccountDialogOpen(false);
      setConfirmText('');
      setDeletePassword('');
      setLoading(false);
    }
  };



  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage your preferences and data</p>
      </div>

      {/* AI Capabilities Section */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">AI Capabilities</h2>
              <p className="text-xs text-slate-500">Enhance your AI agent's abilities</p>
            </div>
          </div>
        </div>
        <CardContent className="p-6 space-y-6">
          {/* Sales Model Selector */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Cpu className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Sales Agent Model</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Choose the AI model powering your sales conversations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {savingModel && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              )}
              <Select value={salesModel} onValueChange={handleSalesModelChange} disabled={savingModel || loadingConfig}>
                <SelectTrigger className="w-[200px] h-9 text-[13px] border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model.value} value={model.value} className="text-[13px]">
                      <span>{model.label}</span>
                      <span className="text-slate-400 ml-1.5">({model.provider})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Image Responses Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Image className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Image Responses</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Allow your AI to send product images to customers via Telegram
                </p>
                {imageResponsesEnabled && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Upload images in Knowledge Base
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {savingImageToggle && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              )}
              <Switch
                checked={imageResponsesEnabled}
                onCheckedChange={handleImageResponsesToggle}
                disabled={savingImageToggle || loadingConfig}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security Section */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Privacy & Security</h2>
              <p className="text-xs text-slate-500">Manage your privacy settings</p>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <button
            onClick={() => window.open('/privacy', '_blank')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <p className="text-sm font-medium text-slate-900">Privacy Policy</p>
            <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => window.open('/terms', '_blank')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <p className="text-sm font-medium text-slate-900">Terms of Service</p>
            <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          </button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-white border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-red-900">Danger Zone</h2>
              <p className="text-xs text-red-600">Irreversible actions</p>
            </div>
          </div>
        </div>
        <CardContent className="p-6 space-y-6">
          {/* Delete Data */}
          <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                <p className="text-sm font-medium text-slate-900">Delete all data</p>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Remove all leads, conversations, documents, CRM synced data, dashboards, and disconnect integrations. Your account will remain active.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDataDialogOpen(true)}
              className="h-9 border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.75} />
              Delete Data
            </Button>
          </div>

          {/* Delete Account */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                <p className="text-sm font-medium text-slate-900">Delete account</p>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAccountDialogOpen(true)}
              className="h-9 bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.75} />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Data Dialog */}
      <AlertDialog open={deleteDataDialogOpen} onOpenChange={setDeleteDataDialogOpen}>
        <AlertDialogContent className="sm:max-w-[440px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <Database className="w-5 h-5 text-red-500" strokeWidth={1.75} />
              Delete all data?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[13px] leading-relaxed">
              This will permanently delete all your:
              <ul className="mt-2 space-y-1 text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-400" />
                  Leads and customer data
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-400" />
                  Conversations and messages
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-400" />
                  Knowledge base documents
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-400" />
                  CRM synced data and dashboards
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-400" />
                  Integration connections
                </li>
              </ul>
              <p className="mt-3 text-slate-500">Your account will remain active.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-[13px]" disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white text-[13px]"
              onClick={handleDeleteData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete All Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteAccountDialogOpen} onOpenChange={(open) => {
        setDeleteAccountDialogOpen(open);
        if (!open) { setConfirmText(''); setDeletePassword(''); }
      }}>
        <AlertDialogContent className="sm:max-w-[440px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.75} />
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[13px] leading-relaxed">
              <p className="font-medium text-red-600 mb-2">
                This action is permanent and cannot be undone.
              </p>
              <p>
                Your account, all data, agents, leads, conversations, and integrations will be permanently deleted.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-slate-600 text-xs">Enter your password:</Label>
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your current password"
                    className="mt-1.5 h-10 border-slate-200 focus:border-red-300 focus:ring-red-200"
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label className="text-slate-600 text-xs">
                    Type <span className="font-mono font-semibold text-red-600">DELETE</span> to confirm:
                  </Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="mt-1.5 h-10 border-slate-200 focus:border-red-300 focus:ring-red-200"
                    disabled={loading}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-[13px]" disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleDeleteAccount}
              disabled={loading || confirmText !== 'DELETE' || !deletePassword}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Permanently Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
