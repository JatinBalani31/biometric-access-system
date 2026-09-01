import { api } from '../../lib/api-client.ts';
import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CreditCard,
  Building2,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  Receipt
} from 'lucide-react';

interface BillingViewProps {
  onSelectTenant: (tenantId: number) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ onSelectTenant }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      setData(await api.get('/api/system/billing'));
    } catch (err) {
      console.warn('Billing fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  if (loading && !data) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading B2B subscription billing summaries & recurring revenue...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const tierBreakdown = data?.tierBreakdown || {};
  const tenants = data?.tenants || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>Platform Billing & Revenue</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Subscription tier tracking, monthly recurring charges per tenant, and annual run rate
          </p>
        </div>
        <button
          onClick={fetchBilling}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer self-start sm:self-auto"
          title="Refresh billing"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* High Level Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 shadow-xl">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
            <span>Platform MRR</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-2 font-mono">
            ${summary.mrr?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-indigo-400 mt-1 font-medium">Monthly Recurring Revenue</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Annual Run Rate (ARR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2 font-mono">
            ${summary.arr?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Annualized contract value</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Active Paying Accounts</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-2 font-mono">
            {summary.activePayingTenants || 0} <span className="text-sm font-normal text-slate-500">/ {summary.totalTenants || 0}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total subscribed organizations</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Avg Revenue Per Tenant (ARPU)</span>
            <Receipt className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-300 mt-2 font-mono">
            ${summary.activePayingTenants ? Math.round(summary.mrr / summary.activePayingTenants) : 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Blended monthly average</div>
        </div>
      </div>

      {/* Tier Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(tierBreakdown).map(([tierKey, tierInfo]: [string, any]) => (
          <div key={tierKey} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-400 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                {tierKey} Tier
              </span>
              <span className="text-lg font-bold text-white font-mono">
                ${tierInfo.pricePerMonth}<span className="text-xs font-normal text-slate-500">/mo</span>
              </span>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed">{tierInfo.features}</div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Enrolled Tenants</span>
              <span className="font-bold text-white font-mono">{tierInfo.count} clients</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Tenant Billing Ledger Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <span>Monthly Tenant Billing Ledger</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">All amounts in USD</span>
        </div>

        <div className="overflow-x-auto -mx-6 -mb-6">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/60 border-y border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-6">Tenant Organization</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Active Members</th>
                <th className="py-3 px-4">Monthly Rate</th>
                <th className="py-3 px-4">Billing Status</th>
                <th className="py-3 px-6 text-right">Next Invoice Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tenants.map((t: any) => {
                const isSuspended = t.status === 'suspended';
                return (
                  <tr
                    key={t.tenantId}
                    onClick={() => onSelectTenant(t.tenantId)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                        {t.companyName}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{t.contactEmail}</div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-mono text-xs font-semibold uppercase text-slate-300">
                        {t.planTier}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-300 text-xs">
                      {t.subscriberCount} <span className="text-slate-500">/ {t.subscriberLimit}</span>
                    </td>

                    <td className="py-4 px-4 font-mono text-sm font-bold text-white">
                      ${t.monthlyRate.toFixed(2)}
                    </td>

                    <td className="py-4 px-4">
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400">
                          {t.billingStatus}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t.billingStatus}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right font-mono text-xs text-slate-400">
                      {t.nextInvoiceDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
