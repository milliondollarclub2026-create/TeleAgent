import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  MessageSquare,
  Users,
  MoreVertical,
  Settings,
  Trash2,
  LayoutDashboard,
  Loader2,
  TrendingUp,
  Clock,
  Calendar,
  Radio,
  UserCircle2,
  X,
  AlertTriangle
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
import AiOrb from '../components/Orb/AiOrb';

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

// Telegram icon for prebuilt cards (paper plane only, no circle) - centered
const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
  </svg>
);

// Google Sheets icon (table/spreadsheet style)
const GoogleSheetsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-7h8v2H8v-2zm0 3h8v2H8v-2zm0-6h4v2H8V10z"/>
  </svg>
);

// Bitrix CRM icon (layers/database style)
const BitrixCRMIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);

// Get channel display info (hover disabled for non-interactive badges)
const getChannelInfo = (channel) => {
  const channels = {
    telegram: { name: 'Telegram', color: 'bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/10 cursor-default' },
    whatsapp: { name: 'WhatsApp', color: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/10 cursor-default' },
    instagram: { name: 'Instagram', color: 'bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/10 cursor-default' },
    messenger: { name: 'Messenger', color: 'bg-[#0084FF]/10 text-[#0084FF] hover:bg-[#0084FF]/10 cursor-default' },
  };
  return channels[channel] || { name: channel, color: 'bg-slate-100 text-slate-600 hover:bg-slate-100 cursor-default' };
};

// Prebuilt AI Employees — specialized team leads
// Each has unique orb colors: [primary, secondary, tertiary]
const prebuiltEmployees = [
  {
    id: 'prebuilt-sales',
    name: 'Jasur',
    role: 'the Sales Team Lead',
    description: 'A team of 6 AI specialists. Routes inquiries, answers FAQs, closes sales, extracts lead data, and records everything to your CRM. Works 24/7 in 20+ languages.',
    teamSize: 6,
    integrations: ['telegram', 'instagram', 'bitrix', 'sheets'], // Multiple integrations
    type: 'sales',
    // Emerald/teal gradient - sales = growth = green
    orbColors: ['#10b981', '#059669', '#14b8a6']
  },
  {
    id: 'prebuilt-analytics',
    name: 'Bobur',
    role: 'the Analytics Team Lead',
    description: 'Bobur connects to your CRM to analyze leads, visualize conversion rates, and generate insightful charts. He turns your raw sales data into actionable intelligence with beautiful plots.',
    teamSize: 6,
    integrations: ['bitrix', 'sheets'], // CRM + Google Sheets
    type: 'analytics',
    // Orange/amber gradient - matches Bitrix24 brand
    orbColors: ['#f97316', '#ea580c', '#f59e0b']
  }
];

// Jasur's 6-agent sales team
const jasurTeamMembers = [
  {
    name: 'Aziza',
    role: 'The Qualifier',
    description: 'Routes every message to the right specialist instantly',
    orbColors: ['#06b6d4', '#0891b2', '#22d3ee'],
  },
  {
    name: 'Madina',
    role: 'The Receptionist',
    description: 'Answers FAQs and common questions with your knowledge base',
    orbColors: ['#2dd4bf', '#14b8a6', '#5eead4'],
  },
  {
    name: 'Jasur',
    role: 'The Closer',
    description: 'Handles objections, negotiations, and closing deals',
    orbColors: ['#10b981', '#059669', '#14b8a6'],
  },
  {
    name: 'Sardor',
    role: 'The Analyst',
    description: 'Extracts and saves lead data to your CRM automatically',
    orbColors: ['#f59e0b', '#d97706', '#fbbf24'],
  },
  {
    name: 'Dilnoza',
    role: 'The Scribe',
    description: 'Records conversation summaries for future context',
    orbColors: ['#6366f1', '#4f46e5', '#818cf8'],
  },
  {
    name: 'Farrukh',
    role: 'The Librarian',
    description: 'Makes your documents and catalogs searchable by AI',
    orbColors: ['#94a3b8', '#64748b', '#cbd5e1'],
  },
];

// Bobur's 6-agent analytics team
const boburTeamMembers = [
  {
    name: 'Bobur',
    role: 'The Router',
    description: 'Understands your question and routes it to the right specialist',
    orbColors: ['#f97316', '#ea580c', '#f59e0b'],
  },
  {
    name: 'Farid',
    role: 'The Schema Analyst',
    description: 'Maps your CRM structure — stages, fields, and pipelines',
    orbColors: ['#8b5cf6', '#7c3aed', '#a78bfa'],
  },
  {
    name: 'Dima',
    role: 'The Chart Builder',
    description: 'Turns data into clear, actionable charts and visualizations',
    orbColors: ['#06b6d4', '#0891b2', '#22d3ee'],
  },
  {
    name: 'Anvar',
    role: 'The Data Engineer',
    description: 'Queries and computes metrics from your raw CRM records',
    orbColors: ['#10b981', '#059669', '#34d399'],
  },
  {
    name: 'Nilufar',
    role: 'The Insights Analyst',
    description: 'Spots trends, anomalies, and generates recommendations',
    orbColors: ['#ec4899', '#db2777', '#f472b6'],
  },
  {
    name: 'Karim',
    role: 'The Sync Engine',
    description: 'Keeps your CRM data fresh with real-time ETL sync',
    orbColors: ['#94a3b8', '#64748b', '#cbd5e1'],
  },
];

// Team modal CSS keyframes (injected once)
const teamModalStyles = `
@keyframes teamModalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes teamModalSlideUp {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes teamMemberFadeIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('team-modal-styles')) {
  const style = document.createElement('style');
  style.id = 'team-modal-styles';
  style.textContent = teamModalStyles;
  document.head.appendChild(style);
}

// Team Modal Component — Clean white panel with team roster (generic)
const TeamModal = ({ open, onClose, onHire, teamName, teamLead, members }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={teamName}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[6px]"
        style={{ animation: 'teamModalFadeIn 0.25s ease-out' }}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-[460px] bg-white rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'teamModalSlideUp 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 z-20"
          aria-label="Close"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>

        {/* Team Lead Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <AiOrb size={54} colors={teamLead.orbColors} state="idle" />
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
                {teamName}
              </h2>
              <p className="text-[12.5px] text-slate-500 mt-1 flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  {members.length} specialists
                </span>
                <span className="text-slate-300">·</span>
                <span>Always online</span>
              </p>
            </div>
          </div>
        </div>

        {/* Agent List */}
        <div className="px-3 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.08em] px-3 pb-2">
            Team Members
          </p>
          <div className="space-y-0.5">
            {members.map((member, i) => (
              <div
                key={member.name}
                className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-50/80 transition-all duration-200 cursor-default"
                style={{
                  animation: `teamMemberFadeIn 0.4s cubic-bezier(0.23, 1, 0.32, 1) ${0.1 + i * 0.055}s both`,
                }}
              >
                <div className="flex-shrink-0">
                  <AiOrb size={38} colors={member.orbColors} state="idle" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-900">{member.name}</span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: member.orbColors[0] + '14',
                        color: member.orbColors[1],
                      }}
                    >
                      {member.role}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">
                    {member.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100">
          {onHire ? (
            <Button
              onClick={() => { onHire(); onClose(); }}
              className="w-full h-11 rounded-xl text-[13px] font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 shadow-sm"
            >
              Hire {teamLead.name}'s Team
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[12px] font-medium text-slate-500">
                Team Active · All agents collaborating
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [teamModalOpen, setTeamModalOpen] = useState(null); // null | 'sales' | 'analytics'
  const [hiredPrebuilt, setHiredPrebuilt] = useState([]);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [fireDialogOpen, setFireDialogOpen] = useState(false);
  const [prebuiltToFire, setPrebuiltToFire] = useState(null);
  const [syncActive, setSyncActive] = useState(false);
  const [fireLoading, setFireLoading] = useState(false);
  const [prebuiltToHire, setPrebuiltToHire] = useState(null);
  const navigate = useNavigate();
  const { token, user, updateHiredPrebuilt } = useAuth();

  // Close team modal on Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setTeamModalOpen(null); };
    if (teamModalOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [teamModalOpen]);

  useEffect(() => {
    fetchAgents();
    fetchHiredPrebuilt();
  }, []);

  // Fetch hired prebuilt state from backend config
  const fetchHiredPrebuilt = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      const config = response.data || {};
      const hired = config.hired_prebuilt || [];
      setHiredPrebuilt(hired);
      updateHiredPrebuilt(hired);

      // Migrate from localStorage if backend has no data
      const legacyKey = `hired_prebuilt_employees_${user?.tenant_id || 'default'}`;
      const savedHired = localStorage.getItem(legacyKey);
      if (savedHired && hired.length === 0) {
        try {
          const parsed = JSON.parse(savedHired);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHiredPrebuilt(parsed);
            updateHiredPrebuilt(parsed);
            await axios.put(`${API}/config`, { hired_prebuilt: parsed });
            localStorage.removeItem(legacyKey);
          }
        } catch (e) {
          console.error('Failed to migrate hired prebuilt from localStorage:', e);
        }
      } else if (savedHired && hired.length > 0) {
        // Backend already has data, clean up localStorage
        localStorage.removeItem(legacyKey);
      }
    } catch (e) {
      console.error('Failed to fetch hired prebuilt config:', e);
    }
  };

  // Persist hired prebuilt state to backend + sync AuthContext for sidebar
  const persistHiredPrebuilt = async (newHired) => {
    setHiredPrebuilt(newHired);
    updateHiredPrebuilt(newHired);
    try {
      await axios.put(`${API}/config`, { hired_prebuilt: newHired });
    } catch (e) {
      console.error('Failed to persist hired prebuilt:', e);
    }
  };

  // Sync when agents have prebuilt types (cleanup stale state)
  useEffect(() => {
    if (agents.length > 0 && hiredPrebuilt.length > 0) {
      // Find prebuilt IDs that now have real agents
      const prebuiltIdsToRemove = prebuiltEmployees
        .filter(emp => agents.some(agent => agent.prebuilt_type === emp.type))
        .map(emp => emp.id);

      if (prebuiltIdsToRemove.length > 0) {
        const updatedHired = hiredPrebuilt.filter(id => !prebuiltIdsToRemove.includes(id));
        if (updatedHired.length !== hiredPrebuilt.length) {
          persistHiredPrebuilt(updatedHired);
        }
      }
    }
  }, [agents, hiredPrebuilt]);

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

  const handleHirePrebuilt = async (prebuilt) => {
    // Check if already hired
    if (!hiredPrebuilt.includes(prebuilt.id)) {
      const newHired = [...hiredPrebuilt, prebuilt.id];
      persistHiredPrebuilt(newHired);
      toast.success(`${prebuilt.name} has joined your team!`);
    }

    // Analytics agent: Initialize analytics context and go to CRM Dashboard page
    if (prebuilt.type === 'analytics') {
      // Initialize analytics context in background (don't block navigation)
      try {
        fetch(`${API}/analytics/initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({})
        }).then(response => {
          if (response.ok) {
            console.log('Analytics context initialized');
          }
        }).catch(err => {
          console.warn('Analytics initialization skipped (CRM may not be connected):', err);
        });
      } catch (e) {
        // Silently fail - analytics will work when CRM is connected
      }

      navigate('/app/crm-dashboard');
      return;
    }
    // Other prebuilt types navigate to create new agent
    navigate('/app/agents/new', { state: { prebuiltType: prebuilt.type } });
  };

  const handleFirePrebuilt = async (prebuilt) => {
    // For analytics prebuilt (Bobur), check if sync is active and show confirmation
    if (prebuilt.type === 'analytics') {
      setPrebuiltToFire(prebuilt);
      try {
        const res = await axios.get(`${API}/crm/sync/active`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSyncActive(res.data?.active || false);
      } catch {
        setSyncActive(false);
      }
      setFireDialogOpen(true);
      return;
    }

    // Non-analytics prebuilts fire immediately
    await executeFirePrebuilt(prebuilt);
  };

  const executeFirePrebuilt = async (prebuilt) => {
    const newHired = hiredPrebuilt.filter(id => id !== prebuilt.id);
    persistHiredPrebuilt(newHired);

    // Clear analytics chat history and stop background refresh when Analytics agent is removed
    if (prebuilt.type === 'analytics') {
      localStorage.removeItem(`analytics_chat_history_${user?.tenant_id || 'default'}`);
      localStorage.removeItem(`analytics_pending_question_${user?.tenant_id || 'default'}`);

      // Stop all syncs and analytics context
      try {
        await axios.post(`${API}/crm/sync/stop`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.warn('Sync stop failed:', e);
      }
      try {
        await axios.post(`${API}/analytics/stop`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // Silently fail
      }
    }

    toast.success(`${prebuilt.name} has been removed from your team`);
  };

  // Confirmation flow for hiring Bobur (analytics) — opens dialog
  const confirmHirePrebuilt = (employee) => {
    if (employee.type === 'analytics') {
      setPrebuiltToHire(employee);
      setHireDialogOpen(true);
    } else {
      handleHirePrebuilt(employee);
    }
  };

  // Get prebuilt types that are already associated with real agents
  const prebuiltTypesInUse = new Set(
    agents
      .filter(agent => agent.prebuilt_type)
      .map(agent => agent.prebuilt_type)
  );

  // Get hired prebuilt employee objects - exclude those that are now real agents
  const hiredPrebuiltEmployees = prebuiltEmployees.filter(emp =>
    hiredPrebuilt.includes(emp.id) && !prebuiltTypesInUse.has(emp.type)
  );

  // Available prebuilts - exclude hired AND those that are real agents
  const availablePrebuiltEmployees = prebuiltEmployees.filter(emp =>
    !hiredPrebuilt.includes(emp.id) && !prebuiltTypesInUse.has(emp.type)
  );

  // Helper to get prebuilt config by type
  const getPrebuiltByType = (type) => prebuiltEmployees.find(emp => emp.type === type);

  // Filter available (not hired) prebuilt employees based on search
  const filteredPrebuilt = availablePrebuiltEmployees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.integrations || []).join(' ').toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="space-y-6" data-testid="agents-page">
      {/* Header - Your AI Employees */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Your AI Employees</h1>
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
            Hire a prebuilt AI employee from the selection below to get started
          </p>
        </div>
      ) : (
        /* Agents Grid - includes both user-created and hired prebuilt */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Hired Prebuilt Employees */}
          {hiredPrebuiltEmployees.map((employee, index) => {
            return (
              <Card
                key={employee.id}
                className="bg-white border-slate-200/80 shadow-sm hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12),0_2px_6px_-1px_rgba(0,0,0,0.06)] hover:border-slate-300/80 hover:-translate-y-[2px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer group relative overflow-hidden"
                onClick={() => employee.type === 'analytics' ? navigate('/app/crm-dashboard') : navigate('/app/agents/new', { state: { prebuiltType: employee.type } })}
                data-testid={`hired-${employee.id}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Top Right: Team pill or Hired badge (default) / Menu (on hover) */}
                <div className="absolute top-4 right-4 z-10">
                  {employee.teamSize ? (
                    <Badge className="bg-slate-900 text-white hover:bg-slate-900 cursor-default border-0 text-[12px] font-medium px-3.5 py-1.5 rounded-full shadow-sm opacity-100 group-hover:opacity-0 transition-opacity duration-150 tracking-wide">
                      {employee.teamSize} Agents
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium px-2 py-0.5 gap-1 hover:bg-emerald-50 cursor-default opacity-100 group-hover:opacity-0 transition-opacity duration-150">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Hired
                    </Badge>
                  )}
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
                        onClick={(e) => { e.stopPropagation(); employee.type === 'analytics' ? navigate('/app/crm-dashboard') : navigate('/app/agents/new', { state: { prebuiltType: employee.type } }); }}
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

                <CardContent className="p-5 relative z-[1]">
                  {/* Header - Animated Orb with hover glow */}
                  <div className="mb-4">
                    <AiOrb
                      size={56}
                      colors={employee.orbColors}
                      state="idle"
                      className="group-hover:ai-orb--hover"
                    />
                  </div>

                  {/* Name & Status */}
                  <div className="mb-3">
                    <h3 className="font-semibold text-slate-900 text-[15px] truncate group-hover:text-slate-700 transition-colors mb-1">
                      {employee.name}
                    </h3>
                    <p className="text-[12px] text-slate-500 mb-2">{employee.role}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(employee.integrations || []).includes('telegram') && (
                        <Badge className="bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                          <TelegramIcon className="w-3 h-3" />
                          Telegram
                        </Badge>
                      )}
                      {(employee.integrations || []).includes('instagram') && (
                        <Badge className="bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                          <Radio className="w-3 h-3" strokeWidth={2} />
                          Instagram
                        </Badge>
                      )}
                      {(employee.integrations || []).includes('bitrix') && (
                        <Badge className="bg-[#FF5722]/10 text-[#FF5722] hover:bg-[#FF5722]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                          <BitrixIcon size="sm" />
                          Bitrix24
                        </Badge>
                      )}
                      {(employee.integrations || []).includes('sheets') && (
                        <Badge className="bg-[#4CAF50]/10 text-[#2E7D32] hover:bg-[#4CAF50]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                          <GoogleSheetsIcon className="w-3 h-3" />
                          Sheets
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                    {employee.description}
                  </p>

                  {/* Team & Status Footer */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); setTeamModalOpen(employee.type); }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" strokeWidth={2} />
                      {employee.teamSize} specialists
                    </button>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      Always online
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* User-created Agents (including prebuilt-type agents like Jasur) */}
          {agents.map((agent, index) => {
            // Check if this agent is a prebuilt type (e.g., Jasur)
            const prebuiltConfig = agent.prebuilt_type ? getPrebuiltByType(agent.prebuilt_type) : null;

            return (
              <Card
                key={agent.id}
                className="bg-white border-slate-200/80 shadow-sm hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12),0_2px_6px_-1px_rgba(0,0,0,0.06)] hover:border-slate-300/80 hover:-translate-y-[2px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer group relative overflow-hidden"
                onClick={() => prebuiltConfig
                  ? (prebuiltConfig.type === 'analytics' ? navigate('/app/crm-dashboard') : navigate(`/app/agents/${agent.id}`))
                  : navigate(`/app/agents/${agent.id}`)
                }
                data-testid={`agent-card-${agent.id}`}
                style={{ animationDelay: `${(hiredPrebuiltEmployees.length + index) * 50}ms` }}
              >
                {/* Top Right: Team pill or Status Badge (default) / Menu (on hover) */}
                <div className="absolute top-4 right-4 z-10">
                  {/* Badge - visible by default, hidden on hover */}
                  {prebuiltConfig?.teamSize ? (
                    <Badge className="bg-slate-900 text-white hover:bg-slate-900 cursor-default border-0 text-[12px] font-medium px-3.5 py-1.5 rounded-full shadow-sm opacity-100 group-hover:opacity-0 transition-opacity duration-150 tracking-wide">
                      {prebuiltConfig.teamSize} Agents
                    </Badge>
                  ) : agent.status === 'active' ? (
                    <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium px-2 py-0.5 gap-1 hover:bg-emerald-50 cursor-default opacity-100 group-hover:opacity-0 transition-opacity duration-150">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-medium px-2 py-0.5 hover:bg-slate-100 cursor-default opacity-100 group-hover:opacity-0 transition-opacity duration-150">
                      Inactive
                    </Badge>
                  )}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          prebuiltConfig
                            ? (prebuiltConfig.type === 'analytics' ? navigate('/app/crm-dashboard') : navigate(`/app/agents/${agent.id}`))
                            : navigate(`/app/agents/${agent.id}`);
                        }}
                        className="gap-2.5 text-[13px]"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                        {prebuiltConfig ? 'Open' : 'Dashboard'}
                      </DropdownMenuItem>
                      {!prebuiltConfig && (
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); navigate(`/app/agents/${agent.id}/settings`); }}
                          className="gap-2.5 text-[13px]"
                        >
                          <Settings className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                          Settings
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2.5 text-[13px] text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); confirmDelete(agent); }}
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                        {prebuiltConfig ? 'Remove' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardContent className="p-5 relative z-[1]">
                  {prebuiltConfig ? (
                    /* Prebuilt-type agent (e.g. Jasur) — same layout as hired prebuilt cards */
                    <>
                      {/* Header - Animated Orb */}
                      <div className="mb-4">
                        <AiOrb
                          size={56}
                          colors={prebuiltConfig.orbColors}
                          state="idle"
                          className="group-hover:ai-orb--hover"
                        />
                      </div>

                      {/* Name & Status */}
                      <div className="mb-3">
                        <h3 className="font-semibold text-slate-900 text-[15px] truncate group-hover:text-slate-700 transition-colors mb-1">
                          {prebuiltConfig.name}
                        </h3>
                        <p className="text-[12px] text-slate-500 mb-2">{prebuiltConfig.role}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(prebuiltConfig.integrations || []).includes('telegram') && (
                            <Badge className="bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                              <TelegramIcon className="w-3 h-3" />
                              Telegram
                            </Badge>
                          )}
                          {(prebuiltConfig.integrations || []).includes('instagram') && (
                            <Badge className="bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                              <Radio className="w-3 h-3" strokeWidth={2} />
                              Instagram
                            </Badge>
                          )}
                          {(prebuiltConfig.integrations || []).includes('bitrix') && (
                            <Badge className="bg-[#FF5722]/10 text-[#FF5722] hover:bg-[#FF5722]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                              <BitrixIcon size="sm" />
                              Bitrix24
                            </Badge>
                          )}
                          {(prebuiltConfig.integrations || []).includes('sheets') && (
                            <Badge className="bg-[#4CAF50]/10 text-[#2E7D32] hover:bg-[#4CAF50]/10 cursor-default border-0 text-[10px] font-medium px-1.5 py-0 gap-1">
                              <GoogleSheetsIcon className="w-3 h-3" />
                              Sheets
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                        {prebuiltConfig.description}
                      </p>

                      {/* Team & Status Footer */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); setTeamModalOpen(prebuiltConfig.type); }}
                          className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" strokeWidth={2} />
                          {prebuiltConfig.teamSize} specialists
                        </button>
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                          </span>
                          Always online
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Regular user-created agent — stats layout */
                    <>
                      {/* Header */}
                      <div className="mb-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAgentGradient(agent.name)} flex items-center justify-center shadow-sm`}>
                          <span className="text-[17px] font-semibold text-white tracking-wide">
                            {getInitials(agent.name)}
                          </span>
                        </div>
                      </div>

                      {/* Name & Status */}
                      <div className="mb-3">
                        <h3 className="font-semibold text-slate-900 text-[15px] truncate group-hover:text-slate-700 transition-colors mb-1">
                          {agent.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
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
                            <span className="text-[10px] text-slate-400 font-medium uppercase">Conversion</span>
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
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Prebuilt AI Employees Section - only show if there are available employees */}
      {availablePrebuiltEmployees.length > 0 && (
      <div className="pt-4 border-t border-slate-200">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-1">Prebuilt AI Employees</h2>
          <p className="text-[13px] text-slate-500">
            Get started quickly with these ready-to-use AI employee templates
          </p>
        </div>

{/* Prebuilt Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPrebuilt.map((employee) => {
            return (
              <Card
                key={employee.id}
                className={`bg-white border-slate-200/80 shadow-sm hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12),0_2px_6px_-1px_rgba(0,0,0,0.06)] hover:border-slate-300/80 hover:-translate-y-[2px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group relative overflow-hidden ${employee.teamSize ? 'cursor-pointer' : ''}`}
                onClick={employee.teamSize ? () => setTeamModalOpen(employee.type) : undefined}
              >
                {/* "6 Agents" pill — top right */}
                {employee.teamSize && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-slate-900 text-white hover:bg-slate-900 cursor-default border-0 text-[12px] font-medium px-3.5 py-1.5 rounded-full shadow-sm tracking-wide">
                      {employee.teamSize} Agents
                    </Badge>
                  </div>
                )}

                <CardContent className="p-5 relative z-[1]">
                  {/* Header: Animated Orb + Name/Role */}
                  <div className="mb-4">
                    <div className="mb-3">
                      <AiOrb
                        size={56}
                        colors={employee.orbColors}
                        state="idle"
                        className="group-hover:ai-orb--hover"
                      />
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
                  <div className={`flex items-center ${employee.integrations.length > 0 ? 'justify-between' : 'justify-end'} pt-4 border-t border-slate-100`}>
                    {employee.integrations.length > 0 && (
                      <div className="flex items-center -space-x-1.5">
                        {employee.integrations.map((integration, idx) => {
                          if (integration === 'telegram') {
                            return (
                              <div
                                key={integration}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#29B6F6] to-[#0088cc] flex items-center justify-center shadow-lg shadow-[#0088cc]/30 ring-[2.5px] ring-white"
                                style={{ zIndex: 10 - idx }}
                              >
                                <TelegramIcon className="w-[17px] h-[17px] text-white ml-[1px]" />
                              </div>
                            );
                          }
                          if (integration === 'instagram') {
                            return (
                              <div
                                key={integration}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F56040] to-[#C13584] flex items-center justify-center shadow-lg shadow-[#E1306C]/30 ring-[2.5px] ring-white"
                                style={{ zIndex: 10 - idx }}
                              >
                                <Radio className="w-[17px] h-[17px] text-white" strokeWidth={2} />
                              </div>
                            );
                          }
                          if (integration === 'bitrix') {
                            return (
                              <div
                                key={integration}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF7043] to-[#E64A19] flex items-center justify-center shadow-lg shadow-[#FF5722]/30 ring-[2.5px] ring-white"
                                style={{ zIndex: 10 - idx }}
                              >
                                <BitrixCRMIcon className="w-[17px] h-[17px] text-white" />
                              </div>
                            );
                          }
                          if (integration === 'sheets') {
                            return (
                              <div
                                key={integration}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] flex items-center justify-center shadow-lg shadow-[#4CAF50]/30 ring-[2.5px] ring-white"
                                style={{ zIndex: 10 - idx }}
                              >
                                <GoogleSheetsIcon className="w-[17px] h-[17px] text-white" />
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                    <Button
                      onClick={(e) => { e.stopPropagation(); confirmHirePrebuilt(employee); }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-medium h-8 px-4 rounded-lg shadow-sm"
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

      {/* Jasur's Sales Team Modal */}
      <TeamModal
        open={teamModalOpen === 'sales'}
        onClose={() => setTeamModalOpen(null)}
        teamName="Jasur's Sales Team"
        teamLead={prebuiltEmployees.find(e => e.type === 'sales')}
        members={jasurTeamMembers}
        onHire={
          !hiredPrebuilt.includes('prebuilt-sales') && !prebuiltTypesInUse.has('sales')
            ? () => handleHirePrebuilt(prebuiltEmployees.find(e => e.type === 'sales'))
            : undefined
        }
      />

      {/* Bobur's Analytics Team Modal */}
      <TeamModal
        open={teamModalOpen === 'analytics'}
        onClose={() => setTeamModalOpen(null)}
        teamName="Bobur's Analytics Team"
        teamLead={prebuiltEmployees.find(e => e.type === 'analytics')}
        members={boburTeamMembers}
        onHire={
          !hiredPrebuilt.includes('prebuilt-analytics')
            ? () => confirmHirePrebuilt(prebuiltEmployees.find(e => e.type === 'analytics'))
            : undefined
        }
      />

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

      {/* Hire Bobur Confirmation Dialog */}
      <AlertDialog open={hireDialogOpen} onOpenChange={setHireDialogOpen}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Hire {prebuiltToHire?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[13px]">
              {prebuiltToHire?.name} will connect to your CRM to analyze leads, visualize conversion rates, and generate insightful charts. A new CRM Dashboard will appear in your sidebar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-[13px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[13px]"
              onClick={() => {
                if (prebuiltToHire) {
                  handleHirePrebuilt(prebuiltToHire);
                }
                setHireDialogOpen(false);
                setPrebuiltToHire(null);
              }}
            >
              Hire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fire Bobur confirmation dialog */}
      <AlertDialog open={fireDialogOpen} onOpenChange={(open) => { if (!fireLoading) setFireDialogOpen(open); }}>
        <AlertDialogContent className="sm:max-w-[440px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <Trash2 className="w-5 h-5 text-red-500" strokeWidth={1.75} />
              Remove {prebuiltToFire?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-slate-500 text-[13px] leading-relaxed">
                {syncActive && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="text-amber-800 text-[13px]">
                      CRM data is currently syncing. Removing Bobur will immediately halt the sync and delete all synced CRM data.
                    </p>
                  </div>
                )}
                <p>This will remove the CRM Dashboard and delete all synced CRM data, dashboard configurations, and analytics history.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-[13px]" disabled={fireLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white text-[13px]"
              disabled={fireLoading}
              onClick={async (e) => {
                e.preventDefault();
                setFireLoading(true);
                await executeFirePrebuilt(prebuiltToFire);
                setFireLoading(false);
                setFireDialogOpen(false);
                setPrebuiltToFire(null);
              }}
            >
              {fireLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgentsPage;
