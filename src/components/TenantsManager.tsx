import React, { useState, useEffect } from 'react';
import { Building2, Users, HardDrive, ShieldCheck, AlertCircle, Plus, RefreshCw, Power } from 'lucide-react';
import { ActiveRoleConfig } from './RoleSelector.tsx';

interface Tenant {
  id: number;
  companyName: string;
  contactEmail: string;
  planTier: string;
  subscriberLimit: number;
  status: 'active' | 'suspended' | 'canceled';
  currentSubscribers?: number;
  currentDevices?: number;
  currentPlans?: number;
  createdAt: string;
}

interface TenantsManagerProps {
  authConfig: ActiveRoleConfig;
}

export const TenantsManager: React.FC<TenantsManagerProps> = ({ authConfig }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [planTier, setPlanTier] = useState('pro');
  const [subscriberLimit, setSubscriberLimit] = useState(100);
  const [adminEmail, setAdminEmail] = useState('');

  const fetchTenants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (authConfig.role === 'company_admin') {
        headers['x-simulated-role'] = 'company_admin';
        headers['x-simulated-email'] = authConfig.email || 'superadmin@platform.io';
      } else if (authConfig.role === 'tenant_admin') {
        headers['x-simulated-role'] = 'tenant_admin';
        headers['x-simulated-tenant-id'] = String(authConfig.tenantId || 1);
      }

      const res = await fetch('/api/tenants', { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setTenants(Array.isArray(data) ? data : [data]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [authConfig]);

  const toggleStatus = async (tenantId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/tenants/${tenantId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-role': 'company_admin',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTenants();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-role': 'company_admin',
        },
        body: JSON.stringify({
          company_name: companyName,
          contact_email: contactEmail,
          plan_tier: planTier,
          subscriber_limit: subscriberLimit,
          admin_email: adminEmail,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error creating tenant: ${err.error}`);
        return;
      }

      setShowCreateModal(false);
      setCompanyName('');
      setContactEmail('');
      fetchTenants();
    } catch (err: any) {
      alert(`Create tenant error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Tenants Directory
          </h2>
          <p className="text-xs text-slate-400">
            {authConfig.role === 'company_admin'
              ? 'Global Platform View: All client organizations, capacity limits, and statuses'
              : `Scoped View: Restricted strictly to ${authConfig.tenantName || 'your organization'}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTenants}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
            title="Refresh tenants"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {authConfig.role === 'company_admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Tenant
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading tenants: {error}</span>
        </div>
      )}

      {/* Tenants Grid */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
          <span className="animate-pulse">Loading tenants from PostgreSQL...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((tenant) => {
            const subCount = tenant.currentSubscribers ?? 0;
            const subLimit = tenant.subscriberLimit;
            const usagePercent = Math.min(100, Math.round((subCount / subLimit) * 100));
            const isFull = subCount >= subLimit;

            return (
              <div
                key={tenant.id}
                className={`bg-slate-900 border rounded-xl p-5 space-y-4 shadow-sm transition ${
                  tenant.status === 'suspended'
                    ? 'border-amber-700/60 bg-amber-950/10'
                    : isFull
                    ? 'border-rose-700/60 bg-slate-900'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400">ID #{tenant.id}</span>
                    <h3 className="text-sm font-bold text-slate-100">{tenant.companyName}</h3>
                    <p className="text-xs text-slate-400">{tenant.contactEmail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        tenant.status === 'active'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {tenant.status}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                      Tier: {tenant.planTier}
                    </span>
                  </div>
                </div>

                {/* Capacity Usage Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Subscribers Capacity</span>
                    <span className={isFull ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      {subCount} / {subLimit} {isFull ? '(LIMIT REACHED)' : ''}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull ? 'bg-rose-500' : usagePercent > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{subCount} Subscribers</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tenant.currentDevices ?? 0} Kiosks</span>
                  </div>
                </div>

                {/* Company Admin Actions */}
                {authConfig.role === 'company_admin' && (
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => toggleStatus(tenant.id, tenant.status)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                        tenant.status === 'active'
                          ? 'bg-amber-900/30 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50'
                          : 'bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {tenant.status === 'active' ? 'Suspend Tenant' : 'Reactivate Tenant'}
                    </button>
                    <span className="text-[10px] text-slate-400">PostgreSQL</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for creating tenant */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-100">Create New Tenant Organization</h3>
            <form onSubmit={handleCreateTenant} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Skyline Co-Working"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Plan Tier</label>
                  <select
                    value={planTier}
                    onChange={(e) => setPlanTier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subscriber Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={subscriberLimit}
                    onChange={(e) => setSubscriberLimit(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Initial Tenant Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Create Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
