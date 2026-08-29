import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Users,
  HardDrive,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Check,
  X,
  Clock,
  Key,
  AlertTriangle,
  History,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface TenantDetailViewProps {
  tenantId: number;
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const TenantDetailView: React.FC<TenantDetailViewProps> = ({
  tenantId,
  onBack,
  onShowToast,
}) => {
  const [tenant, setTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subscribers' | 'devices' | 'audit' | 'plans'>('subscribers');

  // Edit States
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [newLimit, setNewLimit] = useState<number>(100);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  const [isEditingTier, setIsEditingTier] = useState(false);
  const [newTier, setNewTier] = useState<'starter' | 'pro' | 'enterprise'>('starter');
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);

  // Suspend/Activate Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Subscriber Search
  const [subSearch, setSubSearch] = useState('');

  // Pairing Code Modal State
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingDeviceName, setPairingDeviceName] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [pairingResult, setPairingResult] = useState<{ code: string; expiresAt: string } | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingSecondsLeft, setPairingSecondsLeft] = useState(0);

  useEffect(() => {
    if (!pairingResult) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(pairingResult.expiresAt).getTime() - Date.now()) / 1000));
      setPairingSecondsLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pairingResult]);

  const handleGeneratePairingCode = async () => {
    if (!pairingDeviceName.trim()) {
      setPairingError('Enter a name for this kiosk (e.g. "Front Desk Turnstile").');
      return;
    }
    setIsGeneratingCode(true);
    setPairingError(null);
    try {
      const res = await fetch('/api/devices/generate-pairing-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-role': 'company_admin',
        },
        body: JSON.stringify({ tenant_id: tenantId, device_name: pairingDeviceName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate pairing code');
      setPairingResult({ code: data.pairingCode, expiresAt: data.expiresAt });
    } catch (err: any) {
      setPairingError(err.message);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const closePairingModal = () => {
    setShowPairingModal(false);
    setPairingDeviceName('');
    setPairingResult(null);
    setPairingError(null);
    fetchTenantDetails();
  };

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}`, {
        headers: { 'x-simulated-role': 'company_admin' },
      });
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
        setNewLimit(data.subscriberLimit || 100);
        setNewTier(data.planTier || 'starter');
      } else {
        onShowToast('Failed to load tenant details', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantDetails();
  }, [tenantId]);

  // Handle Subscriber Limit Update
  const handleSaveLimit = async () => {
    if (newLimit < 1) {
      onShowToast('Subscriber limit must be at least 1', 'error');
      return;
    }

    try {
      setIsUpdatingLimit(true);
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-role': 'company_admin',
        },
        body: JSON.stringify({
          subscriber_limit: newLimit,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast(`Subscriber limit updated to ${newLimit} (logged to audit_logs)`, 'success');
        setIsEditingLimit(false);
        fetchTenantDetails();
      } else {
        onShowToast(data.error || 'Failed to update limit', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  // Handle Plan Tier Update
  const handleSaveTier = async () => {
    try {
      setIsUpdatingTier(true);
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-role': 'company_admin',
        },
        body: JSON.stringify({
          plan_tier: newTier,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast(`Plan tier updated to ${newTier.toUpperCase()} (logged to audit_logs)`, 'success');
        setIsEditingTier(false);
        fetchTenantDetails();
      } else {
        onShowToast(data.error || 'Failed to update tier', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setIsUpdatingTier(false);
    }
  };

  // Handle Suspend/Activate Status Toggle
  const handleConfirmStatusToggle = async () => {
    const nextStatus = tenant?.status === 'suspended' ? 'active' : 'suspended';
    try {
      setIsUpdatingStatus(true);
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-role': 'company_admin',
        },
        body: JSON.stringify({
          status: nextStatus,
          reason: statusReason || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast(
          `Tenant ${nextStatus === 'suspended' ? 'Suspended (Access locked)' : 'Reactivated (Access restored)'}`,
          nextStatus === 'suspended' ? 'error' : 'success'
        );
        setShowStatusModal(false);
        setStatusReason('');
        fetchTenantDetails();
      } else {
        onShowToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading full tenant telemetry & subscriber registry...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-white">Tenant Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">The requested tenant does not exist or was deleted.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  const isSuspended = tenant.status === 'suspended';
  const subCount = tenant.currentSubscribers || 0;
  const limit = tenant.subscriberLimit || 100;
  const usagePct = Math.min(100, Math.round((subCount / limit) * 100));

  const filteredSubs = (tenant.subscribers || []).filter((s: any) => {
    return (
      s.name.toLowerCase().includes(subSearch.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(subSearch.toLowerCase())) ||
      (s.planName && s.planName.toLowerCase().includes(subSearch.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Breadcrumbs & Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tenant Directory</span>
        </button>

        {/* Suspend / Activate CTA */}
        <button
          onClick={() => setShowStatusModal(true)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
            isSuspended
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
          }`}
        >
          {isSuspended ? 'Reactivate Tenant' : 'Suspend Tenant'}
        </button>
      </div>

      {/* Tenant Profile Banner Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-blue-600/20 border border-indigo-500/30 text-indigo-400">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{tenant.companyName}</h1>
                <span className="text-xs font-mono text-slate-500">ID: #{tenant.id}</span>
                {isSuspended ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Suspended
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">{tenant.contactEmail}</p>
            </div>
          </div>

          {/* Quick Config Pills (Plan Tier & Subscriber Limit) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Plan Tier Pill */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 min-w-[160px]">
              <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                <span>Plan Tier</span>
                {!isEditingTier && (
                  <button
                    onClick={() => setIsEditingTier(true)}
                    className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              {isEditingTier ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <button
                    onClick={handleSaveTier}
                    disabled={isUpdatingTier}
                    className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    title="Save Tier"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingTier(false)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-sm font-bold text-white uppercase tracking-wider font-mono mt-1 text-indigo-400">
                  {tenant.planTier || 'starter'}
                </div>
              )}
            </div>

            {/* Subscriber Limit Pill */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 min-w-[170px]">
              <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                <span>Subscriber Limit</span>
                {!isEditingLimit && (
                  <button
                    onClick={() => setIsEditingLimit(true)}
                    className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              {isEditingLimit ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <input
                    type="number"
                    min="1"
                    value={newLimit}
                    onChange={(e) => setNewLimit(parseInt(e.target.value, 10) || 1)}
                    className="w-20 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    onClick={handleSaveLimit}
                    disabled={isUpdatingLimit}
                    className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    title="Save Limit"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingLimit(false)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-sm font-bold text-white font-mono mt-1">
                  {subCount} <span className="text-slate-500 font-normal">/ {limit}</span>{' '}
                  <span className={`text-xs ${usagePct >= 80 ? 'text-amber-400' : 'text-slate-400'}`}>
                    ({usagePct}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'subscribers'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Subscribers ({tenant.subscribers?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'devices'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Kiosk Fleet & Sync ({tenant.devices?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Tenant Audit History ({tenant.auditLogs?.length || 0})</span>
        </button>
      </div>

      {/* Tab 1: Subscribers (Read-Only) */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Search tenant members by name, email, plan..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Showing {filteredSubs.length} of {tenant.subscribers?.length || 0} registered
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Member Name</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Subscription Plan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6">Valid Until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSubs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500 text-xs">
                      No subscribers registered for this tenant yet.
                    </td>
                  </tr>
                ) : (
                  filteredSubs.map((sub: any) => {
                    const isExp = new Date(sub.endDate).getTime() < Date.now();
                    return (
                      <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="font-semibold text-white">{sub.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: #{sub.id}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">
                          <div>{sub.email || '—'}</div>
                          {sub.phone && <div className="text-[11px] text-slate-500">{sub.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 text-xs">
                          {sub.planName || 'Standard Pass'}
                        </td>
                        <td className="py-3.5 px-4">
                          {isExp || sub.status === 'expired' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-400 font-mono">
                          {new Date(sub.endDate).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Devices & Sync Health */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowPairingModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition"
            >
              <HardDrive className="w-4 h-4" /> Add Kiosk Device
            </button>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Device Name</th>
                  <th className="py-3.5 px-4">Device Token Preview</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Biometric Sync Health</th>
                  <th className="py-3.5 px-4 sm:px-6">Last Sync Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {!tenant.devices || tenant.devices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500 text-xs">
                      No kiosk devices registered for this tenant.
                    </td>
                  </tr>
                ) : (
                  tenant.devices.map((dev: any) => {
                    const health = dev.syncHealth?.health || 'never';
                    const badgeColor =
                      health === 'healthy'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : health === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : health === 'stale'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-slate-800 border-slate-700 text-slate-500';
                    const isPending = dev.status === 'pending';

                    return (
                      <tr key={dev.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-purple-400" />
                            <span>{dev.deviceName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-indigo-300">
                          {dev.deviceToken?.substring(0, 16)}...
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              isPending
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isPending ? 'Awaiting Pairing' : 'Active'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}>
                            {dev.syncHealth?.label || 'Never Synced'}
                          </span>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-xs text-slate-400 font-mono">
                          {dev.lastSyncedAt ? new Date(dev.lastSyncedAt).toLocaleString() : 'Never'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Tenant Audit History */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <span>Administrative Audit Trail for {tenant.companyName}</span>
            </h3>

            {(!tenant.auditLogs || tenant.auditLogs.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">No audit entries recorded for this tenant yet.</p>
            ) : (
              <div className="space-y-3">
                {tenant.auditLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-indigo-400 font-semibold uppercase text-[11px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {log.action}
                        </span>
                        <span className="text-slate-300 font-medium">by {log.actorEmail}</span>
                      </div>
                      {log.newState && (
                        <div className="text-[11px] text-slate-400 font-mono mt-1.5 bg-slate-900/80 p-2 rounded border border-slate-800">
                          State: {log.newState}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Confirmation Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl border ${isSuspended ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                {isSuspended ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {isSuspended ? 'Reactivate Tenant Organization' : 'Suspend Tenant Organization'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isSuspended
                    ? `This will restore kiosk gate access and subscriber validation for ${tenant.companyName}.`
                    : `This will immediately revoke biometric gate access for all kiosks under ${tenant.companyName}.`}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reason / Note for Audit Log</label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Invoiced paid in full, or Non-payment of subscription..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusToggle}
                disabled={isUpdatingStatus}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all cursor-pointer ${
                  isSuspended
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {isUpdatingStatus ? 'Updating...' : isSuspended ? 'Confirm Reactivation' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Kiosk Device / Pairing Code Modal */}
      {showPairingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl border bg-indigo-500/10 border-indigo-500/30 text-indigo-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Add Kiosk Device</h3>
                <p className="text-slate-400 text-xs mt-1">
                  {pairingResult
                    ? 'Enter this code on the kiosk\'s pairing screen. It expires in 10 minutes.'
                    : 'Generate a one-time pairing code — no manual device token entry needed on the kiosk.'}
                </p>
              </div>
            </div>

            {!pairingResult ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Kiosk Name</label>
                  <input
                    type="text"
                    value={pairingDeviceName}
                    onChange={(e) => setPairingDeviceName(e.target.value)}
                    placeholder="e.g. Front Desk Turnstile"
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-700 focus:border-indigo-500 text-white text-sm rounded-xl outline-none transition placeholder:text-slate-600"
                  />
                </div>
                {pairingError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
                    {pairingError}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closePairingModal}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGeneratePairingCode}
                    disabled={isGeneratingCode}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isGeneratingCode ? 'Generating...' : 'Generate Pairing Code'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-950/60 border border-indigo-500/30 rounded-2xl py-8 flex flex-col items-center gap-2">
                  <div className="text-4xl font-mono font-bold text-white tracking-[0.3em]">{pairingResult.code}</div>
                  <div className="text-xs text-slate-500">
                    {pairingSecondsLeft > 0
                      ? `Expires in ${Math.floor(pairingSecondsLeft / 60)}:${String(pairingSecondsLeft % 60).padStart(2, '0')}`
                      : 'Code expired — generate a new one'}
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={closePairingModal}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
