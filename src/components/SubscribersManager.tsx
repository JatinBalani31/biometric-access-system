import React, { useState, useEffect } from 'react';
import { Users, Clock, AlertTriangle, CheckCircle, Shield, Plus, RefreshCw, Sparkles, UserPlus, Eye } from 'lucide-react';
import { ActiveRoleConfig } from './RoleSelector.tsx';

interface Subscriber {
  id: number;
  tenantId: number;
  name: string;
  email: string | null;
  phone: string | null;
  planId: number | null;
  planName?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'suspended';
  daysLeft: number;
  isExpired: boolean;
  effectiveStatus: string;
}

interface Plan {
  id: number;
  name: string;
  durationDays: number;
  price: string;
}

interface SubscribersManagerProps {
  authConfig: ActiveRoleConfig;
}

export const SubscribersManager: React.FC<SubscribersManagerProps> = ({ authConfig }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubDaysLeft, setSelectedSubDaysLeft] = useState<any>(null);
  const [selectedEmbedding, setSelectedEmbedding] = useState<any>(null);
  const [isEmbeddingLoading, setIsEmbeddingLoading] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [limitErrorDetails, setLimitErrorDetails] = useState<any>(null);

  // Add form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState<number | ''>('');
  const [durationDays, setDurationDays] = useState(30);

  const getHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authConfig.role === 'company_admin') {
      headers['x-simulated-role'] = 'company_admin';
      headers['x-simulated-email'] = authConfig.email || 'superadmin@platform.io';
    } else if (authConfig.role === 'tenant_admin') {
      headers['x-simulated-role'] = 'tenant_admin';
      headers['x-simulated-tenant-id'] = String(authConfig.tenantId || 1);
      headers['x-simulated-email'] = authConfig.email || 'admin@tenant.com';
    } else if (authConfig.role === 'device') {
      headers['x-device-token'] = authConfig.deviceToken || '';
    }
    return headers;
  };

  const fetchSubscribersAndPlans = async () => {
    setIsLoading(true);
    setError(null);
    setLimitErrorDetails(null);
    try {
      const headers = getHeaders();
      const [subRes, planRes] = await Promise.all([
        fetch('/api/subscribers', { headers }),
        fetch('/api/plans', { headers }),
      ]);

      const subData = await subRes.json();
      const planData = await planRes.json();

      if (!subRes.ok) {
        throw new Error(subData.error || `HTTP ${subRes.status}`);
      }

      setSubscribers(subData.data || []);
      setPlans(Array.isArray(planData) ? planData : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribersAndPlans();
  }, [authConfig]);

  const handleFetchDaysLeft = async (subscriberId: number) => {
    try {
      const res = await fetch(`/api/subscribers/${subscriberId}/days-left`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      setSelectedSubDaysLeft(data);
    } catch (err) {
      console.error('Error fetching days left:', err);
    }
  };

  const handleFetchEmbedding = async (subscriberId: number) => {
    setIsEmbeddingLoading(true);
    setSelectedEmbedding(null);
    try {
      const res = await fetch(`/api/subscribers/${subscriberId}/face-embedding`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      setSelectedEmbedding(data);
    } catch (err) {
      console.error('Error fetching embedding:', err);
    } finally {
      setIsEmbeddingLoading(false);
    }
  };

  const handleCreateSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setLimitErrorDetails(null);
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name,
          email,
          phone,
          plan_id: planId || undefined,
          duration_days: durationDays,
          generate_embedding: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'LIMIT_EXCEEDED') {
          setLimitErrorDetails(data);
        } else {
          alert(`Error: ${data.error}`);
        }
        return;
      }

      setShowAddModal(false);
      setName('');
      setEmail('');
      setPhone('');
      fetchSubscribersAndPlans();
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    }
  };

  const handleDeleteSubscriber = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscriber? This will also revoke their Firestore face embedding.')) return;
    try {
      const res = await fetch(`/api/subscribers/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        fetchSubscribersAndPlans();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Subscribers & Membership Limits
          </h2>
          <p className="text-xs text-slate-400">
            Filtered strictly by tenant • Real-time days_left calculation • Face embeddings in Firestore
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSubscribersAndPlans}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
            title="Refresh subscribers"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="add-subscriber-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Subscriber
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Error loading subscribers: {error}</span>
        </div>
      )}

      {/* Limit Exceeded Alert Banner */}
      {limitErrorDetails && (
        <div className="p-4 bg-rose-950/70 border border-rose-600/70 rounded-xl text-xs text-rose-200 space-y-2 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-rose-100">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>HTTP 422: {limitErrorDetails.code} (Limit Exceeded)</span>
          </div>
          <p>{limitErrorDetails.error}</p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-rose-300">
            <span>Capacity Limit: {limitErrorDetails.limit}</span>
            <span>Current Active: {limitErrorDetails.currentCount}</span>
          </div>
        </div>
      )}

      {/* Subscribers Table */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
          <span className="animate-pulse">Querying PostgreSQL subscribers...</span>
        </div>
      ) : subscribers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-2">
          <Users className="w-8 h-8 mx-auto text-slate-400 opacity-40" />
          <h3 className="text-sm font-semibold text-slate-200">No Subscribers Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click "Add Subscriber" above to create members for this tenant organization.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Subscriber</th>
                  <th className="py-3 px-4">Subscription Plan</th>
                  <th className="py-3 px-4">Start / End Date</th>
                  <th className="py-3 px-4">Days Left (Computed)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subscribers.map((sub) => {
                  const days = sub.daysLeft;
                  const isExp = sub.isExpired || days <= 0;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{sub.name}</div>
                        <div className="text-[11px] text-slate-400">{sub.email || sub.phone || 'No contact'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-300">{sub.planName || 'Custom'}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        <div>Start: {new Date(sub.startDate).toISOString().split('T')[0]}</div>
                        <div>End: {new Date(sub.endDate).toISOString().split('T')[0]}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              isExp
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : days <= 7
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {days} {days === 1 ? 'day' : 'days'}
                          </span>
                          <button
                            onClick={() => handleFetchDaysLeft(sub.id)}
                            className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                            title="Inspect computed telemetry"
                          >
                            Inspect
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isExp
                              ? 'bg-rose-900/40 text-rose-400'
                              : sub.status === 'active'
                              ? 'bg-emerald-900/40 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isExp ? 'Expired' : sub.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleFetchEmbedding(sub.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-medium transition cursor-pointer"
                            title="View Firestore face embedding vector"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            Vector
                          </button>
                          <button
                            onClick={() => handleDeleteSubscriber(sub.id)}
                            className="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[11px] font-medium transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Days Left Inspection Modal */}
      {selectedSubDaysLeft && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Computed Days Left: {selectedSubDaysLeft.name}
              </h3>
              <button
                onClick={() => setSelectedSubDaysLeft(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap">
              {JSON.stringify(selectedSubDaysLeft, null, 2)}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Subscription Duration Remaining</span>
                <span className="text-slate-200 font-bold">{selectedSubDaysLeft.percentRemaining}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${selectedSubDaysLeft.percentRemaining}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => setSelectedSubDaysLeft(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Face Embedding Vector Inspection Modal */}
      {selectedEmbedding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Firestore Face Embedding ({selectedEmbedding.vectorDimension || 128}-D)
                </h3>
              </div>
              <button
                onClick={() => setSelectedEmbedding(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div>Subscriber: <span className="font-semibold text-white">{selectedEmbedding.subscriberName}</span></div>
              <div>Firestore Doc ID: <span className="font-mono text-indigo-300">{selectedEmbedding.id}</span></div>
              <div>Last Synced: <span className="font-mono text-slate-400">{selectedEmbedding.updatedAt}</span></div>
            </div>

            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-indigo-300 max-h-48 overflow-y-auto">
              <div>Vector Sample (Normalized Floats):</div>
              <div className="text-slate-400 mt-1">
                [{selectedEmbedding.vector?.slice(0, 24).join(', ')} ... +{selectedEmbedding.vector?.length - 24} more values]
              </div>
            </div>

            <button
              onClick={() => setSelectedEmbedding(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Close Vector Inspector
            </button>
          </div>
        </div>
      )}

      {/* Add Subscriber Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-100">Add New Subscriber</h3>
            <form onSubmit={handleCreateSubscriber} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="subscriber@example.com"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assign Subscription Plan</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value ? parseInt(e.target.value, 10) : '')}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                >
                  <option value="">Custom Duration ({durationDays} days)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.durationDays} days - ${p.price})
                    </option>
                  ))}
                </select>
              </div>

              {!planId && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Duration in Days</label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                  />
                </div>
              )}

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                ✨ Biometric facial embedding will be automatically generated and provisioned in Firebase Firestore.
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Create & Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
