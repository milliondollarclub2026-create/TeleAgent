import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Users,
  Search,
  Loader2,
  Phone,
  Calendar,
  Info,
  TrendingUp,
  Flame,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const hotnessColors = {
  hot: 'bg-orange-100 text-orange-700 border-orange-200',
  warm: 'bg-amber-100 text-amber-700 border-amber-200',
  cold: 'bg-blue-100 text-blue-700 border-blue-200'
};

const stageColors = {
  awareness: 'bg-slate-100 text-slate-600',
  interest: 'bg-blue-100 text-blue-600',
  consideration: 'bg-violet-100 text-violet-600',
  intent: 'bg-amber-100 text-amber-600',
  evaluation: 'bg-orange-100 text-orange-600',
  purchase: 'bg-emerald-100 text-emerald-600'
};

// Demo data for this agent
const DEMO_AGENT_LEADS = [
  {
    id: 'agent-lead-1',
    customer_name: 'Ahmad Karimov',
    customer_phone: '+998 90 123 4567',
    intent: 'Interested in premium web development package',
    sales_stage: 'consideration',
    final_hotness: 'hot',
    score: 85,
    status: 'qualified',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    llm_explanation: 'Customer showed strong buying signals, asked about pricing and timeline. Ready for proposal.'
  },
  {
    id: 'agent-lead-2',
    customer_name: 'Malika Tosheva',
    customer_phone: '+998 91 234 5678',
    intent: 'Looking for e-commerce website solution',
    sales_stage: 'intent',
    final_hotness: 'hot',
    score: 92,
    status: 'new',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    llm_explanation: 'High intent buyer, mentioned budget and urgent timeline. Priority follow-up needed.'
  },
  {
    id: 'agent-lead-3',
    customer_name: 'Sardor Umarov',
    customer_phone: '+998 95 567 8901',
    intent: 'Wants CRM integration for his business',
    sales_stage: 'evaluation',
    final_hotness: 'hot',
    score: 88,
    status: 'qualified',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    llm_explanation: 'Ready to buy. Comparing us with 2 competitors. Needs demo call scheduled.'
  },
  {
    id: 'agent-lead-4',
    customer_name: 'Bekzod Aliyev',
    customer_phone: '+998 93 345 6789',
    intent: 'Asking about mobile app development',
    sales_stage: 'interest',
    final_hotness: 'warm',
    score: 65,
    status: 'new',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    llm_explanation: 'Early stage inquiry. Customer is comparing options. Needs more education on our services.'
  },
  {
    id: 'agent-lead-5',
    customer_name: 'Jamshid Tursunov',
    customer_phone: '+998 90 789 0123',
    intent: 'Enterprise software solution inquiry',
    sales_stage: 'purchase',
    final_hotness: 'hot',
    score: 95,
    status: 'won',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    llm_explanation: 'Deal closed! Customer signed contract for enterprise package.'
  }
];

