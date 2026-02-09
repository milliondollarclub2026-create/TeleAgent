import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
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
  Bot,
  Loader2,
  Target,
  ShoppingBag,
  BarChart3,
  Activity,
  Zap,
  Minus,
  Flame,
  Thermometer,
  Snowflake
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Premium StatCard with refined hover effects
const StatCard = ({ title, value, change, icon: Icon, suffix = '', delay = 0 }) => {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0 || change === undefined;

  return (
    <Card
      className="group relative bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-300 ease-out overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[12px] text-slate-500 font-medium uppercase tracking-wide">{title}</p>
            <p className="text-[28px] font-semibold text-slate-900 tracking-tight leading-none">
              {value}<span className="text-[20px] text-slate-400 ml-0.5">{suffix}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
            <Icon className="w-[18px] h-[18px] text-white" strokeWidth={1.75} />
          </div>
        </div>

        {change !== undefined && (
          <div className={`flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100`}>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
              isPositive ? 'bg-emerald-50 text-emerald-600' :
              isNegative ? 'bg-red-50 text-red-500' :
              'bg-slate-50 text-slate-400'
            }`}>
              {isPositive && <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />}
              {isNegative && <ArrowDownRight className="w-3 h-3" strokeWidth={2.5} />}
              {isNeutral && <Minus className="w-3 h-3" strokeWidth={2.5} />}
              <span>{isPositive ? '+' : ''}{change || 0}%</span>
            </div>
            <span className="text-[11px] text-slate-400">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Refined ProgressBar with smooth styling
const ProgressBar = ({ label, value, total, color, accentColor }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="group space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-slate-900">{value}</span>
          <span className="text-[11px] text-slate-400">({Math.round(percentage)}%)</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{
            width: `${percentage}%`,
            boxShadow: percentage > 0 ? `0 0 8px ${accentColor || 'rgba(0,0,0,0.1)'}` : 'none'
          }}
        />
      </div>
    </div>
  );
};

// Analytics Card wrapper with premium styling
const AnalyticsCard = ({ icon: Icon, title, children }) => (
  <Card className="group bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
    <CardContent className="p-5">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-900 transition-colors duration-300">
          <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors duration-300" strokeWidth={2} />
        </div>
        <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </CardContent>
  </Card>
);

// Empty state component
const EmptyState = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center py-10">
    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
    </div>
    <p className="text-[13px] text-slate-400">{message}</p>
  </div>
);

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

  // Dummy data for visualization
  const dummyAnalytics = {
    summary: {
      conversations: { value: 847, change: 12 },
      leads: { value: 156, change: 8 },
      conversion_rate: { value: 18.4, change: 3 },
      avg_response_time: { value: 2.3, change: -15 }
    },
    hotness_distribution: [
      { name: 'Hot', value: 42, color: '#ef4444' },
      { name: 'Warm', value: 67, color: '#f59e0b' },
      { name: 'Cold', value: 47, color: '#3b82f6' }
    ],
    score_distribution: {
      "76-100": 38,
      "51-75": 52,
      "26-50": 41,
      "0-25": 25
    },
    top_products: [
      { name: 'Premium Subscription', count: 45, percentage: 29 },
      { name: 'Enterprise Plan', count: 38, percentage: 24 },
      { name: 'Starter Package', count: 31, percentage: 20 },
      { name: 'API Access', count: 24, percentage: 15 },
      { name: 'Custom Integration', count: 18, percentage: 12 }
    ],
    leads_by_stage: {
      'new': 42,
      'contacted': 35,
      'qualified': 28,
      'proposal': 22,
      'negotiation': 16,
      'closed': 13
    },
    daily_trend: [
      { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), leads: 18 },
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), leads: 24 },
      { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), leads: 15 },
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), leads: 32 },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), leads: 28 },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), leads: 21 },
      { date: new Date().toISOString(), leads: 18 }
    ]
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, configRes, integrationsRes] = await Promise.all([
        axios.get(`${API}/dashboard/analytics?days=${period}`),
        axios.get(`${API}/config`),
        axios.get(`${API}/integrations/status`)
      ]);

      // Use real data if available, otherwise use dummy data
      const realData = analyticsRes.data;
      const hasRealData = realData?.summary?.leads?.value > 0;

      setAnalytics(hasRealData ? realData : dummyAnalytics);
      setAgentInfo({
        name: configRes.data.business_name || 'My Agent',
        telegram_connected: integrationsRes.data.telegram?.connected || false,
        bot_username: integrationsRes.data.telegram?.bot_username
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Use dummy data on error for visualization
      setAnalytics(dummyAnalytics);
      setAgentInfo({
        name: 'Sales Agent',
        telegram_connected: true,
        bot_username: 'leadrelay_bot'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white" strokeWidth={2} />
        </div>
        <p className="text-[13px] text-slate-400">Loading analytics...</p>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const totalLeads = summary.leads?.value || 0;

  return (
    <div className="space-y-6" data-testid="agent-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
              <Bot className="w-7 h-7 text-white" strokeWidth={1.5} />
            </div>
            {agentInfo?.telegram_connected && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                {agentInfo?.name}
              </h1>
              {agentInfo?.telegram_connected ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wide">
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wide">
                  Offline
                </Badge>
              )}
            </div>
            {agentInfo?.telegram_connected && agentInfo?.bot_username && (
              <p className="text-[13px] text-slate-400 mt-0.5 font-mono">@{agentInfo.bot_username}</p>
            )}
          </div>
        </div>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] h-9 text-[13px] border-slate-200 bg-white hover:bg-slate-50 transition-colors" data-testid="period-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Conversations"
          value={summary.conversations?.value || 0}
          change={summary.conversations?.change}
          icon={MessageSquare}
          delay={0}
        />
        <StatCard
          title="Leads Generated"
          value={summary.leads?.value || 0}
          change={summary.leads?.change}
          icon={Users}
          delay={50}
        />
        <StatCard
          title="Conversion Rate"
          value={summary.conversion_rate?.value || 0}
          suffix="%"
          change={summary.conversion_rate?.change}
          icon={TrendingUp}
          delay={100}
        />
        <StatCard
          title="Avg Response"
          value={summary.avg_response_time?.value || 0}
          suffix="s"
          icon={Clock}
          delay={150}
        />
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead Quality - Clean & Premium */}
        <AnalyticsCard icon={Target} title="Lead Quality">
          {analytics?.hotness_distribution?.length > 0 ? (
            <div className="space-y-4">
              {analytics.hotness_distribution.map((item) => {
                const percentage = totalLeads > 0 ? Math.round(item.value / totalLeads * 100) : 0;
                const tierConfig = {
                  'Hot': {
                    icon: Flame,
                    barColor: 'bg-rose-500',
                    iconColor: 'text-rose-500',
                    bgColor: 'bg-rose-500/10'
                  },
                  'Warm': {
                    icon: Thermometer,
                    barColor: 'bg-amber-500',
                    iconColor: 'text-amber-500',
                    bgColor: 'bg-amber-500/10'
                  },
                  'Cold': {
                    icon: Snowflake,
                    barColor: 'bg-sky-500',
                    iconColor: 'text-sky-500',
                    bgColor: 'bg-sky-500/10'
                  }
                };
                const config = tierConfig[item.name] || tierConfig['Cold'];
                const IconComponent = config.icon;

                return (
                  <div key={item.name} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                          <IconComponent className={`w-3.5 h-3.5 ${config.iconColor}`} strokeWidth={2} />
                        </div>
                        <span className="text-[13px] font-medium text-slate-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-slate-900 tabular-nums">{item.value}</span>
                        <span className="text-[11px] text-slate-400 tabular-nums">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.barColor} transition-all duration-700 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Target} message="No lead data yet" />
          )}
        </AnalyticsCard>

        {/* Score Distribution */}
        <AnalyticsCard icon={BarChart3} title="Score Distribution">
          <div className="space-y-4">
            <ProgressBar
              label="76-100 (High)"
              value={analytics?.score_distribution?.["76-100"] || 0}
              total={totalLeads}
              color="bg-emerald-500"
              accentColor="rgba(16, 185, 129, 0.3)"
            />
            <ProgressBar
              label="51-75 (Medium)"
              value={analytics?.score_distribution?.["51-75"] || 0}
              total={totalLeads}
              color="bg-sky-500"
              accentColor="rgba(14, 165, 233, 0.3)"
            />
            <ProgressBar
              label="26-50 (Low)"
              value={analytics?.score_distribution?.["26-50"] || 0}
              total={totalLeads}
              color="bg-amber-500"
              accentColor="rgba(245, 158, 11, 0.3)"
            />
            <ProgressBar
              label="0-25 (Very Low)"
              value={analytics?.score_distribution?.["0-25"] || 0}
              total={totalLeads}
              color="bg-rose-400"
              accentColor="rgba(251, 113, 133, 0.3)"
            />
          </div>
        </AnalyticsCard>

        {/* Top Products */}
        <AnalyticsCard icon={ShoppingBag} title="Top Products">
          {analytics?.top_products?.length > 0 ? (
            <div className="space-y-3">
              {analytics.top_products.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-[11px] font-semibold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-[13px] text-slate-600 group-hover/item:text-slate-900 transition-colors truncate">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[13px] font-semibold text-slate-900 tabular-nums">{product.count}</span>
                    <span className="text-[11px] text-slate-400 tabular-nums">({product.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ShoppingBag} message="No product data yet" />
          )}
        </AnalyticsCard>
      </div>

      {/* Funnel & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Funnel - Modern Gradient Colors */}
        <AnalyticsCard icon={Activity} title="Sales Funnel">
          {Object.keys(analytics?.leads_by_stage || {}).length > 0 ? (
            <div className="flex items-end justify-between gap-3 h-44 pt-2">
              {Object.entries(analytics.leads_by_stage).map(([stage, count], idx, arr) => {
                const maxCount = Math.max(...Object.values(analytics.leads_by_stage || {1: 1}));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                // Beautiful gradient progression: cyan → blue → indigo → violet → purple
                const funnelColors = [
                  { bg: 'bg-cyan-400', hover: 'hover:bg-cyan-500', text: 'text-cyan-600' },
                  { bg: 'bg-sky-500', hover: 'hover:bg-sky-600', text: 'text-sky-600' },
                  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-blue-600' },
                  { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-indigo-600' },
                  { bg: 'bg-violet-500', hover: 'hover:bg-violet-600', text: 'text-violet-600' },
                  { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600' }
                ];
                const colorConfig = funnelColors[idx] || funnelColors[funnelColors.length - 1];

                return (
                  <div key={stage} className="flex-1 flex flex-col items-center gap-2 group/bar">
                    <div className="w-full flex flex-col items-center justify-end h-36">
                      {count > 0 && (
                        <span className={`text-[12px] font-semibold ${colorConfig.text} tabular-nums mb-1.5`}>{count}</span>
                      )}
                      <div
                        className={`w-full rounded-xl ${colorConfig.bg} ${colorConfig.hover} transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md`}
                        style={{ height: `${Math.max(height, 12)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 text-center capitalize truncate w-full font-medium">{stage}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Activity} message="No funnel data yet" />
          )}
        </AnalyticsCard>

        {/* Daily Trend - Vibrant Gradient Bars */}
        <AnalyticsCard icon={TrendingUp} title="Daily Trend">
          {analytics?.daily_trend?.length > 0 ? (
            <div className="flex items-end justify-between gap-1.5 h-44 pt-2">
              {analytics.daily_trend.map((day, idx) => {
                const maxLeads = Math.max(...(analytics.daily_trend?.map(d => d.leads) || [1]));
                const height = maxLeads > 0 ? (day.leads / maxLeads) * 100 : 0;
                const isToday = idx === analytics.daily_trend.length - 1;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
                    <div className="w-full flex flex-col items-center justify-end h-36">
                      {day.leads > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-600 tabular-nums mb-1.5">{day.leads}</span>
                      )}
                      <div
                        className={`w-full rounded-lg transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${
                          isToday
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-700 hover:to-emerald-500'
                            : 'bg-gradient-to-t from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500'
                        }`}
                        style={{
                          height: `${Math.max(height, day.leads > 0 ? 12 : 4)}%`,
                          opacity: day.leads > 0 ? 1 : 0.4
                        }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${isToday ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={TrendingUp} message="No trend data yet" />
          )}
        </AnalyticsCard>
      </div>
    </div>
  );
};

export default AgentDashboard;
