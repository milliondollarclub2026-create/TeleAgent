import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
  Radio,
  Search,
  ChevronDown,
  ChevronUp,
  Megaphone,
  BookOpen,
  FolderSync,
  UserCircle2
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

// Telegram icon for prebuilt cards
const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1.01.54-1.45.53-.48-.01-1.39-.27-2.07-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.38-3.61 3.99-1.66 4.83-1.95 5.37-1.96.12 0 .38.03.55.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
  </svg>
);

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

// Prebuilt AI Employees with Uzbek market personalities
const prebuiltEmployees = [
  {
    id: 'prebuilt-sales',
    name: 'Jasur',
    role: 'the Sales Agent',
    description: 'Jasur handles customer conversations on Telegram, qualifies leads based on purchase intent, collects contact information, and never misses a sales opportunity. He speaks Uzbek and Russian fluently.',
    icon: Megaphone,
    integration: 'telegram',
    integrationName: 'Telegram',
    color: 'bg-slate-100',
    iconColor: 'text-slate-600',
    type: 'sales'
  },
  {
    id: 'prebuilt-faq',
    name: 'Nilufar',
    role: 'the FAQ Specialist',
    description: 'Nilufar answers customer questions instantly using your knowledge base. She handles common inquiries about products, pricing, delivery, and policies, freeing your team for complex issues.',
    icon: BookOpen,
    integration: 'telegram',
    integrationName: 'Telegram',
    color: 'bg-slate-100',
    iconColor: 'text-slate-600',
    type: 'faq'
  },
  {
    id: 'prebuilt-crm',
    name: 'Bobur',
    role: 'the CRM Manager',
    description: 'Bobur syncs your leads to Bitrix24 CRM automatically. He updates contact info, tracks lead status, and ensures no customer falls through the cracks. Integrates seamlessly with your existing workflow.',
    icon: FolderSync,
    integration: 'bitrix',
    integrationName: 'Bitrix24',
    color: 'bg-slate-100',
    iconColor: 'text-slate-600',
    type: 'crm'
  }
];

// Storage key for hired prebuilt employees
const HIRED_PREBUILT_KEY = 'hired_prebuilt_employees';

const AgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [hiredPrebuilt, setHiredPrebuilt] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
    // Load hired prebuilt employees from localStorage
    const savedHired = localStorage.getItem(HIRED_PREBUILT_KEY);
    if (savedHired) {
      try {
        setHiredPrebuilt(JSON.parse(savedHired));
      } catch (e) {
        console.error('Failed to parse hired prebuilt:', e);
      }
    }
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
      toast.success('AI Employee deleted');
      fetchAgents();
    } catch (error) {
      toast.error('Failed to delete AI Employee');
    } finally {
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleHirePrebuilt = (prebuilt) => {
    // Check if already hired
    if (!hiredPrebuilt.includes(prebuilt.id)) {
      const newHired = [...hiredPrebuilt, prebuilt.id];
      setHiredPrebuilt(newHired);
      localStorage.setItem(HIRED_PREBUILT_KEY, JSON.stringify(newHired));
      toast.success(`${prebuilt.name} has joined your team!`);
    }

    // CRM agent goes directly to standalone CRM Chat page
    if (prebuilt.type === 'crm') {
      navigate('/app/crm');
      return;
    }
    // Other prebuilt types navigate to create new agent
    navigate('/app/agents/new', { state: { prebuiltType: prebuilt.type } });
  };

  const handleFirePrebuilt = (prebuilt) => {
    const newHired = hiredPrebuilt.filter(id => id !== prebuilt.id);
    setHiredPrebuilt(newHired);
    localStorage.setItem(HIRED_PREBUILT_KEY, JSON.stringify(newHired));
    toast.success(`${prebuilt.name} has been removed from your team`);
  };

  // Get hired prebuilt employee objects
  const hiredPrebuiltEmployees = prebuiltEmployees.filter(emp => hiredPrebuilt.includes(emp.id));
  const availablePrebuiltEmployees = prebuiltEmployees.filter(emp => !hiredPrebuilt.includes(emp.id));

  // Filter available (not hired) prebuilt employees based on search
  const filteredPrebuilt = availablePrebuiltEmployees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.integrationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="space-y-8" data-testid="agents-page">
      {/* Header - Your AI Employees */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Your AI Employees</h1>
        <Button
          className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm text-white"
          onClick={() => navigate('/app/agents/new')}
          data-testid="create-agent-btn"
        >
          <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
          Create AI Employee
        </Button>
      </div>

      {/* Your AI Employees Section */}
      {agents.length === 0 && hiredPrebuiltEmployees.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4" data-testid="agents-empty-state">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <UserCircle2 className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-[15px] font-medium text-slate-900 mb-1">No AI employees yet</h2>
          <p className="text-[13px] text-slate-500 text-center max-w-sm">
            Create your first AI employee or hire a prebuilt one below
          </p>
        </div>
      ) : (
        /* Agents Grid - includes both user-created and hired prebuilt */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Hired Prebuilt Employees */}
          {hiredPrebuiltEmployees.map((employee, index) => {
            const Icon = employee.icon;
            return (
              <Card
                key={employee.id}
                className="bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200 cursor-pointer group relative"
                onClick={() => employee.type === 'crm' ? navigate('/app/crm') : navigate('/app/agents/new', { state: { prebuiltType: employee.type } })}
                data-testid={`hired-${employee.id}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Top Right: Hired Badge (default) / Menu (on hover) */}
                <div className="absolute top-4 right-4 z-10">
                  {/* Hired Badge - visible by default, hidden on hover */}
                  <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium px-2 py-0.5 gap-1 hover:bg-emerald-50 cursor-default opacity-100 group-hover:opacity-0 transition-opacity duration-150">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Hired
                  </Badge>
                  {/* Menu Button - hidden by default, visible on hover */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-slate-200/50 absolute top-0 right-0"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); employee.type === 'crm' ? navigate('/app/crm') : navigate('/app/agents/new', { state: { prebuiltType: employee.type } }); }}
                        className="gap-2.5 text-[13px]"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2.5 text-[13px] text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleFirePrebuilt(employee); }}
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardContent className="p-5">
                  {/* Header - Icon only, no menu here anymore */}
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shadow-sm">
                      <Icon className="w-6 h-6 text-slate-600" strokeWidth={1.75} />
                    </div>
                  </div>

                  {/* Name & Status */}
                  <div className="mb-3">
                    <h3 className="font-semibold text-slate-900 text-[15px] truncate group-hover:text-slate-700 transition-colors mb-1">
                      {employee.name}
                    </h3>
                    <p className="text-[12px] text-slate-500 mb-2">{employee.role}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {employee.integration === 'telegram' ? (
                        <Badge className="bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                          <TelegramIcon className="w-3 h-3" />
                          Telegram
                        </Badge>
                      ) : (
                        <Badge className="bg-[#FF5722]/10 text-[#FF5722] hover:bg-[#FF5722]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                          <BitrixIcon size="sm" />
                          Bitrix24
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                    {employee.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}

          {/* User-created Agents */}
          {agents.map((agent, index) => (
            <Card
              key={agent.id}
              className="bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/app/agents/${agent.id}`)}
              data-testid={`agent-card-${agent.id}`}
              style={{ animationDelay: `${(hiredPrebuiltEmployees.length + index) * 50}ms` }}
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

      {/* Prebuilt AI Employees Section - only show if there are available employees */}
      {availablePrebuiltEmployees.length > 0 && (
      <div className="pt-6 border-t border-slate-200">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">Prebuilt AI Employees</h2>
          <p className="text-[13px] text-slate-500">
            Get started quickly with these ready-to-use AI employee templates
          </p>
        </div>

{/* Prebuilt Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrebuilt.map((employee) => {
            const Icon = employee.icon;
            const isExpanded = expandedCards[employee.id];

            return (
              <Card
                key={employee.id}
                className="bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200 group"
              >
                <CardContent className="p-5">
                  {/* Header: Icon + Name/Role */}
                  <div className="mb-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                      <Icon className="w-7 h-7 text-slate-600" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-[15px]">{employee.name}</h3>
                    <p className="text-[12px] text-slate-500">{employee.role}</p>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <p className="text-[13px] text-slate-500 leading-relaxed">
                      {employee.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    {employee.integration === 'telegram' ? (
                      <TelegramIcon className="w-[18px] h-[18px] text-[#0088cc]" />
                    ) : (
                      <svg className="w-[18px] h-[18px] text-[#FF5722]" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    <Button
                      onClick={() => handleHirePrebuilt(employee)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-medium h-7 px-3 rounded-md shadow-sm"
                    >
                      Hire
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No results */}
        {filteredPrebuilt.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-[13px] text-slate-500">No employees found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete this AI employee?</AlertDialogTitle>
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
