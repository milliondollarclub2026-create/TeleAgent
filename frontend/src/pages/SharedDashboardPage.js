import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, AlertTriangle, Clock } from 'lucide-react';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import MetricsSummaryCard from '../components/dashboard/MetricsSummaryCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SharedDashboardPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/shared/${token}`);
        setData(response.data);
      } catch (err) {
        const status = err.response?.status;
        if (status === 410) {
          setError('expired');
        } else if (status === 404) {
          setError('not_found');
        } else {
          setError('error');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7F6] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" strokeWidth={2} />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F7F6] flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            {error === 'expired' ? (
              <Clock className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
            ) : (
              <AlertTriangle className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
            )}
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {error === 'expired' ? 'Link Expired' : error === 'not_found' ? 'Link Not Found' : 'Something Went Wrong'}
          </h2>
          <p className="text-sm text-slate-500">
            {error === 'expired'
              ? 'This shared dashboard link has expired. Ask the owner for a new link.'
              : error === 'not_found'
                ? 'This link has been revoked or does not exist.'
                : 'Failed to load the dashboard. Please try again later.'}
          </p>
        </div>
      </div>
    );
  }

  const widgets = data?.widgets || [];
  const title = data?.title || 'Dashboard';
  const kpiWidgets = widgets.filter(w => ['kpi', 'metric'].includes(w.chart_type));
  const chartWidgets = widgets.filter(w => !['kpi', 'metric'].includes(w.chart_type));

  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">
              <span className="text-emerald-600">Lead</span>
              <span className="text-slate-900">Relay</span>
            </h1>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-600">{title}</span>
          </div>
          <span className="text-[11px] text-slate-400">Live data</span>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* KPI summary */}
        {kpiWidgets.length > 0 && (
          <div className={`grid gap-4 ${
            kpiWidgets.length === 1 ? 'grid-cols-1 max-w-xs' :
            kpiWidgets.length === 2 ? 'grid-cols-2' :
            kpiWidgets.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
          }`}>
            {kpiWidgets.map((kpi) => (
              <div key={kpi.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">{kpi.title}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{kpi.value ?? '—'}</span>
                  {kpi.change && (
                    <span className={`text-xs font-medium ${
                      kpi.changeDirection === 'up' ? 'text-emerald-600' :
                      kpi.changeDirection === 'down' ? 'text-red-600' : 'text-slate-500'
                    }`}>
                      {kpi.change}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts grid — read-only */}
        {chartWidgets.length > 0 && (
          <DashboardGrid
            widgets={chartWidgets}
            loading={false}
            onDeleteWidget={null}
            onModifyWidget={null}
            onDrillDown={null}
            onReorderWidgets={null}
            onResizeWidget={null}
          />
        )}

        {widgets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">No widgets configured for this dashboard.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-4 py-3 text-center">
          <p className="text-[11px] text-slate-400">
            Powered by <span className="text-emerald-600 font-medium">Lead</span><span className="text-slate-700 font-medium">Relay</span>
          </p>
        </div>
      </div>
    </div>
  );
}
