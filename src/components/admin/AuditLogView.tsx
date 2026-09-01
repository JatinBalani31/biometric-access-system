import { api } from '../../lib/api-client.ts';
import React, { useState, useEffect } from 'react';
import {
  History,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = actionFilter !== 'all' ? `/api/system/audit-logs?action=${actionFilter}` : '/api/system/audit-logs';
      const data = await api.get(url);
      setLogs(data.logs || []);
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((l) => {
    const actorMatch = l.actorEmail?.toLowerCase().includes(search.toLowerCase());
    const tenantMatch = l.tenantName?.toLowerCase().includes(search.toLowerCase());
    const actionMatch = l.action?.toLowerCase().includes(search.toLowerCase());
    return actorMatch || tenantMatch || actionMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Administrative Audit Log</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable system record of all tenant modifications, quota adjustments, and access revocations
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer self-start sm:self-auto"
          title="Refresh logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor email, company name, or action..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Action Types</option>
          <option value="TENANT_CREATED">TENANT_CREATED</option>
          <option value="TENANT_LIMIT_UPDATED">TENANT_LIMIT_UPDATED</option>
          <option value="TENANT_PLAN_UPDATED">TENANT_PLAN_UPDATED</option>
          <option value="TENANT_STATUS_UPDATED">TENANT_STATUS_UPDATED</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th className="py-3 px-6">Timestamp</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Target Tenant</th>
              <th className="py-3 px-6">Change Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                  No matching audit records found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 text-slate-400 font-mono text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>

                  <td className="py-4 px-4">
                    <span className="font-mono text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                      {log.action}
                    </span>
                  </td>

                  <td className="py-4 px-4">
                    <div className="font-medium text-white text-xs">{log.actorEmail}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{log.actorRole || 'company_admin'}</div>
                  </td>

                  <td className="py-4 px-4 font-medium text-slate-300 text-xs">
                    {log.tenantName ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{log.tenantName}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="py-4 px-6">
                    {log.newState ? (
                      <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/80 max-w-md overflow-x-auto whitespace-pre-wrap">
                        {log.newState}
                      </pre>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
