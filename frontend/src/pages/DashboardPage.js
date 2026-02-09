import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  MessageSquare, 
  UserCheck, 
  Flame, 
  RefreshCw, 
  TrendingUp,
  Calendar,
  Target,
  Percent
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, color, subtitle, loading }) => (
  <Card className="bg-white border-slate-200" data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5">{value}</p>
          )}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const STAGE_COLORS = {
  awareness: '#94a3b8',
  interest: '#60a5fa',
  consideration: '#a78bfa',
  intent: '#fbbf24',
  evaluation: '#f97316',
  purchase: '#22c55e'
};

const hotnessColors = {
  hot: 'bg-orange-100 text-orange-700 border-orange-200',
  warm: 'bg-amber-100 text-amber-700 border-amber-200',
  cold: 'bg-blue-100 text-blue-700 border-blue-200'
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [leadsPerDay, setLeadsPerDay] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, leadsPerDayRes, leadsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/dashboard/leads-per-day?days=7`),
        axios.get(`${API}/leads?limit=5`)
      ]);
      setStats(statsRes.data);
      setLeadsPerDay(leadsPerDayRes.data);
      setRecentLeads(leadsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = leadsPerDay.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
    Hot: day.hot,
    Warm: day.warm,
    Cold: day.cold
  }));

  const stageData = stats?.leads_by_stage ? Object.entries(stats.leads_by_stage).map(([stage, count]) => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1),
    value: count,
    color: STAGE_COLORS[stage]
  })).filter(s => s.value > 0) : [];

  return (
    <div className="space-y-5 animate-fade-in" data-testid="dashboard-page">
      <div>
        <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Overview of your AI sales agent performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Conversations"
          value={stats?.total_conversations || 0}
          icon={MessageSquare}
          color="bg-slate-100 text-slate-600"
          loading={loading}
        />
        <StatCard
          title="Total Leads"
          value={stats?.total_leads || 0}
          icon={UserCheck}
          color="bg-emerald-100 text-emerald-600"
          loading={loading}
        />
        <StatCard
          title="Hot Leads"
          value={stats?.hot_leads || 0}
          icon={Flame}
          color="bg-orange-100 text-orange-600"
          loading={loading}
        />
        <StatCard
          title="Conversion"
          value={`${stats?.conversion_rate || 0}%`}
          icon={Percent}
          color="bg-emerald-100 text-emerald-600"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads per Day Chart */}
        <Card className="lg:col-span-2 bg-white border-slate-200" data-testid="leads-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
              Leads Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Hot" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Warm" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Cold" stackId="a" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pipeline by Stage */}
        <Card className="bg-white border-slate-200" data-testid="pipeline-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
              Pipeline Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-slate-500">
                No leads yet
              </div>
            )}
            {stageData.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {stageData.map((stage) => (
                  <div key={stage.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-slate-600">{stage.name}: {stage.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card className="bg-white border-slate-200" data-testid="recent-leads">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
            Recent Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
              <p className="text-sm">No leads yet</p>
              <p className="text-xs text-slate-400">Connect your Telegram bot to start</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div 
                  key={lead.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                  data-testid={`lead-item-${lead.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {lead.customer_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {lead.intent || 'No intent'} • Stage: {lead.sales_stage}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge variant="outline" className={`text-[10px] ${hotnessColors[lead.final_hotness]}`}>
                      {lead.final_hotness}
                    </Badge>
                    <span className="text-xs font-mono text-slate-500">{lead.score ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
