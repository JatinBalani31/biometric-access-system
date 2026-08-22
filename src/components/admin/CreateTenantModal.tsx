import React, { useState } from 'react';
import { X, Building, Mail, Shield, Check, Copy, Sparkles, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantCreated: (tenant: any) => void;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  isOpen,
  onClose,
  onTenantCreated,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [planTier, setPlanTier] = useState<'starter' | 'pro' | 'enterprise'>('starter');
  const [subscriberLimit, setSubscriberLimit] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success State with Generated Invite
  const [createdResult, setCreatedResult] = useState<any | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  if (!isOpen) return null;

  const handleTierChange = (tier: 'starter' | 'pro' | 'enterprise') => {
    setPlanTier(tier);
    if (tier === 'starter') setSubscriberLimit(50);
    else if (tier === 'pro') setSubscriberLimit(250);
    else setSubscriberLimit(1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactEmail.trim()) {
      setError('Company Name and Contact Email are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-role': 'company_admin',
        },
        body: JSON.stringify({
          company_name: companyName.trim(),
          contact_email: contactEmail.trim(),
          admin_email: adminEmail.trim() || contactEmail.trim(),
          plan_tier: planTier,
          subscriber_limit: subscriberLimit,
          status: 'active',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tenant');
      }

      setCreatedResult(data);
      onTenantCreated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (createdResult?.invite?.inviteUrl) {
      navigator.clipboard.writeText(createdResult.invite.inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 3000);
    }
  };

  const handleCloseAll = () => {
    setCreatedResult(null);
    setCompanyName('');
    setContactEmail('');
    setAdminEmail('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {createdResult ? 'Tenant Created Successfully' : 'Onboard New B2B Tenant'}
              </h2>
              <p className="text-xs text-slate-400">
                {createdResult ? 'First tenant administrator invitation ready' : 'Configure tenant tier, quotas, and admin access'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {createdResult ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-3">
              <Sparkles className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  {createdResult.companyName} is live!
                </p>
                <p className="text-xs text-emerald-400/90 mt-0.5">
                  Plan: <span className="uppercase font-semibold">{createdResult.planTier}</span> · Limit: {createdResult.subscriberLimit} Subscribers
                </p>
              </div>
            </div>

            {/* Generated Admin Invite */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  Auto-Generated Tenant Admin Invite
                </span>
                <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Expires in 7 days
                </span>
              </div>

              <div className="text-xs text-slate-400">
                Invited Admin: <span className="text-slate-200 font-mono">{createdResult.invite?.adminEmail}</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdResult.invite?.inviteUrl || ''}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedInvite ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Send this link to the customer admin. They will establish their credentials and gain access to their tenant kiosk control portal.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleCloseAll}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-all cursor-pointer"
              >
                Done & View Tenants
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Company / Organization Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Health & Fitness"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="billing@acme.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">First Admin Email (Optional)</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Plan Tier Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Initial Plan Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'starter', label: 'Starter', price: '$99/mo', limit: '50 subs' },
                  { id: 'pro', label: 'Pro', price: '$299/mo', limit: '250 subs' },
                  { id: 'enterprise', label: 'Enterprise', price: '$799/mo', limit: '1,000+ subs' },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleTierChange(tier.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      planTier === tier.id
                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white">{tier.label}</div>
                    <div className="text-[11px] text-indigo-400 font-mono mt-0.5">{tier.price}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{tier.limit}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subscriber Limit Override */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Subscriber Quota Limit</label>
                <span className="text-xs text-indigo-400 font-mono font-semibold">{subscriberLimit} subscribers</span>
              </div>
              <input
                type="number"
                min="1"
                max="50000"
                value={subscriberLimit}
                onChange={(e) => setSubscriberLimit(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Hard ceiling enforced by backend API during subscriber registration.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseAll}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create & Generate Invite</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
