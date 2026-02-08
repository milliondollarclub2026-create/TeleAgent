import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  MessageSquare, 
  UserCheck, 
  Flame, 
  Repeat, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <Card className="card-hover" data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-3xl font-bold font-['Manrope'] mt-1">{value}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const hotnessColors = {
  hot: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  warm: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  cold: 'bg-blue-500/20 text-blue-500 border-blue-500/30'
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
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    Hot: day.hot,
    Warm: day.warm,
    Cold: day.cold,
    total: day.count
  }));

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-bold font-['Manrope'] tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your AI sales agent performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Conversations"
          value={stats?.total_conversations || 0}
          icon={MessageSquare}
          color="bg-primary/20 text-primary"
          loading={loading}
        />
        <StatCard
          title="Total Leads"
          value={stats?.total_leads || 0}
          icon={UserCheck}
          color="bg-emerald-500/20 text-emerald-500"
          loading={loading}
        />
        <StatCard
          title="Hot Leads"
          value={stats?.hot_leads || 0}
          icon={Flame}
          color="bg-orange-500/20 text-orange-500"
          loading={loading}
        />
        <StatCard
          title="Returning"
          value={stats?.returning_customers || 0}
          icon={Repeat}
          color="bg-violet-500/20 text-violet-500"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads per Day Chart */}
        <Card className="lg:col-span-1" data-testid="leads-chart">
          <CardHeader>
            <CardTitle className="text-lg font-['Manrope'] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Leads per Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    tickLine={{ stroke: '#27272a' }}
                  />
                  <YAxis 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    tickLine={{ stroke: '#27272a' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #27272a',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#fafafa' }}
                  />
                  <Legend />
                  <Bar dataKey="Hot" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Warm" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Cold" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="lg:col-span-1" data-testid="recent-leads">
          <CardHeader>
            <CardTitle className="text-lg font-['Manrope'] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Recent Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No leads yet</p>
                <p className="text-sm">Connect your Telegram bot to start capturing leads</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div 
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border hover:border-primary/30 transition-colors"
                    data-testid={`lead-item-${lead.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {lead.customer_name || 'Unknown Customer'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.intent || 'No intent detected'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge 
                        variant="outline" 
                        className={`${hotnessColors[lead.final_hotness]} text-xs`}
                      >
                        {lead.final_hotness}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {lead.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
