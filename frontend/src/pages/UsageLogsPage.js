import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Coins,
  DollarSign,
  Activity,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  ArrowLeft
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Format numbers with commas
const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
};

// Format cost with appropriate precision
const formatCost = (cost) => {
  if (cost === undefined || cost === null || cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
};

// Format date/time nicely
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Model badge colors - refined palette
const modelBadgeStyles = {
  'gpt-4o': 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  'gpt-4o-mini': 'bg-sky-50 text-sky-700 border-sky-200/80',
  'text-embedding-3-small': 'bg-slate-50 text-slate-600 border-slate-200/80',
  'default': 'bg-slate-50 text-slate-600 border-slate-200/80'
};

// Request type labels and colors
const requestTypeConfig = {
  'sales_agent': { label: 'Sales Agent', color: 'text-emerald-600' },
  'crm_chat': { label: 'CRM Chat', color: 'text-amber-600' },
  'embedding': { label: 'Embedding', color: 'text-slate-500' },
  'summarization': { label: 'Summary', color: 'text-violet-600' }
};

// Premium StatCard matching AgentDashboard exactly
const StatCard = ({ title, value, change, icon: Icon, suffix = '', delay = 0, isLoading }) => {
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
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="h-7 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
            </div>
            <div className="pt-3 border-t border-slate-100">
              <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <>
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
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100">
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Premium empty state component
const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
    </div>
    <p className="text-[14px] font-medium text-slate-600 mb-1">{title}</p>
    <p className="text-[13px] text-slate-400">{subtitle}</p>
  </div>
);

// Custom Tooltip for Chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const date = new Date(label);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    return (
      <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-slate-700">
        <p className="text-[11px] text-slate-400 mb-1">{formattedDate}</p>
        <p className="text-[14px] font-semibold text-emerald-400">{formatNumber(payload[0].value)} tokens</p>
      </div>
    );
  }
  return null;
};

// Table skeleton loader
const TableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
        <div className="h-4 w-28 bg-slate-100 rounded" />
        <div className="h-5 w-20 bg-slate-100 rounded-full" />
        <div className="h-4 w-20 bg-slate-100 rounded" />
        <div className="h-4 w-16 bg-slate-100 rounded ml-auto" />
        <div className="h-4 w-16 bg-slate-100 rounded" />
        <div className="h-4 w-16 bg-slate-100 rounded" />
      </div>
    ))}
  </div>
);

// Chart skeleton loader
const ChartSkeleton = () => (
  <div className="h-64 flex items-end justify-between gap-2 px-4">
    {[...Array(7)].map((_, i) => (
      <div
        key={i}
        className="flex-1 bg-slate-100 rounded-t animate-pulse"
        style={{
          height: `${Math.random() * 60 + 20}%`,
          animationDelay: `${i * 100}ms`
        }}
      />
    ))}
  </div>
);

const UsageLogsPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [days, setDays] = useState('7');
  const [modelFilter, setModelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Fetch all data
  const fetchData = useCallback(async () => {
    const daysNum = parseInt(days);

    // Fetch summary
    try {
      const summaryRes = await axios.get(`${API}/usage/summary?days=${daysNum}`);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      setSummary(null);
    }

    // Fetch chart data
    setChartLoading(true);
    try {
      const chartRes = await axios.get(`${API}/usage/chart?days=${daysNum}`);
      setChartData(chartRes.data.chart_data || []);
    } catch (error) {
      console.error('Failed to fetch chart:', error);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }

    setLoading(false);
    setRefreshing(false);
  }, [days]);

  // Fetch logs with pagination and filters
  const fetchLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const daysNum = parseInt(days);
      let url = `${API}/usage/logs?days=${daysNum}&page=${page}&limit=${pagination.limit}`;

      if (modelFilter !== 'all') url += `&model=${modelFilter}`;
      if (typeFilter !== 'all') url += `&request_type=${typeFilter}`;

      const res = await axios.get(url);
      setLogs(res.data.logs || []);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [days, modelFilter, typeFilter, pagination.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchLogs(1);
  }, [days, modelFilter, typeFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchLogs(newPage);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    fetchData();
    fetchLogs(pagination.page);
  };

  // Format chart date labels
  const formatChartDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 transition-colors duration-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" strokeWidth={1.75} />
          <span>Back to Dashboard</span>
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Usage Logs</h1>
            <p className="text-[13px] text-slate-500 mt-1">Monitor your AI token consumption and costs</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 px-4 text-[13px] text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards with staggered animation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Tokens"
            value={formatNumber(summary?.total_tokens?.value || 0)}
            change={summary?.total_tokens?.change}
            icon={Coins}
            delay={0}
            isLoading={loading}
          />
          <StatCard
            title="Total Cost"
            value={summary?.total_cost?.value ? formatCost(summary.total_cost.value) : '$0.00'}
            change={summary?.total_cost?.change}
            icon={DollarSign}
            delay={50}
            isLoading={loading}
          />
          <StatCard
            title="API Requests"
            value={formatNumber(summary?.total_requests?.value || 0)}
            change={summary?.total_requests?.change}
            icon={Zap}
            delay={100}
            isLoading={loading}
          />
          <StatCard
            title="Top Model"
            value={summary?.most_used_model?.name?.replace('text-embedding-3-small', 'Embeddings') || 'None'}
            suffix={summary?.most_used_model?.percentage ? ` · ${summary.most_used_model.percentage}%` : ''}
            icon={Cpu}
            delay={150}
            isLoading={loading}
          />
        </div>

        {/* Chart Section */}
        <Card className="bg-white border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Token Usage Trend</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Daily token consumption over the selected period</p>
              </div>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[140px] h-9 text-[13px] border-slate-200 hover:border-slate-300 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {chartLoading ? (
              <ChartSkeleton />
            ) : chartData.length === 0 || chartData.every(d => d.tokens === 0) ? (
              <EmptyState
                icon={Activity}
                title="No usage data yet"
                subtitle="Token usage will appear here as you use the AI"
              />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      dx={-5}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="tokens"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#tokenGradient)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs Table Section */}
        <Card className="bg-white border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-6">
            {/* Filters Row */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[15px] font-semibold text-slate-900">Request History</h2>
              <div className="flex items-center gap-3">
                <Select value={modelFilter} onValueChange={setModelFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-[13px] border-slate-200 hover:border-slate-300 transition-colors">
                    <SelectValue placeholder="All Models" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="text-embedding-3-small">Embeddings</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-[13px] border-slate-200 hover:border-slate-300 transition-colors">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sales_agent">Sales Agent</SelectItem>
                    <SelectItem value="crm_chat">CRM Chat</SelectItem>
                    <SelectItem value="embedding">Embedding</SelectItem>
                    <SelectItem value="summarization">Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            {logsLoading ? (
              <TableSkeleton />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={Coins}
                title="No usage records found"
                subtitle="API requests will appear here as they're made"
              />
            ) : (
              <>
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3">Date & Time</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3">Model</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3">Type</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-right">Input</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-right">Output</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log, index) => {
                        const typeConfig = requestTypeConfig[log.request_type] || { label: log.request_type, color: 'text-slate-600' };
                        return (
                          <TableRow
                            key={log.id}
                            className="group hover:bg-slate-50/70 transition-colors duration-150 border-b border-slate-100 last:border-0"
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <TableCell className="text-[13px] text-slate-600 py-3.5">
                              {formatDateTime(log.created_at)}
                            </TableCell>
                            <TableCell className="py-3.5">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-medium px-2 py-0.5 border ${modelBadgeStyles[log.model] || modelBadgeStyles.default}`}
                              >
                                {log.model === 'text-embedding-3-small' ? 'embeddings' : log.model}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-[13px] font-medium py-3.5 ${typeConfig.color}`}>
                              {typeConfig.label}
                            </TableCell>
                            <TableCell className="text-[13px] text-slate-900 font-medium text-right tabular-nums py-3.5">
                              {formatNumber(log.input_tokens)}
                            </TableCell>
                            <TableCell className="text-[13px] text-slate-900 font-medium text-right tabular-nums py-3.5">
                              {log.output_tokens > 0 ? formatNumber(log.output_tokens) : <span className="text-slate-300">—</span>}
                            </TableCell>
                            <TableCell className="text-[13px] text-slate-500 text-right tabular-nums py-3.5">
                              {formatCost(log.cost_usd)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                    <p className="text-[12px] text-slate-500">
                      Showing <span className="font-medium text-slate-700">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="font-medium text-slate-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium text-slate-700">{pagination.total}</span> entries
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="h-8 px-3 text-[12px] border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" strokeWidth={1.75} />
                        Prev
                      </Button>
                      <div className="flex items-center gap-1">
                        {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                          let pageNum;
                          if (pagination.total_pages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.total_pages - 2) {
                            pageNum = pagination.total_pages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={pagination.page === pageNum ? "default" : "ghost"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className={`h-8 w-8 p-0 text-[12px] font-medium transition-all ${
                                pagination.page === pageNum
                                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.total_pages}
                        className="h-8 px-3 text-[12px] border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-all"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UsageLogsPage;
