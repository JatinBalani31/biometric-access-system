import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, RefreshCw, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { ActiveRoleConfig } from './RoleSelector.tsx';

interface Plan {
  id: number;
  tenantId: number;
  name: string;
  durationDays: number;
  price: string;
  createdAt: string;
}

interface PlansManagerProps {
  authConfig: ActiveRoleConfig;
}

export const PlansManager: React.FC<PlansManagerProps> = ({ authConfig }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [price, setPrice] = useState('49.99');

  const getHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authConfig.role === 'company_admin') {
      headers['x-simulated-role'] = 'company_admin';
      headers['x-simulated-email'] = authConfig.email || 'superadmin@platform.io';
    } else if (authConfig.role === 'tenant_admin') {
      headers['x-simulated-role'] = 'tenant_admin';
      headers['x-simulated-tenant-id'] = String(authConfig.tenantId || 1);
    }
    return headers;
  };

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/plans', { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPlans(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [authConfig]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name,
          duration_days: durationDays,
          price,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error}`);
        return;
      }

      setShowCreateModal(false);
      setName('');
      fetchPlans();
    } catch (err: any) {
      alert(`Create plan error: ${err.message}`);
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscription plan?')) return;
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) fetchPlans();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Subscription Plans
          </h2>
          <p className="text-xs text-slate-400">
            Tenant-isolated plan durations, pricing tiers, and membership options
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPlans}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
            title="Refresh plans"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading plans: {error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
          <span className="animate-pulse">Loading subscription plans...</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-2">
          <CreditCard className="w-8 h-8 mx-auto text-slate-400 opacity-40" />
          <h3 className="text-sm font-semibold text-slate-200">No Plans Configured</h3>
          <p className="text-xs text-slate-400">Create subscription pricing plans for this tenant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400">Tenant #{plan.tenantId}</span>
                  <h3 className="text-sm font-bold text-slate-100">{plan.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-emerald-400">${plan.price}</div>
                  <div className="text-[10px] text-slate-400">{plan.durationDays} days</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Duration: {plan.durationDays} days</span>
                </div>
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  className="text-rose-400 hover:underline text-[11px] cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-100">Create Subscription Plan</h3>
            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VIP All-Access Quarterly"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price ($ USD)</label>
                  <input
                    type="text"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="49.99"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                  />
                </div>
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
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
