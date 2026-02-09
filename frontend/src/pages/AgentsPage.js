import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Plus,
  MessageSquare,
  Users,
  MoreVertical,
  Settings,
  Trash2,
  LayoutDashboard,
  Loader2,
  TrendingUp,
  Clock,
  Zap,
  ArrowUpRight,
  Calendar,
  LayoutGrid,
  List,
  Radio
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Generate initials from agent name
const getInitials = (name) => {
  if (!name) return 'A';
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Generate a consistent gradient based on agent name
const getAgentGradient = (name) => {
  const gradients = [
    'from-slate-700 to-slate-900',
    'from-zinc-700 to-zinc-900',
    'from-neutral-700 to-neutral-900',
    'from-stone-700 to-stone-900',
  ];
  if (!name) return gradients[0];
  const index = name.charCodeAt(0) % gradients.length;
  return gradients[index];
};

// Format date to relative or short format
const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Channel icon component
const ChannelIcon = ({ channel, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (channel === 'telegram') {
    return (
      <svg className={`${sizeClasses} text-[#0088cc]`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1.01.54-1.45.53-.48-.01-1.39-.27-2.07-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.38-3.61 3.99-1.66 4.83-1.95 5.37-1.96.12 0 .38.03.55.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
      </svg>
    );
  }

  // Default/future channels
  return <Radio className={`${sizeClasses} text-slate-400`} strokeWidth={2} />;
};

// Bitrix24 icon component
const BitrixIcon = ({ size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <svg className={sizeClasses} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// Get channel display info (hover disabled for non-interactive badges)
const getChannelInfo = (channel) => {
  const channels = {
    telegram: { name: 'Telegram', color: 'bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/10 cursor-default' },
    whatsapp: { name: 'WhatsApp', color: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/10 cursor-default' },
    instagram: { name: 'Instagram', color: 'bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F]/10 cursor-default' },
    messenger: { name: 'Messenger', color: 'bg-[#0084FF]/10 text-[#0084FF] hover:bg-[#0084FF]/10 cursor-default' },
  };
  return channels[channel] || { name: channel, color: 'bg-slate-100 text-slate-600 hover:bg-slate-100 cursor-default' };
};

const AgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'card'
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API}/agents`);
      setAgents(response.data || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (agent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const deleteAgent = async () => {
    if (!agentToDelete) return;
    try {
      await axios.delete(`${API}/agents/${agentToDelete.id}`);
      toast.success('Agent deleted');
      fetchAgents();
    } catch (error) {
      toast.error('Failed to delete agent');
    } finally {
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  // Dropdown menu component to avoid duplication
  const AgentDropdownMenu = ({ agent }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200/50"
        >
          <MoreVertical className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); navigate(`/app/agents/${agent.id}`); }}
          className="gap-2.5 text-[13px]"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); navigate(`/app/agents/${agent.id}/settings`); }}
          className="gap-2.5 text-[13px]"
        >
          <Settings className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2.5 text-[13px] text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={(e) => { e.stopPropagation(); confirmDelete(agent); }}
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" strokeWidth={2} />
      </div>
    );
  }

  // Empty state - Premium and inviting
  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]" data-testid="agents-empty-state">
        <div className="text-center max-w-md">
          {/* Elegant abstract icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl rotate-6" />
            <div className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900 mb-2 tracking-tight">
            Create your first agent
          </h1>
          <p className="text-[14px] text-slate-500 mb-8 leading-relaxed max-w-sm mx-auto">
            Deploy an AI-powered sales agent that handles conversations, qualifies leads, and never sleeps.
          </p>

          <Button
            className="bg-slate-900 hover:bg-slate-800 h-11 px-6 text-[14px] font-medium shadow-sm"
            onClick={() => navigate('/app/agents/new')}
            data-testid="create-first-agent-btn"
          >
            <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
            Create Agent
          </Button>
        </div>
      </div>
    );
  }

  // Agents list
  return (
    <div className="space-y-6" data-testid="agents-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Agents</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} deployed
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="hidden sm:flex items-center border border-slate-200 rounded-lg p-0.5 bg-white">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'card'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          <Button
            className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
            onClick={() => navigate('/app/agents/new')}
            data-testid="create-agent-btn"
          >
            <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
            New Agent
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="grid gap-3">
          {agents.map((agent, index) => (
            <Card
              key={agent.id}
              className="bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200 cursor-pointer group overflow-hidden"
              onClick={() => navigate(`/app/agents/${agent.id}`)}
              data-testid={`agent-card-${agent.id}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Left Section - Avatar & Core Info */}
                  <div className="flex items-center gap-4 p-4 flex-1 min-w-0">
                    {/* Agent Avatar */}
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAgentGradient(agent.name)} flex items-center justify-center shadow-sm flex-shrink-0`}>
                      <span className="text-[14px] font-semibold text-white tracking-wide">
                        {getInitials(agent.name)}
                      </span>
                    </div>

                    {/* Agent Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-[14px] truncate group-hover:text-slate-700 transition-colors">
                          {agent.name}
                        </h3>
                        {agent.status === 'active' ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] font-medium px-1.5 py-0 gap-1 hover:bg-emerald-50 cursor-default">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px] font-medium px-1.5 py-0 hover:bg-slate-100 cursor-default">
                            Inactive
                          </Badge>
                        )}
                      </div>

                      {/* Metadata Row */}
                      <div className="flex items-center gap-2.5 text-[12px] text-slate-500">
                        {agent.channel && (
                          <>
                            <Badge className={`${getChannelInfo(agent.channel).color} border-0 text-[10px] font-medium px-1.5 py-0 gap-1`}>
                              <ChannelIcon channel={agent.channel} size="sm" />
                              {getChannelInfo(agent.channel).name}
                            </Badge>
                          </>
                        )}
                        {agent.bitrix_connected && (
                          <>
                            <Badge className="bg-[#FF5722]/10 text-[#FF5722] hover:bg-[#FF5722]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                              <BitrixIcon size="sm" />
                              Bitrix24
                            </Badge>
                          </>
                        )}
                        {(agent.channel || agent.bitrix_connected) && (
                          <span className="text-slate-300">·</span>
                        )}
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>{agent.conversations_count || 0}</span>
                        </div>
                        <span className="text-slate-300">·</span>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>{agent.leads_count || 0}</span>
                        </div>
                        {agent.created_at && (
                          <>
                            <span className="text-slate-300 hidden sm:inline">·</span>
                            <div className="hidden sm:flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                              <span>{formatDate(agent.created_at)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Stats & Actions */}
                  <div className="hidden md:flex items-center border-l border-slate-100 bg-slate-50/50">
                    {/* Stats Grid */}
                    <div className="flex items-center divide-x divide-slate-100">
                      <div className="px-4 py-3 text-center min-w-[80px]">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <TrendingUp className="w-3 h-3 text-slate-400" strokeWidth={2} />
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Conv.</span>
                        </div>
                        <p className="text-[14px] font-semibold text-slate-900 tabular-nums">
                          {agent.conversion_rate || 0}%
                        </p>
                      </div>
                      <div className="px-4 py-3 text-center min-w-[80px]">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Clock className="w-3 h-3 text-slate-400" strokeWidth={2} />
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Resp.</span>
                        </div>
                        <p className="text-[14px] font-semibold text-slate-900 tabular-nums">
                          {agent.avg_response_time ? `${agent.avg_response_time}s` : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-3 flex items-center">
                      <AgentDropdownMenu agent={agent} />
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="md:hidden flex items-center pr-3">
                    <AgentDropdownMenu agent={agent} />
                  </div>

                  {/* Hover Arrow */}
                  <div className="hidden md:flex items-center pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-4 h-4 text-slate-400" strokeWidth={2} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, index) => (
            <Card
              key={agent.id}
              className="bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/app/agents/${agent.id}`)}
              data-testid={`agent-card-${agent.id}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAgentGradient(agent.name)} flex items-center justify-center shadow-sm`}>
                    <span className="text-[15px] font-semibold text-white tracking-wide">
                      {getInitials(agent.name)}
                    </span>
                  </div>
                  <AgentDropdownMenu agent={agent} />
                </div>

                {/* Name & Status */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-[15px] truncate group-hover:text-slate-700 transition-colors">
                      {agent.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {agent.status === 'active' ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] font-medium px-1.5 py-0 gap-1 hover:bg-emerald-50 cursor-default">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px] font-medium px-1.5 py-0 hover:bg-slate-100 cursor-default">
                        Inactive
                      </Badge>
                    )}
                    {agent.channel && (
                      <Badge className={`${getChannelInfo(agent.channel).color} border-0 text-[10px] font-medium px-1.5 py-0 gap-1`}>
                        <ChannelIcon channel={agent.channel} size="sm" />
                        {getChannelInfo(agent.channel).name}
                      </Badge>
                    )}
                    {agent.bitrix_connected && (
                      <Badge className="bg-[#FF5722]/10 text-[#FF5722] hover:bg-[#FF5722]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                        <BitrixIcon size="sm" />
                        Bitrix24
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <MessageSquare className="w-3 h-3 text-slate-400" strokeWidth={2} />
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Chats</span>
                    </div>
                    <p className="text-[15px] font-semibold text-slate-900 tabular-nums">
                      {agent.conversations_count || 0}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Users className="w-3 h-3 text-slate-400" strokeWidth={2} />
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Leads</span>
                    </div>
                    <p className="text-[15px] font-semibold text-slate-900 tabular-nums">
                      {agent.leads_count || 0}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <TrendingUp className="w-3 h-3 text-slate-400" strokeWidth={2} />
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Conv.</span>
                    </div>
                    <p className="text-[15px] font-semibold text-slate-900 tabular-nums">
                      {agent.conversion_rate || 0}%
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Clock className="w-3 h-3 text-slate-400" strokeWidth={2} />
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Resp.</span>
                    </div>
                    <p className="text-[15px] font-semibold text-slate-900 tabular-nums">
                      {agent.avg_response_time ? `${agent.avg_response_time}s` : '-'}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                {agent.created_at && (
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3" strokeWidth={2} />
                    <span>Created {formatDate(agent.created_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete this agent?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[13px]">
              This will permanently delete "{agentToDelete?.name}" and all associated data including conversations and leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-[13px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white text-[13px]"
              onClick={deleteAgent}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgentsPage;
