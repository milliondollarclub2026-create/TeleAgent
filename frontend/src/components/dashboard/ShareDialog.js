import React, { useState, useEffect, useCallback } from 'react';
import { Share2, Copy, Check, Trash2, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';

const EXPIRY_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export default function ShareDialog({ api }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [expiryDays, setExpiryDays] = useState(30);
  const [copiedId, setCopiedId] = useState(null);

  const loadShares = useCallback(async () => {
    if (!api?.listShares) return;
    setLoading(true);
    const { data } = await api.listShares();
    setShares(data?.shares || []);
    setLoading(false);
  }, [api]);

  useEffect(() => {
    if (open) loadShares();
  }, [open, loadShares]);

  const handleCreate = async () => {
    setCreating(true);
    const { data, error } = await api.createShare({
      label: label.trim() || undefined,
      expires_days: expiryDays,
    });
    setCreating(false);

    if (!error && data) {
      toast.success('Share link created');
      setLabel('');
      await copyToClipboard(data.url, data.id);
      loadShares();
    }
  };

  const handleRevoke = async (shareId) => {
    const { error } = await api.revokeShare(shareId);
    if (!error) {
      toast.success('Link revoked');
      setShares(prev => prev.filter(s => s.id !== shareId));
    }
  };

  const copyToClipboard = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const formatExpiry = (expiresAt) => {
    const d = new Date(expiresAt);
    const now = new Date();
    const days = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">
          <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
          Share
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Dashboard</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Create new link */}
          <div className="space-y-3">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Link label (optional)"
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">Expires in</span>
              <div className="flex gap-1.5">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExpiryDays(opt.value)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      expiryDays === opt.value
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-sm"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />
              ) : (
                <Link2 className="w-4 h-4 mr-2" strokeWidth={2} />
              )}
              Create Share Link
            </Button>
          </div>

          {/* Active links */}
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" strokeWidth={2} />
            </div>
          ) : shares.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Active links</p>
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between gap-2 p-2.5 border border-slate-200 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {share.label || 'Shared dashboard'}
                    </p>
                    <p className="text-[11px] text-slate-400">{formatExpiry(share.expires_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(share.url, share.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
                      title="Copy link"
                    >
                      {copiedId === share.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                      )}
                    </button>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors"
                      title="Revoke link"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">No active share links</p>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            Anyone with the link can view live dashboard data. Revoke anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
