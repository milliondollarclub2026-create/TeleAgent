import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  User,
  Mail,
  Shield,
  Trash2,
  AlertTriangle,
  Loader2,
  Database,
  LogOut
} from 'lucide-react';
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

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeleteData = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/account/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('All data deleted successfully');
      setDeleteDataDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Account deleted successfully');
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete account');
      setDeleteAccountDialogOpen(false);
      setConfirmText('');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">Settings</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <User className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
              <p className="text-xs text-slate-500">Your account information</p>
            </div>
          </div>
        </div>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-slate-600 text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
              Email
            </Label>
            <Input
              value={user?.email || ''}
              disabled
              className="h-11 bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-600 text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
              Name
            </Label>
            <Input
              value={user?.name || 'User'}
              disabled
              className="h-11 bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-slate-400 pt-2">
            Contact support to update your profile information.
          </p>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Security</h2>
              <p className="text-xs text-slate-500">Authentication and access</p>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Sign out</p>
              <p className="text-xs text-slate-500 mt-0.5">End your current session</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { logout(); navigate('/login'); }}
              className="h-9 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              <LogOut className="w-4 h-4 mr-2" strokeWidth={1.75} />
              Sign out
            </Button>
          </div>
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
                Remove all leads, conversations, documents, and disconnect integrations. Your account will remain active.
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
        if (!open) setConfirmText('');
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
              <div className="mt-4">
                <Label className="text-slate-600 text-xs">
                  Type <span className="font-mono font-semibold text-red-600">DELETE</span> to confirm:
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="mt-2 h-10 border-slate-200 focus:border-red-300 focus:ring-red-200"
                  disabled={loading}
                />
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
              disabled={loading || confirmText !== 'DELETE'}
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
