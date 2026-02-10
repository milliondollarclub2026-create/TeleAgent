import React, { useState, useEffect } from 'react';
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
  Trash2
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
} from '../components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const hotnessColors = {
  hot: 'bg-orange-100 text-orange-700 border-orange-200',
  warm: 'bg-amber-100 text-amber-700 border-amber-200',
  cold: 'bg-blue-100 text-blue-700 border-blue-200'
};

// REMOVED: Demo data was causing multi-tenancy issues - all users saw same fake leads

const stageColors = {
  awareness: 'bg-slate-100 text-slate-600',
  interest: 'bg-blue-100 text-blue-600',
  consideration: 'bg-violet-100 text-violet-600',
  intent: 'bg-amber-100 text-amber-600',
  evaluation: 'bg-orange-100 text-orange-600',
  purchase: 'bg-emerald-100 text-emerald-600'
};

const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hotnessFilter, setHotnessFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, [hotnessFilter, statusFilter]);

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
      const response = await axios.get(url);
      // Only show real leads from API - no demo data (multi-tenancy security)
      setLeads(response.data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      // On error, show empty state - never show demo data
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      await axios.put(`${API}/leads/${leadId}/status?status=${newStatus}`);
      toast.success('Lead status updated');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead status');
    }
  };

  const handleDeleteClick = (lead) => {
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  };

  const deleteLead = async () => {
    if (!leadToDelete) return;

    try {
      await axios.delete(`${API}/leads/${leadToDelete.id}`);
      toast.success('Lead deleted');
      setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
    } catch (error) {
      toast.error('Failed to delete lead');
    } finally {
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
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

  return (
    <div className="space-y-5 animate-fade-in" data-testid="leads-page">
      <div>
        <h1 className="text-xl font-semibold font-['Plus_Jakarta_Sans'] text-slate-900">All Leads</h1>
        <p className="text-slate-500 text-sm mt-0.5">View leads from all your agents</p>
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
                data-testid="search-leads-input"
              />
            </div>
            <div className="flex gap-2">
              <Select value={hotnessFilter} onValueChange={setHotnessFilter}>
                <SelectTrigger className="w-[130px] h-9 border-slate-200" data-testid="hotness-filter">
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
                <SelectTrigger className="w-[130px] h-9 border-slate-200" data-testid="status-filter">
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
      <Card className="bg-white border-slate-200 shadow-sm" data-testid="leads-table-card">
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
              <h3 className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900 mb-1">No Leads Found</h3>
              <p className="text-sm text-slate-500">
                {searchQuery || hotnessFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start conversations to generate leads'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="text-xs font-medium text-slate-500">Customer</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Agent</TableHead>
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
                    <TableRow key={lead.id} className="hover:bg-slate-50/50" data-testid={`lead-row-${lead.id}`}>
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
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {lead.agent_name || 'Default Agent'}
                        </span>
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
                        <span className="font-mono text-sm text-slate-600">{lead.score ?? 0}</span>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={lead.status} 
                          onValueChange={(value) => updateLeadStatus(lead.id, value)}
                        >
                          <SelectTrigger className="w-[100px] h-7 text-xs border-slate-200" data-testid={`status-select-${lead.id}`}>
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                            onClick={() => toast.info(lead.llm_explanation || 'No AI notes available')}
                            data-testid={`view-notes-${lead.id}`}
                          >
                            <Info className="w-4 h-4" strokeWidth={1.75} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                            onClick={() => handleDeleteClick(lead)}
                            data-testid={`delete-lead-${lead.id}`}
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the lead for "{leadToDelete?.customer_name || 'Unknown'}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteLead}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeadsPage;
