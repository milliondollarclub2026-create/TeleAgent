import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  Bot, 
  MessageSquare, 
  Users, 
  Zap,
  MoreVertical,
  Settings,
  Trash2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API}/agents`);
      setAgents(response.data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      // If no agents endpoint yet, check config
      try {
        const configResponse = await axios.get(`${API}/config`);
        if (configResponse.data && configResponse.data.business_name) {
          // Legacy: treat existing config as one agent
          setAgents([{
            id: 'default',
            name: configResponse.data.business_name || 'My Agent',
            status: 'active',
            channel: configResponse.data.telegram_connected ? 'telegram' : null,
            leads_count: 0,
            conversations_count: 0,
            created_at: new Date().toISOString()
          }]);
        }
      } catch {
        setAgents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    try {
      await axios.delete(`${API}/agents/${agentId}`);
      toast.success('Agent deleted');
      fetchAgents();
    } catch (error) {
      toast.error('Failed to delete agent');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
      </div>
    );
  }

  // Empty state - No agents yet
  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]" data-testid="agents-empty-state">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mb-6">
            <Bot className="w-10 h-10 text-emerald-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900 mb-2">
            Create Your First AI Agent
          </h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Set up an AI-powered sales agent that handles customer conversations, 
            qualifies leads, and helps close deals — all on autopilot.
          </p>
          <Button 
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8 text-base"
            onClick={() => navigate('/app/agents/new')}
            data-testid="create-first-agent-btn"
          >
            <Plus className="w-5 h-5 mr-2" strokeWidth={2} />
            Create New Agent
          </Button>
          <p className="text-xs text-slate-400 mt-4">
            Takes about 2 minutes to set up
          </p>
        </div>
      </div>
    );
  }

  // Agents list
  return (
    <div className="space-y-6 animate-fade-in" data-testid="agents-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">Your Agents</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your AI sales agents</p>
        </div>
        <Button 
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => navigate('/agents/new')}
          data-testid="create-agent-btn"
        >
          <Plus className="w-4 h-4 mr-2" strokeWidth={2} />
          New Agent
        </Button>
      </div>

      <div className="grid gap-4">
        {agents.map((agent) => (
          <Card 
            key={agent.id} 
            className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => navigate(`/app/agents/${agent.id}`)}
            data-testid={`agent-card-${agent.id}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                    <Bot className="w-6 h-6 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {agent.name}
                      </h3>
                      <Badge 
                        variant="outline" 
                        className={agent.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                        }
                      >
                        {agent.status === 'active' ? '● Active' : '○ Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      {agent.channel && (
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" strokeWidth={2} />
                          {agent.channel === 'telegram' ? 'Telegram' : agent.channel}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
                        {agent.conversations_count || 0} conversations
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" strokeWidth={2} />
                        {agent.leads_count || 0} leads
                      </span>
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/app/agents/${agent.id}`); }}>
                      <ExternalLink className="w-4 h-4 mr-2" strokeWidth={1.75} />
                      View Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}/settings`); }}>
                      <Settings className="w-4 h-4 mr-2" strokeWidth={1.75} />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.75} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AgentsPage;
