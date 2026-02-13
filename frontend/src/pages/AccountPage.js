import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  User,
  Mail,
  Calendar,
  LogOut,
  Shield,
  ChevronRight,
  Loader2,
  Check,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.split(' ').filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format join date
  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500" data-testid="account-page">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Account</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage your profile and account settings</p>
      </div>

      {/* Profile Card - Hero style */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8">
          <div className="flex items-center gap-5">
            {/* Large Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl">
              <span className="text-2xl font-bold text-white tracking-wide">
                {getInitials(user?.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-white truncate">
                {user?.name || 'User'}
              </h2>
              <p className="text-sm text-slate-300 mt-0.5 truncate">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <span className="text-[10px] font-medium text-emerald-300 uppercase tracking-wide">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid gap-5">
            {/* Email */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-900">Email</p>
                  <p className="text-[12px] text-slate-500">{user?.email || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <Check className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="text-[11px] font-medium">Verified</span>
              </div>
            </div>

            {/* Name */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-900">Display Name</p>
                  <p className="text-[12px] text-slate-500">{user?.name || 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-900">Member Since</p>
                  <p className="text-[12px] text-slate-500">{formatJoinDate(user?.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
        </div>
        <CardContent className="p-0">
          {/* Settings Link */}
          <button
            onClick={() => navigate('/app/settings')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-medium text-slate-900">Settings & Privacy</p>
                <p className="text-[12px] text-slate-500">Data management, preferences</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          </button>

          {/* Connections Link */}
          <button
            onClick={() => navigate('/app/connections')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-medium text-slate-900">Connections</p>
                <p className="text-[12px] text-slate-500">Telegram, Bitrix24, Google Sheets</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          </button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <LogOut className="w-4 h-4 text-red-500" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-slate-900">Sign Out</p>
                <p className="text-[12px] text-slate-500">End your current session</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-9 border-slate-200 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-center text-[11px] text-slate-400">
        Need help? Contact us at support@leadrelay.io
      </p>
    </div>
  );
}
