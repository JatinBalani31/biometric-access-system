import React, { useState } from 'react';
import {
  Building2,
  Users,
  HardDrive,
  Activity,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  Layers
} from 'lucide-react';

interface TenantListViewProps {
  tenants: any[];
  loading: boolean;
  onSelectTenant: (tenantId: number) => void;
  onOpenCreateModal: () => void;
  onToggleStatus: (tenantId: number, currentStatus: string, companyName: string) => void;
  onRefresh: () => void;
}

export const TenantListView: React.FC<TenantListViewProps> = ({
  tenants,
  loading,
  onSelectTenant,
  onOpenCreateModal,
  onToggleStatus,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'starter' | 'pro' | 'enterprise'>('all');

  // Filter logic
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch = t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesTier = tierFilter === 'all' || (t.planTier || 'starter').toLowerCase() === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  // KPI Calculations
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const suspendedTenants = tenants.filter((t) => t.status === 'suspended').length;
  const totalSubscribers = tenants.reduce((acc, t) => acc + (t.currentSubscribers || 0), 0);
  const totalDevices = tenants.reduce((acc, t) => acc + (t.currentDevices || 0), 0);

  // Approximate MRR ($99 starter, $299 pro, $799 enterprise)
  const mrr = tenants.reduce((sum, t) => {
    if (t.status === 'suspended') return sum;
    const tier = (t.planTier || 'starter').toLowerCase();
    const rate = tier === 'enterprise' ? 799 : tier === 'pro' ? 299 : 99;
    return sum + rate;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <span>B2B Tenant Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global management, subscription quotas, and biometric sync health across all clients
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Refresh tenants"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Tenant</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Tenants</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-2 font-mono">{totalTenants}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Enrolled organizations</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Tenants</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-2 font-mono">{activeTenants}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">Operational</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Suspended</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 mt-2 font-mono">{suspendedTenants}</div>
          <div className="text-[11px] text-rose-500/80 mt-0.5">Access locked</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Subscribers</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400 mt-2 font-mono">{totalSubscribers}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across all tenants</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Kiosk Devices</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-400 mt-2 font-mono">{totalDevices}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Connected gates</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Platform MRR</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-2 font-mono">${mrr}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Recurring / mo</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company name or contact email..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          {/* Plan Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Tiers</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Company / Organization</th>
                <th className="py-3.5 px-4">Plan Tier</th>
                <th className="py-3.5 px-4">Subscriber Quota</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Latest Kiosk Sync</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm">No matching tenants found.</p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const subCount = t.currentSubscribers || 0;
                  const limit = t.subscriberLimit || 100;
                  const pct = Math.min(100, Math.round((subCount / limit) * 100));
                  const isAtCapacity = pct >= 90;
                  const isSuspended = t.status === 'suspended';

                  // Tier badge styling
                  const tier = (t.planTier || 'starter').toLowerCase();
                  const tierBadgeColor =
                    tier === 'enterprise'
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      : tier === 'pro'
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      : 'bg-slate-700/30 border-slate-600/40 text-slate-300';

                  // Sync Health Badge
                  const syncHealth = t.syncHealth?.health || 'never';
                  const syncBadge =
                    syncHealth === 'healthy'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : syncHealth === 'warning'
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : syncHealth === 'stale'
                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : 'text-slate-500 bg-slate-800 border-slate-700';

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectTenant(t.id)}
                    >
                      {/* Company Name & Email */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                          <span>{t.companyName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">#{t.id}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{t.contactEmail}</div>
                      </td>

                      {/* Plan Tier */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${tierBadgeColor}`}>
                          {t.planTier || 'starter'}
                        </span>
                      </td>

                      {/* Subscriber Quota / Limit */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono text-slate-300 font-medium">
                            {subCount} <span className="text-slate-500">/ {limit}</span>
                          </span>
                          <span className={`text-[11px] font-mono font-semibold ${isAtCapacity ? 'text-rose-400' : 'text-slate-400'}`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-32 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isAtCapacity ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Latest Device Sync */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${syncBadge}`}>
                            {t.syncHealth?.label || 'Never'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {t.currentDevices || 0} device{t.currentDevices === 1 ? '' : 's'} registered
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(t.id, t.status, t.companyName)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                              isSuspended
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                            }`}
                          >
                            {isSuspended ? 'Reactivate' : 'Suspend'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectTenant(t.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="View Tenant Detail"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
