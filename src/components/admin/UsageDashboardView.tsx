import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  HardDrive,
  Users,
  ShieldAlert,
  CheckCircle2,
  Building2,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

interface UsageDashboardViewProps {
  onSelectTenant: (tenantId: number) => void;
}

export const UsageDashboardView: React.FC<UsageDashboardViewProps> = ({ onSelectTenant }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [staleDays, setStaleDays] = useState<number>(3);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/system/usage-analytics?stale_days=${staleDays}`, {
        headers: { 'x-simulated-role': 'company_admin' },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [staleDays]);

  if (loading && !data) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Aggregating platform telemetry and device health metrics...</p>
      </div>
    );
  }

  const timeline = data?.subscriberTimeline || [];
  const maxTimelineSub = Math.max(...timeline.map((t: any) => t.totalSubscribers), 10);
  const capacityAlerts = data?.capacityAlerts || [];
  const staleDevices = data?.staleDevices || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            <span>Usage & Telemetry Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Subscriber growth trends, quota exhaustion risk, and stale biometric device synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Quick Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Enrolled Subscribers</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{summary.totalSubscribers || 0}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>+18% growth over last 6 months</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Capacity Risk (≥ 80% Limit)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">{capacityAlerts.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Tenants requiring plan tier upgrades</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Stale Kiosk Devices (&gt; {staleDays}d)</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">{staleDevices.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Gates needing connection inspection</div>
        </div>
      </div>

      {/* Chart: Multi-Tenant Subscriber Growth over Time */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Multi-Tenant Subscriber Growth (6-Month Trend)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Aggregated biometric memberships across all active client organizations</p>
          </div>
          <span className="text-xs text-indigo-400 font-mono font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Active MRR Base
          </span>
        </div>

        {/* Visual SVG Histogram / Area Bars */}
        <div className="pt-6 pb-2">
          <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 px-2">
            {timeline.map((item: any) => {
              const heightPct = Math.max(15, Math.round((item.totalSubscribers / maxTimelineSub) * 100));
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[11px] font-mono text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                    {item.totalSubscribers}
                  </div>
                  <div className="w-full bg-slate-950/80 rounded-xl h-full flex items-end p-1 overflow-hidden border border-slate-800">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-indigo-600 to-blue-500 group-hover:from-indigo-500 group-hover:to-blue-400 transition-all duration-300 shadow-lg shadow-indigo-600/20"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Columns: Capacity Alerts & Stale Device Syncs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity Risk Widget */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Tenants Near or Exceeding Quota Limit</span>
            </h2>
            <span className="text-xs text-amber-400 font-mono font-medium">
              {capacityAlerts.length} Flagged
            </span>
          </div>

          {capacityAlerts.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500/80 mb-2" />
              <p>All tenants have healthy subscriber headrooms.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {capacityAlerts.map((alert: any) => (
                <div
                  key={alert.tenantId}
                  onClick={() => onSelectTenant(alert.tenantId)}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {alert.companyName}
                    </span>
                    <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      alert.isExceeded
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {alert.isExceeded ? 'EXCEEDED (100%)' : `${alert.usagePercentage}% FULL`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
                    <span>{alert.subscriberCount} active members</span>
                    <span className="text-slate-500">Cap: {alert.subscriberLimit}</span>
                  </div>

                  <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        alert.isExceeded ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, alert.usagePercentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stale Device Sync Widget */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              <span>Stale Kiosk Sync Telemetry</span>
            </h2>

            {/* Threshold Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Threshold:</span>
              <select
                value={staleDays}
                onChange={(e) => setStaleDays(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value={1}>&gt; 1 Day</option>
                <option value={3}>&gt; 3 Days</option>
                <option value={7}>&gt; 7 Days</option>
              </select>
            </div>
          </div>

          {staleDevices.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500/80 mb-2" />
              <p>All kiosk devices across all tenants have synced recently.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staleDevices.map((dev: any) => (
                <div
                  key={dev.deviceId}
                  onClick={() => onSelectTenant(dev.tenantId)}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      <HardDrive className="w-4 h-4 text-purple-400" />
                      <span>{dev.deviceName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full font-semibold">
                      {dev.daysSinceSync !== null ? `${dev.daysSinceSync}d without sync` : 'Never Synced'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                    <span className="text-slate-300 font-medium">Tenant: {dev.tenantName}</span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      Last: {dev.lastSyncedAt ? new Date(dev.lastSyncedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
