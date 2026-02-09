import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
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
  Bot,
  Settings,
  Loader2,
  Target,
  ShoppingBag,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, change, icon: Icon, suffix = '' }) => {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <Card className="bg-white border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[13px] text-slate-500 font-medium">{title}</p>
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">
              {value}{suffix}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
          </div>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-3 text-[12px] font-medium ${
            isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-slate-400'
          }`}>
            {isPositive && <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />}
            {isNegative && <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={2} />}
            <span>{isPositive ? '+' : ''}{change}% vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ProgressBar = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-slate-600">{label}</span>
        <span className="text-[13px] font-semibold text-slate-900">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" strokeWidth={2} />
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const totalLeads = summary.leads?.value || 0;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="agent-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                {agentInfo?.name}
              </h1>
              {agentInfo?.telegram_connected ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[11px] font-medium px-2 py-0.5">
                  <Zap className="w-3 h-3 mr-1" strokeWidth={2} />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500 border-slate-200 text-[11px] font-medium px-2 py-0.5">
                  Inactive
                </Badge>
              )}
            </div>
            {agentInfo?.telegram_connected && agentInfo?.bot_username && (
              <p className="text-[13px] text-slate-500 mt-0.5">@{agentInfo.bot_username}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px] h-9 text-[13px] border-slate-200 bg-white" data-testid="period-select">
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
            onClick={() => navigate(`/app/agents/${agentId}/settings`)}
            className="h-9 px-3 border-slate-200 text-slate-600 hover:text-slate-900"
          >
            <Settings className="w-4 h-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Conversations"
          value={summary.conversations?.value || 0}
          change={summary.conversations?.change}
          icon={MessageSquare}
        />
        <StatCard
          title="Leads Generated"
          value={summary.leads?.value || 0}
          change={summary.leads?.change}
          icon={Users}
        />
        <StatCard
          title="Conversion Rate"
          value={summary.conversion_rate?.value || 0}
          suffix="%"
          change={summary.conversion_rate?.change}
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Response"
          value={summary.avg_response_time?.value || 0}
          suffix="s"
          icon={Clock}
        />
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead Quality */}
        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              <h3 className="text-[13px] font-semibold text-slate-900">Lead Quality</h3>
            </div>
            <div className="space-y-4">
              {analytics?.hotness_distribution?.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[13px] text-slate-600">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-900">{item.value}</span>
                    <span className="text-[11px] text-slate-400">
                      ({totalLeads > 0 ? Math.round(item.value / totalLeads * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 mt-5">
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
        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              <h3 className="text-[13px] font-semibold text-slate-900">Score Distribution</h3>
            </div>
            <div className="space-y-4">
              <ProgressBar
                label="76-100 (High)"
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
                color="bg-slate-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <ShoppingBag className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              <h3 className="text-[13px] font-semibold text-slate-900">Top Products</h3>
            </div>
            {analytics?.top_products?.length > 0 ? (
              <div className="space-y-3">
                {analytics.top_products.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-500">
                        {idx + 1}
                      </span>
                      <span className="text-[13px] text-slate-700 truncate">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-900">{product.count}</span>
                      <span className="text-[11px] text-slate-400">({product.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-200" strokeWidth={1.5} />
                <p className="text-[13px] text-slate-400 mt-2">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Funnel */}
        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              <h3 className="text-[13px] font-semibold text-slate-900">Sales Funnel</h3>
            </div>
            <div className="flex items-end justify-between gap-3 h-36">
              {Object.entries(analytics?.leads_by_stage || {}).map(([stage, count], idx) => {
                const maxCount = Math.max(...Object.values(analytics?.leads_by_stage || {1: 1}));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const colors = [
                  'bg-slate-200',
                  'bg-slate-300',
                  'bg-slate-400',
                  'bg-slate-500',
                  'bg-slate-600',
                  'bg-slate-800'
                ];

                return (
                  <div key={stage} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center justify-end h-28">
                      <span className="text-[13px] font-semibold text-slate-900 mb-1">{count}</span>
                      <div
                        className={`w-full rounded-t-md transition-all duration-500 ${colors[idx] || 'bg-slate-400'}`}
                        style={{ height: `${Math.max(height, 8)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 text-center capitalize truncate w-full">{stage}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              <h3 className="text-[13px] font-semibold text-slate-900">Daily Trend</h3>
            </div>
            <div className="flex items-end justify-between gap-1.5 h-36">
              {analytics?.daily_trend?.map((day, idx) => {
                const maxLeads = Math.max(...(analytics.daily_trend?.map(d => d.leads) || [1]));
                const height = maxLeads > 0 ? (day.leads / maxLeads) * 100 : 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col items-center justify-end h-28">
                      {day.leads > 0 && (
                        <span className="text-[11px] font-medium text-slate-600 mb-1">{day.leads}</span>
                      )}
                      <div
                        className="w-full bg-slate-800 rounded-t transition-all duration-300 hover:bg-slate-700"
                        style={{ height: `${Math.max(height, day.leads > 0 ? 10 : 3)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;
