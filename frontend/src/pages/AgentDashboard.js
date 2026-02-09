import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Bot,
  Settings,
  ChevronLeft,
  Loader2,
  Zap,
  Target,
  ShoppingBag,
  BarChart3
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, change, icon: Icon, suffix = '', iconBg }) => {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {value}{suffix}
            </p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-slate-400'
              }`}>
                {isPositive && <ArrowUpRight className="w-4 h-4" strokeWidth={2} />}
                {isNegative && <ArrowDownRight className="w-4 h-4" strokeWidth={2} />}
                {isNeutral && <Minus className="w-4 h-4" strokeWidth={2} />}
                <span>{isPositive ? '+' : ''}{change}% vs last period</span>
              </div>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg || 'bg-slate-100'}`}>
            <Icon className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ProgressBar = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const AgentDashboard = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');

  useEffect(() => {
    fetchData();
  }, [agentId, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, configRes, integrationsRes] = await Promise.all([
        axios.get(`${API}/dashboard/analytics?days=${period}`),
        axios.get(`${API}/config`),
        axios.get(`${API}/integrations/status`)
      ]);
      
      setAnalytics(analyticsRes.data);
      setAgentInfo({
        name: configRes.data.business_name || 'My Agent',
        telegram_connected: integrationsRes.data.telegram?.connected || false,
        bot_username: integrationsRes.data.telegram?.bot_username
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const totalLeads = summary.leads?.value || 0;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="agent-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-500"
            onClick={() => navigate('/app/agents')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" strokeWidth={2} />
            Agents
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
                {agentInfo?.name}
              </h1>
              <div className="flex items-center gap-2">
                {agentInfo?.telegram_connected ? (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Zap className="w-3 h-3 mr-1" strokeWidth={2} />
                    @{agentInfo.bot_username}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200">
                    Not Connected
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] h-9 border-slate-200" data-testid="period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/app/agents/${agentId}/crm-chat`)}
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            data-testid="crm-chat-btn"
          >
            <MessageSquare className="w-4 h-4 mr-2" strokeWidth={1.75} />
            CRM Chat
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/agents/${agentId}/settings`)}
          >
            <Settings className="w-4 h-4 mr-2" strokeWidth={1.75} />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Conversations"
          value={summary.conversations?.value || 0}
          change={summary.conversations?.change}
          icon={MessageSquare}
          iconBg="bg-blue-100"
        />
        <StatCard 
          title="Leads Generated"
          value={summary.leads?.value || 0}
          change={summary.leads?.change}
          icon={Users}
          iconBg="bg-emerald-100"
        />
        <StatCard 
          title="Conversion Rate"
          value={summary.conversion_rate?.value || 0}
          suffix="%"
          change={summary.conversion_rate?.change}
          icon={TrendingUp}
          iconBg="bg-violet-100"
        />
        <StatCard 
          title="Avg Response"
          value={summary.avg_response_time?.value || 0}
          suffix="s"
          icon={Clock}
          iconBg="bg-amber-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead Quality Distribution */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              Lead Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics?.hotness_distribution?.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                  <span className="text-xs text-slate-400">
                    ({totalLeads > 0 ? Math.round(item.value / totalLeads * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
            
            {/* Visual bar representation */}
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mt-4">
              {analytics?.hotness_distribution?.map((item, idx) => (
                <div 
                  key={idx}
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: totalLeads > 0 ? `${(item.value / totalLeads) * 100}%` : '0%',
                    backgroundColor: item.color
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProgressBar 
              label="76-100 (High Intent)" 
              value={analytics?.score_distribution?.["76-100"] || 0} 
              total={totalLeads}
              color="bg-emerald-500"
            />
            <ProgressBar 
              label="51-75 (Medium)" 
              value={analytics?.score_distribution?.["51-75"] || 0} 
              total={totalLeads}
              color="bg-blue-500"
            />
            <ProgressBar 
              label="26-50 (Low)" 
              value={analytics?.score_distribution?.["26-50"] || 0} 
              total={totalLeads}
              color="bg-amber-500"
            />
            <ProgressBar 
              label="0-25 (Very Low)" 
              value={analytics?.score_distribution?.["0-25"] || 0} 
              total={totalLeads}
              color="bg-slate-400"
            />
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              Top Products Asked
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.top_products?.length > 0 ? (
              <div className="space-y-3">
                {analytics.top_products.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-700 truncate">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{product.count}</span>
                      <span className="text-xs text-slate-400">({product.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" strokeWidth={1.5} />
                <p className="text-sm text-slate-400 mt-2">No product data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Funnel */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Sales Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-32">
            {Object.entries(analytics?.leads_by_stage || {}).map(([stage, count], idx) => {
              const maxCount = Math.max(...Object.values(analytics?.leads_by_stage || {1: 1}));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const colors = [
                'bg-slate-300',
                'bg-blue-400',
                'bg-violet-400',
                'bg-amber-400',
                'bg-orange-400',
                'bg-emerald-500'
              ];
              
              return (
                <div key={stage} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    <span className="text-sm font-semibold text-slate-900 mb-1">{count}</span>
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-500 ${colors[idx] || 'bg-slate-400'}`}
                      style={{ height: `${Math.max(height, 8)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 text-center capitalize">{stage}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Trend */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Daily Leads Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-1 h-24">
            {analytics?.daily_trend?.map((day, idx) => {
              const maxLeads = Math.max(...(analytics.daily_trend?.map(d => d.leads) || [1]));
              const height = maxLeads > 0 ? (day.leads / maxLeads) * 100 : 0;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-20">
                    {day.leads > 0 && (
                      <span className="text-xs font-medium text-slate-600 mb-1">{day.leads}</span>
                    )}
                    <div 
                      className="w-full bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-600"
                      style={{ height: `${Math.max(height, day.leads > 0 ? 10 : 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentDashboard;
