import React from 'react';
import { Shield, Building2, Smartphone, AlertTriangle, Key, UserCheck, RefreshCw } from 'lucide-react';

export interface ActiveRoleConfig {
  role: 'company_admin' | 'tenant_admin' | 'device' | 'invalid_token';
  tenantId?: number;
  tenantName?: string;
  email?: string;
  deviceToken?: string;
  deviceName?: string;
  label: string;
}

interface RoleSelectorProps {
  currentConfig: ActiveRoleConfig;
  onSelectConfig: (config: ActiveRoleConfig) => void;
  onReseed: () => void;
  isReseeding: boolean;
}

export const PRESET_ROLES: ActiveRoleConfig[] = [
  {
    role: 'company_admin',
    email: 'superadmin@platform.io',
    label: 'Platform Superadmin (Company Admin)',
  },
  {
    role: 'tenant_admin',
    tenantId: 1,
    tenantName: 'Apex Health & Fitness',
    email: 'admin@apexfitness.com',
    label: 'Tenant Admin: Apex Fitness (Active • Limit 100)',
  },
  {
    role: 'tenant_admin',
    tenantId: 2,
    tenantName: 'Metro Co-Working Hub',
    email: 'admin@metrohub.space',
    label: 'Tenant Admin: Metro Hub (Active • Limit 3/3 Full)',
  },
  {
    role: 'tenant_admin',
    tenantId: 3,
    tenantName: 'Titan Corporate Gym',
    email: 'admin@titanfitness.com',
    label: 'Tenant Admin: Titan Gym (Suspended • Test 403)',
  },
  {
    role: 'device',
    tenantId: 1,
    tenantName: 'Apex Health & Fitness',
    deviceToken: 'dev_apex_kiosk_main_a109bf83',
    deviceName: 'Main Turnstile Kiosk A',
    label: 'Kiosk Device: Apex Turnstile (Valid Token)',
  },
  {
    role: 'invalid_token',
    deviceToken: 'dev_invalid_revoked_token_99999',
    label: 'Invalid/Revoked Device Token (Test 401)',
  },
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentConfig,
  onSelectConfig,
  onReseed,
  isReseeding,
}) => {
  return (
    <div id="auth-context-bar" className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            B2B
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-slate-100">
                Multi-Tenant Subscription & Kiosk Sync API
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                PostgreSQL + Firestore
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Filtered by tenant context • Strict role authorization & subscriber limits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs">
            <span className="text-slate-400 font-medium">Auth Context:</span>
            <select
              id="role-selector-dropdown"
              value={
                currentConfig.role === 'tenant_admin'
                  ? `tenant_${currentConfig.tenantId}`
                  : currentConfig.role === 'device'
                  ? 'device'
                  : currentConfig.role === 'invalid_token'
                  ? 'invalid'
                  : 'company_admin'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'company_admin') {
                  onSelectConfig(PRESET_ROLES[0]);
                } else if (val === 'tenant_1') {
                  onSelectConfig(PRESET_ROLES[1]);
                } else if (val === 'tenant_2') {
                  onSelectConfig(PRESET_ROLES[2]);
                } else if (val === 'tenant_3') {
                  onSelectConfig(PRESET_ROLES[3]);
                } else if (val === 'device') {
                  onSelectConfig(PRESET_ROLES[4]);
                } else if (val === 'invalid') {
                  onSelectConfig(PRESET_ROLES[5]);
                }
              }}
              aria-label="Select caller authentication role"
              className="bg-slate-900 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {PRESET_ROLES.map((r, i) => (
                <option
                  key={i}
                  value={
                    r.role === 'tenant_admin'
                      ? `tenant_${r.tenantId}`
                      : r.role === 'device'
                      ? 'device'
                      : r.role === 'invalid_token'
                      ? 'invalid'
                      : 'company_admin'
                  }
                >
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button
            id="reseed-demo-btn"
            onClick={onReseed}
            disabled={isReseeding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition shadow-sm cursor-pointer"
            title="Reset database to demo seed data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin' : ''}`} />
            {isReseeding ? 'Seeding...' : 'Reset Demo Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
