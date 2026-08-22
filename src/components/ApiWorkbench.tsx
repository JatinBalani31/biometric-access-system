import React, { useState } from 'react';
import { Play, Copy, Check, Terminal, Code2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ActiveRoleConfig } from './RoleSelector.tsx';

interface EndpointPreset {
  id: string;
  category: 'Tenants' | 'Subscribers & Limits' | 'Plans' | 'Devices' | 'Kiosk Sync & Embeddings';
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  defaultBody?: any;
  defaultQuery?: Record<string, string>;
  expectedCode?: number;
  highlightError?: string;
}

const ENDPOINT_PRESETS: EndpointPreset[] = [
  {
    id: 'get-tenants',
    category: 'Tenants',
    name: 'List Tenants (Scoped by Role)',
    method: 'GET',
    path: '/api/tenants',
    description: 'Company Admin retrieves all tenants; Tenant Admin retrieves only their own organization record.',
  },
  {
    id: 'post-tenant',
    category: 'Tenants',
    name: 'Create New Tenant (Company Admin Only)',
    method: 'POST',
    path: '/api/tenants',
    description: 'Provisions a new tenant with specific subscriber limit and subscription tier.',
    defaultBody: {
      company_name: 'Nexus Fitness & Spa',
      contact_email: 'hello@nexusspa.io',
      plan_tier: 'pro',
      subscriber_limit: 75,
      admin_email: 'ops@nexusspa.io',
    },
  },
  {
    id: 'patch-tenant-status',
    category: 'Tenants',
    name: 'Toggle Tenant Suspension (Company Admin)',
    method: 'PATCH',
    path: '/api/tenants/3/status',
    description: 'Suspends or reactivates a tenant. Suspended tenants return 403 TENANT_SUSPENDED on all operations.',
    defaultBody: {
      status: 'suspended',
    },
  },
  {
    id: 'get-subscribers',
    category: 'Subscribers & Limits',
    name: 'List Subscribers (Filtered by Tenant)',
    method: 'GET',
    path: '/api/subscribers',
    description: 'Fetches subscribers belonging strictly to authenticated tenant, with computed days_left.',
  },
  {
    id: 'get-subscriber-days-left',
    category: 'Subscribers & Limits',
    name: 'Compute Days Left for Subscriber',
    method: 'GET',
    path: '/api/subscribers/1/days-left',
    description: 'Calculates days_left, days elapsed, percent remaining, and expiry status based on end_date.',
  },
  {
    id: 'post-subscriber-normal',
    category: 'Subscribers & Limits',
    name: 'Create Subscriber (Standard)',
    method: 'POST',
    path: '/api/subscribers',
    description: 'Adds a subscriber to tenant and provisions 128-d face embedding in Firestore if limit not exceeded.',
    defaultBody: {
      name: 'Claire Beauchamp',
      email: 'claire.beauchamp@example.com',
      phone: '+1 (555) 998-1234',
      duration_days: 60,
    },
  },
  {
    id: 'post-subscriber-limit-test',
    category: 'Subscribers & Limits',
    name: 'Test Subscriber Limit Exceeded (Returns 422)',
    method: 'POST',
    path: '/api/subscribers',
    description: 'Attempt creating a subscriber on Tenant 2 (Metro Hub, already at 3/3 capacity) to verify rejection with code LIMIT_EXCEEDED.',
    defaultBody: {
      name: 'Overflow Candidate',
      email: 'overflow@candidate.org',
      duration_days: 30,
    },
    expectedCode: 422,
    highlightError: 'LIMIT_EXCEEDED',
  },
  {
    id: 'get-plans',
    category: 'Plans',
    name: 'List Subscription Plans',
    method: 'GET',
    path: '/api/plans',
    description: 'Lists all available subscription pricing plans filtered by caller tenant ID.',
  },
  {
    id: 'post-plan',
    category: 'Plans',
    name: 'Create Subscription Plan',
    method: 'POST',
    path: '/api/plans',
    description: 'Creates a custom subscription tier with specific duration in days and price.',
    defaultBody: {
      name: 'Semi-Annual Unlimited Pass',
      duration_days: 180,
      price: '289.00',
    },
  },
  {
    id: 'get-devices',
    category: 'Devices',
    name: 'List Kiosk Devices',
    method: 'GET',
    path: '/api/devices',
    description: 'Retrieves all hardware kiosks, turnstile gates, and access terminals registered for the tenant.',
  },
  {
    id: 'post-device',
    category: 'Devices',
    name: 'Register New Kiosk Device',
    method: 'POST',
    path: '/api/devices',
    description: 'Registers a new kiosk and issues a secure device token for turnstile access.',
    defaultBody: {
      device_name: 'Back Entrance Facial Turnstile',
    },
  },
  {
    id: 'post-rotate-token',
    category: 'Devices',
    name: 'Rotate Kiosk Device Token',
    method: 'POST',
    path: '/api/devices/1/rotate-token',
    description: 'Revokes previous token and issues a new cryptographically secure device token.',
  },
  {
    id: 'get-kiosk-sync-incremental',
    category: 'Kiosk Sync & Embeddings',
    name: 'Kiosk Incremental Sync (since timestamp)',
    method: 'GET',
    path: '/api/kiosk/face-embeddings?since=2026-08-18T00:00:00.000Z&limit=20',
    description: 'Kiosk device pulls differential set of Firestore face embeddings updated since last sync.',
  },
  {
    id: 'post-kiosk-verify-access',
    category: 'Kiosk Sync & Embeddings',
    name: 'Kiosk Gate Access Verification',
    method: 'POST',
    path: '/api/kiosk/verify-access',
    description: 'Kiosk turnstile verifies if a subscriber is active and not expired for gate entry.',
    defaultBody: {
      subscriber_id: 1,
    },
  },
  {
    id: 'get-subscriber-embedding',
    category: 'Kiosk Sync & Embeddings',
    name: 'Get Face Embedding from Firestore',
    method: 'GET',
    path: '/api/subscribers/1/face-embedding',
    description: 'Pulls the 128-dimensional facial biometric embedding vector stored in Firebase Firestore.',
  },
];

