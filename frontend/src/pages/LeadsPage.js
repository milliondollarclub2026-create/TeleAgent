import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  Filter,
  Loader2,
  Phone,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const hotnessColors = {
  hot: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  warm: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  cold: 'bg-blue-500/20 text-blue-500 border-blue-500/30'
};

const statusColors = {
  new: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
  qualified: 'bg-primary/20 text-primary border-primary/30',
  won: 'bg-violet-500/20 text-violet-500 border-violet-500/30',
  lost: 'bg-muted text-muted-foreground border-border'
};

const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hotnessFilter, setHotnessFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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
      setLeads(response.data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to load leads');
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
    <div className="space-y-8 animate-fade-in" data-testid="leads-page">
      <div>
        <h1 className="text-3xl font-bold font-['Manrope'] tracking-tight">Leads</h1>
        <p className="text-muted-foreground mt-1">
          Manage and track your sales leads
        </p>
      </div>

      {/* Filters */}
      <Card className="card-hover">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or intent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-leads-input"
              />
            </div>
            <div className="flex gap-2">
              <Select value={hotnessFilter} onValueChange={setHotnessFilter}>
                <SelectTrigger className="w-[140px]" data-testid="hotness-filter">
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
                <SelectTrigger className="w-[140px]" data-testid="status-filter">
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
      <Card className="card-hover" data-testid="leads-table-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto rounded-xl bg-muted flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-['Manrope'] mb-2">No Leads Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || hotnessFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start conversations to generate leads'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Hotness</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.customer_name || 'Unknown'}</p>
                          {lead.customer_phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.customer_phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[200px] truncate">
                          {lead.intent || 'No intent detected'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={hotnessColors[lead.final_hotness]}
                        >
                          {lead.final_hotness}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{lead.score}</span>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={lead.status} 
                          onValueChange={(value) => updateLeadStatus(lead.id, value)}
                        >
                          <SelectTrigger className="w-[110px] h-8" data-testid={`status-select-${lead.id}`}>
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
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toast.info(lead.llm_explanation || 'No AI notes available')}
                          data-testid={`view-notes-${lead.id}`}
                        >
                          <MessageSquare className="w-4 h-4" />
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

export default LeadsPage;
