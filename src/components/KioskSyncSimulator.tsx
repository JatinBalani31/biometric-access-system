import React, { useState } from 'react';
import { Cpu, RefreshCw, Sparkles, CheckCircle, XCircle, ArrowRight, ShieldCheck, Clock, UserCheck } from 'lucide-react';
import { ActiveRoleConfig } from './RoleSelector.tsx';

interface KioskSyncSimulatorProps {
  authConfig: ActiveRoleConfig;
}

export const KioskSyncSimulator: React.FC<KioskSyncSimulatorProps> = ({ authConfig }) => {
  const [deviceToken, setDeviceToken] = useState<string>(
    authConfig.deviceToken || 'dev_apex_kiosk_main_a109bf83'
  );
  const [sinceTimestamp, setSinceTimestamp] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  // Gate check state
  const [testSubscriberId, setTestSubscriberId] = useState<string>('1');
  const [gateCheckLoading, setGateCheckLoading] = useState<boolean>(false);
  const [gateCheckResult, setGateCheckResult] = useState<any>(null);

  const runSync = async (useSince: boolean) => {
    setIsLoading(true);
    setSyncResult(null);

    const sinceParam = useSince && sinceTimestamp ? `&since=${encodeURIComponent(sinceTimestamp)}` : '';
    const url = `/api/kiosk/face-embeddings?limit=${pageSize}${sinceParam}`;

    try {
      const res = await fetch(url, {
        headers: {
          'x-device-token': deviceToken,
        },
      });

      const data = await res.json();
      setSyncResult({
        status: res.status,
        ok: res.ok,
        data,
      });

      if (res.ok && data.serverTime) {
        setSinceTimestamp(data.serverTime);
        setSyncHistory((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            count: data.embeddings?.length || 0,
            total: data.total,
            since: data.since || 'Full Initial Sync',
          },
          ...prev.slice(0, 4),
        ]);
      }
    } catch (err: any) {
      setSyncResult({
        status: 500,
        ok: false,
        data: { error: err.message },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runGateVerification = async () => {
    setGateCheckLoading(true);
    setGateCheckResult(null);
    try {
      const res = await fetch('/api/kiosk/verify-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': deviceToken,
        },
        body: JSON.stringify({
          subscriber_id: parseInt(testSubscriberId, 10),
        }),
      });

      const data = await res.json();
      setGateCheckResult({
        status: res.status,
        ok: res.ok,
        data,
      });
    } catch (err: any) {
      setGateCheckResult({
        status: 500,
        ok: false,
        data: { error: err.message },
      });
    } finally {
      setGateCheckLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          Kiosk Device Face Embedding Sync Simulator
        </h2>
        <p className="text-xs text-slate-400">
          Simulates an edge hardware turnstile pulling 128-d face embeddings from Firestore with differential timestamps
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sync Controls Panel */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              1. Incremental Face Embeddings Pull
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Kiosk Device Token (<code className="text-amber-300 font-mono text-[11px]">x-device-token</code>)
              </label>
              <input
                type="text"
                value={deviceToken}
                onChange={(e) => setDeviceToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs rounded-lg p-2.5"
                placeholder="dev_..."
              />
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setDeviceToken('dev_apex_kiosk_main_a109bf83')}
                  className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                >
                  Use Apex Kiosk Token
                </button>
                <span className="text-slate-400 text-[10px]">•</span>
                <button
                  type="button"
                  onClick={() => setDeviceToken('dev_metro_reception_kiosk_c71a39d2')}
                  className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                >
                  Use Metro Kiosk Token
                </button>
                <span className="text-slate-400 text-[10px]">•</span>
                <button
                  type="button"
                  onClick={() => setDeviceToken('dev_invalid_token_999')}
                  className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                >
                  Use Invalid Token (401)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Incremental Timestamp Filter (<code className="text-indigo-300 font-mono text-[11px]">since</code>)
              </label>
              <input
                type="text"
                value={sinceTimestamp}
                onChange={(e) => setSinceTimestamp(e.target.value)}
                placeholder="e.g. 2026-08-18T00:00:00.000Z"
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs rounded-lg p-2.5"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Leave empty for initial full sync, or use the last returned timestamp for incremental updates.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => runSync(false)}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Full Initial Sync
              </button>
              <button
                onClick={() => runSync(true)}
                disabled={isLoading || !sinceTimestamp}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow cursor-pointer"
              >
                Incremental Sync (since)
              </button>
            </div>

            {/* Sync History */}
            {syncHistory.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Recent Sync Telemetry</div>
                {syncHistory.map((h, i) => (
                  <div key={i} className="text-[11px] font-mono text-slate-300 flex justify-between bg-slate-950 px-2.5 py-1 rounded">
                    <span>{h.time}: {h.count} vectors synced</span>
                    <span className="text-slate-400">Total: {h.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gate Verification Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              2. Kiosk Turnstile Access Verification
            </h3>
            <p className="text-xs text-slate-400">
              When a subscriber approaches a gate camera, the kiosk matches the face embedding and checks membership validity.
            </p>

            <div className="flex gap-2">
              <input
                type="number"
                value={testSubscriberId}
                onChange={(e) => setTestSubscriberId(e.target.value)}
                placeholder="Subscriber ID (e.g. 1)"
                className="w-36 bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 font-mono"
              />
              <button
                onClick={runGateVerification}
                disabled={gateCheckLoading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                {gateCheckLoading ? 'Verifying...' : 'Verify Turnstile Access'}
              </button>
            </div>

            {gateCheckResult && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  gateCheckResult.data?.accessGranted
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-700 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {gateCheckResult.data?.accessGranted ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{gateCheckResult.data?.reason}</span>
                </div>
                {gateCheckResult.data?.subscriber && (
                  <div className="text-[11px] font-mono opacity-90">
                    <div>Subscriber: {gateCheckResult.data.subscriber.name}</div>
                    <div>Days Left: {gateCheckResult.data.subscriber.daysLeft}</div>
                    <div>Status: {gateCheckResult.data.subscriber.status}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sync Output Viewer */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 h-[620px] flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Kiosk Sync Response</span>
              {syncResult && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    syncResult.ok
                      ? 'bg-emerald-900/60 text-emerald-300'
                      : 'bg-rose-900/60 text-rose-300'
                  }`}
                >
                  HTTP {syncResult.status}
                </span>
              )}
            </div>
            {syncResult?.data?.embeddings && (
              <span className="text-xs text-indigo-300 font-mono">
                {syncResult.data.embeddings.length} Face Vectors Received
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-xs">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                <span>Pulling face vectors from Firestore...</span>
              </div>
            ) : syncResult ? (
              <pre className="text-emerald-400 whitespace-pre-wrap">
                {JSON.stringify(syncResult.data, null, 2)}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Cpu className="w-8 h-8 mb-2 opacity-30" />
                <span>Click "Full Initial Sync" or "Incremental Sync" to test device token authentication & Firestore embeddings pull</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