interface ApiWorkbenchProps {
  authConfig: ActiveRoleConfig;
}

export const ApiWorkbench: React.FC<ApiWorkbenchProps> = ({ authConfig }) => {
  const [selectedPreset, setSelectedPreset] = useState<EndpointPreset>(ENDPOINT_PRESETS[0]);
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>(ENDPOINT_PRESETS[0].method);
  const [path, setPath] = useState<string>(ENDPOINT_PRESETS[0].path);
  const [requestBody, setRequestBody] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<any>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectPreset = (preset: EndpointPreset) => {
    setSelectedPreset(preset);
    setMethod(preset.method);
    setPath(preset.path);
    setRequestBody(preset.defaultBody ? JSON.stringify(preset.defaultBody, null, 2) : '');
  };

  const executeRequest = async () => {
    setIsLoading(true);
    setResponseData(null);
    setResponseStatus(null);
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Set auth headers based on currently selected auth role
      if (authConfig.role === 'company_admin') {
        headers['x-simulated-role'] = 'company_admin';
        headers['x-simulated-email'] = authConfig.email || 'superadmin@platform.io';
      } else if (authConfig.role === 'tenant_admin') {
        headers['x-simulated-role'] = 'tenant_admin';
        headers['x-simulated-tenant-id'] = String(authConfig.tenantId || 1);
        headers['x-simulated-email'] = authConfig.email || 'admin@tenant.com';
      } else if (authConfig.role === 'device') {
        headers['x-device-token'] = authConfig.deviceToken || 'dev_apex_kiosk_main_a109bf83';
      } else if (authConfig.role === 'invalid_token') {
        headers['x-device-token'] = authConfig.deviceToken || 'dev_invalid_revoked_token_99999';
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
        try {
          options.body = JSON.stringify(JSON.parse(requestBody));
        } catch {
          options.body = requestBody;
        }
      }

      const res = await fetch(path, options);
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      setResponseStatus(res.status);

      const contentType = res.headers.get('content-type');
      let data: any;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setResponseData(data);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({
        error: 'Network or client execution error',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurlCommand = () => {
    let authHeader = '';
    if (authConfig.role === 'company_admin') {
      authHeader = `-H "x-simulated-role: company_admin" -H "x-simulated-email: ${authConfig.email}"`;
    } else if (authConfig.role === 'tenant_admin') {
      authHeader = `-H "x-simulated-role: tenant_admin" -H "x-simulated-tenant-id: ${authConfig.tenantId}"`;
    } else if (authConfig.role === 'device') {
      authHeader = `-H "x-device-token: ${authConfig.deviceToken}"`;
    } else if (authConfig.role === 'invalid_token') {
      authHeader = `-H "x-device-token: ${authConfig.deviceToken}"`;
    }

    const host = window.location.origin;
    let bodyFlag = '';
    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
      bodyFlag = `-d '${requestBody.replace(/'/g, "\\'")}'`;
    }

    return `curl -X ${method} "${host}${path}" \\
  -H "Content-Type: application/json" \\
  ${authHeader} ${bodyFlag ? `\\\n  ${bodyFlag}` : ''}`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(getCurlCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: number | null) => {
    if (!status) return 'bg-slate-700 text-slate-200';
    if (status >= 200 && status < 300) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (status === 401) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    if (status === 403) return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    if (status === 422) return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    return 'bg-red-500/20 text-red-400 border border-red-500/30';
  };

  return (
    <div id="api-workbench" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Preset Endpoints Sidebar */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[760px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200">API Test Presets</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{ENDPOINT_PRESETS.length} Endpoints</span>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {['Tenants', 'Subscribers & Limits', 'Plans', 'Devices', 'Kiosk Sync & Embeddings'].map((cat) => {
            const presetsInCat = ENDPOINT_PRESETS.filter((p) => p.category === cat);
            return (
              <div key={cat}>
                <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 px-2">
                  {cat}
                </div>
                <div className="space-y-1">
                  {presetsInCat.map((preset) => {
                    const isSelected = selectedPreset.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition cursor-pointer flex flex-col gap-1 border ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500 text-indigo-100 shadow-sm'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate">{preset.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              preset.method === 'GET'
                                ? 'bg-blue-900/60 text-blue-300'
                                : preset.method === 'POST'
                                ? 'bg-emerald-900/60 text-emerald-300'
                                : preset.method === 'PATCH' || preset.method === 'PUT'
                                ? 'bg-amber-900/60 text-amber-300'
                                : 'bg-red-900/60 text-red-300'
                            }`}
                          >
                            {preset.method}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 truncate">{preset.path}</span>
                        {preset.highlightError && (
                          <span className="self-start text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                            Tests: {preset.highlightError}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Request / Response Runner */}
      <div className="lg:col-span-8 space-y-4">
        {/* Request Config Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                {selectedPreset.name}
              </h3>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                title="Copy cURL command"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy cURL'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">{selectedPreset.description}</p>
          </div>

          {/* URL & Method Bar */}
          <div className="flex gap-2 mb-3">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="/api/..."
            />
            <button
              id="execute-api-btn"
              onClick={executeRequest}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Sending...' : 'Send Request'}
            </button>
          </div>

          {/* Active Auth Headers Display */}
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 mb-3 flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-sans font-medium">Injected Headers:</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300">
              Role: {authConfig.role}
            </span>
            {authConfig.tenantId && (
              <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300">
                tenant_id: {authConfig.tenantId} ({authConfig.tenantName})
              </span>
            )}
            {authConfig.deviceToken && (
              <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 truncate max-w-xs">
                x-device-token: {authConfig.deviceToken}
              </span>
            )}
          </div>

          {/* Request Body Editor */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>JSON Request Body</span>
                <span className="text-[11px] text-slate-400 font-mono">application/json</span>
              </div>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder='{ "key": "value" }'
              />
            </div>
          )}
        </div>

        {/* Response Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-[420px] flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">Response</span>
              {responseStatus && (
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${getStatusColor(responseStatus)}`}>
                  HTTP {responseStatus}
                </span>
              )}
              {responseTime !== null && (
                <span className="text-xs text-slate-400 font-mono">{responseTime} ms</span>
              )}
            </div>

            {responseData && (
              <span className="text-[11px] text-slate-400 font-mono">
                {Array.isArray(responseData) ? `${responseData.length} items` : 'Object'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto bg-slate-950 rounded-lg p-3 border border-slate-800/80 font-mono text-xs">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <span className="animate-pulse">Waiting for response...</span>
              </div>
            ) : responseData !== null ? (
              <pre className="text-emerald-400 whitespace-pre-wrap">
                {typeof responseData === 'object'
                  ? JSON.stringify(responseData, null, 2)
                  : String(responseData)}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Terminal className="w-8 h-8 mb-2 opacity-30" />
                <span>Select an endpoint preset above and click "Send Request"</span>
                <span className="text-slate-400 text-[11px] mt-1">
                  Try switching roles in the top bar to observe tenant filtering & error codes
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
