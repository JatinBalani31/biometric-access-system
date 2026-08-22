import React, { useState, useEffect } from 'react';
import { Smartphone, Plus, RefreshCw, Key, Copy, Check, AlertCircle, ShieldAlert, Cpu } from 'lucide-react';
import { ActiveRoleConfig } from './RoleSelector.tsx';

interface Device {
  id: number;
  tenantId: number;
  deviceName: string;
  deviceToken: string;
  status: 'active' | 'revoked' | 'maintenance';
  lastSyncedAt: string | null;
  createdAt: string;
}

interface DevicesManagerProps {
  authConfig: ActiveRoleConfig;
}

export const DevicesManager: React.FC<DevicesManagerProps> = ({ authConfig }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('');

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

  const fetchDevices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/devices', { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDevices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [authConfig]);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ device_name: deviceName }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error}`);
        return;
      }
      setShowRegisterModal(false);
      setDeviceName('');
      fetchDevices();
    } catch (err: any) {
      alert(`Register device error: ${err.message}`);
    }
  };

  const handleRotateToken = async (deviceId: number) => {
    if (!confirm('Rotate this device token? Hardware gates using the old key will need to be re-authenticated.')) return;
    try {
      const res = await fetch(`/api/devices/${deviceId}/rotate-token`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) fetchDevices();
    } catch (err) {
      console.error('Rotate token error:', err);
    }
  };

  const handleDeleteDevice = async (deviceId: number) => {
    if (!confirm('Are you sure you want to delete / revoke this device?')) return;
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) fetchDevices();
    } catch (err) {
      console.error('Delete device error:', err);
    }
  };

  const copyToken = (token: string, id: number) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            Kiosk Terminals & Access Gates
          </h2>
          <p className="text-xs text-slate-400">
            Cryptographic device tokens • Last synchronized timestamps • Biometric gate terminals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDevices}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
            title="Refresh devices"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register Kiosk
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading devices: {error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
          <span className="animate-pulse">Loading kiosk devices...</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-2">
          <Smartphone className="w-8 h-8 mx-auto text-slate-400 opacity-40" />
          <h3 className="text-sm font-semibold text-slate-200">No Kiosk Devices Registered</h3>
          <p className="text-xs text-slate-400">Register your entrance kiosks, tablets, and turnstiles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => {
            const hasSynced = !!device.lastSyncedAt;
            return (
              <div
                key={device.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400">ID #{device.id} • Tenant #{device.tenantId}</span>
                    <h3 className="text-sm font-bold text-slate-100">{device.deviceName}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      device.status === 'active'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {device.status}
                  </span>
                </div>

                {/* Token Box */}
                <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Key className="w-3 h-3 text-amber-400" />
                      Device Token (API Key):
                    </span>
                    <button
                      onClick={() => copyToken(device.deviceToken, device.id)}
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer font-mono text-[10px]"
                    >
                      {copiedId === device.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedId === device.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-amber-200 truncate select-all">
                    {device.deviceToken}
                  </div>
                </div>

                {/* Sync telemetry */}
                <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>
                    Last Incremental Sync:{' '}
                    {hasSynced ? (
                      <span className="font-mono text-slate-200">
                        {new Date(device.lastSyncedAt!).toLocaleTimeString()} ({new Date(device.lastSyncedAt!).toLocaleDateString()})
                      </span>
                    ) : (
                      <span className="text-amber-400">Never synced</span>
                    )}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => handleRotateToken(device.id)}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Rotate Token
                  </button>
                  <button
                    onClick={() => handleDeleteDevice(device.id)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    Revoke Kiosk
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Kiosk Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-100">Register New Kiosk Device</h3>
            <form onSubmit={handleRegisterDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Device / Gate Name</label>
                <input
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. VIP Studio Access Gate"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5"
                />
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                A unique, high-entropy cryptographic device token will be generated automatically.
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Register Kiosk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