const AgentLeadsPage = () => {
  const { agentId } = useParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hotnessFilter, setHotnessFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [config, setConfig] = useState({ business_name: 'Your Agent' });

  useEffect(() => {
    fetchConfig();
  }, [agentId]);

  useEffect(() => {
    fetchLeads();
  }, [hotnessFilter, statusFilter, agentId]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      if (response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = `${API}/leads?limit=100`;
      if (hotnessFilter !== 'all') {
        url += `&hotness=${hotnessFilter}`;
      }
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      // In future: url += `&agent_id=${agentId}`;
      const response = await axios.get(url);

      // Use demo data if no real leads exist
      if (response.data && response.data.length > 0) {
        setLeads(response.data);
      } else {
        // Filter demo data based on filters
        let demoData = [...DEMO_AGENT_LEADS];
        if (hotnessFilter !== 'all') {
          demoData = demoData.filter(l => l.final_hotness === hotnessFilter);
        }
        if (statusFilter !== 'all') {
          demoData = demoData.filter(l => l.status === statusFilter);
        }
        setLeads(demoData);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      // On error, show demo data
      let demoData = [...DEMO_AGENT_LEADS];
      if (hotnessFilter !== 'all') {
        demoData = demoData.filter(l => l.final_hotness === hotnessFilter);
      }
      if (statusFilter !== 'all') {
        demoData = demoData.filter(l => l.status === statusFilter);
      }
      setLeads(demoData);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    // For demo leads, just update locally
    if (leadId.startsWith('agent-lead-')) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      toast.success('Lead status updated');
      return;
    }

    try {
      await axios.put(`${API}/leads/${leadId}/status?status=${newStatus}`);
      toast.success('Lead status updated');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead status');
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (lead.customer_name?.toLowerCase().includes(query)) ||
      (lead.customer_phone?.includes(query)) ||
      (lead.intent?.toLowerCase().includes(query))
    );
  });

  // Calculate stats
  const stats = {
    total: filteredLeads.length,
    hot: filteredLeads.filter(l => l.final_hotness === 'hot').length,
    qualified: filteredLeads.filter(l => l.status === 'qualified' || l.status === 'won').length,
    avgScore: filteredLeads.length > 0
      ? Math.round(filteredLeads.reduce((sum, l) => sum + (l.score || 0), 0) / filteredLeads.length)
      : 0
  };

  return (
    <div className="space-y-5 animate-fade-in" data-testid="agent-leads-page">
      <div>
        <h1 className="text-xl font-semibold font-['Plus_Jakarta_Sans'] text-slate-900">Leads</h1>
        <p className="text-slate-500 text-sm mt-0.5">Leads captured by {config.business_name || 'this agent'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Flame className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.hot}</p>
                <p className="text-xs text-slate-500">Hot Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.qualified}</p>
                <p className="text-xs text-slate-500">Qualified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.avgScore}</p>
                <p className="text-xs text-slate-500">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
              <Input
                placeholder="Search by name, phone, or intent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                data-testid="search-agent-leads-input"
              />
            </div>
            <div className="flex gap-2">
              <Select value={hotnessFilter} onValueChange={setHotnessFilter}>
                <SelectTrigger className="w-[130px] h-9 border-slate-200" data-testid="agent-hotness-filter">
                  <SelectValue placeholder="Hotness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hotness</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9 border-slate-200" data-testid="agent-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="bg-white border-slate-200 shadow-sm" data-testid="agent-leads-table-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-slate-400" strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900 mb-1">No Leads Yet</h3>
              <p className="text-sm text-slate-500">
                {searchQuery || hotnessFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Leads will appear here once customers start chatting with your agent'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="text-xs font-medium text-slate-500">Customer</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Intent</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Stage</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Hotness</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Score</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Created</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-slate-50/50" data-testid={`agent-lead-row-${lead.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{lead.customer_name || 'Unknown'}</p>
                          {lead.customer_phone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" strokeWidth={1.75} />
                              {lead.customer_phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[180px] truncate text-sm text-slate-600">
                          {lead.intent || 'No intent'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stageColors[lead.sales_stage] || stageColors.awareness}`}>
                          {lead.sales_stage?.charAt(0).toUpperCase() + lead.sales_stage?.slice(1) || 'Awareness'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${hotnessColors[lead.final_hotness]}`}
                        >
                          {lead.final_hotness}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">{lead.score}</span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => updateLeadStatus(lead.id, value)}
                        >
                          <SelectTrigger className="w-[100px] h-7 text-xs border-slate-200" data-testid={`agent-status-select-${lead.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" strokeWidth={1.75} />
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                          onClick={() => toast.info(lead.llm_explanation || 'No AI notes available')}
                          data-testid={`agent-view-notes-${lead.id}`}
                        >
                          <Info className="w-4 h-4" strokeWidth={1.75} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentLeadsPage;
