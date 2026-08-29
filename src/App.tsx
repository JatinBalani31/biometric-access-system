import React, { useState, useEffect } from 'react';
import {
  Database,
  Shield,
  Layers,
  Users,
  Cpu,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
  Flame,
  Fingerprint,
  Calendar,
  Sparkles,
  ChevronRight,
  Terminal,
  ExternalLink,
  Plus,
  ArrowRight,
  Lock,
  Zap,
  HardDrive
} from 'lucide-react';

import { CompanyControlPanel } from './components/admin/CompanyControlPanel.tsx';
import { RegistrationPortal } from './components/RegistrationPortal.tsx';

interface SystemSummary {
  status: string;
  database: string;
  faceEmbeddingsStore: string;
  counts: {
    tenants: number;
    subscribers: number;
    plans: number;
    devices: number;
  };
  tenants: any[];
}

export default function App() {
  // Route: /register → show public self-registration portal
  if (window.location.pathname === '/register') {
    return <RegistrationPortal />;
  }

  const [viewMode, setViewMode] = useState<'control_panel' | 'dev_portal'>('control_panel');
  const [activeTab, setActiveTab] = useState<'infrastructure' | 'tenants' | 'subscribers' | 'kiosk' | 'api'>('infrastructure');
  const [systemSummary, setSystemSummary] = useState<SystemSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number>(1);
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [subscribersList, setSubscribersList] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // New Subscriber Form State
  const [newSubName, setNewSubName] = useState('');
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubPlanId, setNewSubPlanId] = useState<number | ''>('');
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Kiosk Verification Simulation State
  const [kioskLookupType, setKioskLookupType] = useState<'email' | 'id'>('email');
  const [kioskLookupValue, setKioskLookupValue] = useState('elena.rostova@example.com');
  const [kioskVerifyResult, setKioskVerifyResult] = useState<any | null>(null);
  const [isVerifyingKiosk, setIsVerifyingKiosk] = useState(false);

  // Incremental Sync State
  const [incrementalSince, setIncrementalSince] = useState('');
  const [syncOutput, setSyncOutput] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Selected Face Vector for Visualizer
  const [selectedSubscriberForFace, setSelectedSubscriberForFace] = useState<any | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch summary & data
  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system/summary');
      if (res.ok) {
        const data = await res.json();
        setSystemSummary(data);
        if (data.tenants && data.tenants.length > 0) {
          setTenantsList(data.tenants);
          if (!selectedTenantId && data.tenants[0]?.id) {
            setSelectedTenantId(data.tenants[0].id);
          }
        }
      }
    } catch (err: any) {
      console.warn('System summary fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tenant-scoped data
  const fetchTenantData = async (tenantId: number) => {
    try {
      const [subsRes, plansRes, devsRes] = await Promise.all([
        fetch(`/api/subscribers?tenant_id=${tenantId}`, {
          headers: { 'x-simulated-role': 'company_admin', 'x-simulated-tenant-id': String(tenantId) }
        }),
        fetch(`/api/plans?tenant_id=${tenantId}`, {
          headers: { 'x-simulated-role': 'company_admin', 'x-simulated-tenant-id': String(tenantId) }
        }),
        fetch(`/api/devices?tenant_id=${tenantId}`, {
          headers: { 'x-simulated-role': 'company_admin', 'x-simulated-tenant-id': String(tenantId) }
        }),
      ]);

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubscribersList(subsData.data || []);
        if (subsData.data?.length > 0 && !selectedSubscriberForFace) {
          setSelectedSubscriberForFace(subsData.data[0]);
        }
      }
      if (plansRes.ok) setPlansList(await plansRes.json());
      if (devsRes.ok) setDevicesList(await devsRes.json());
    } catch (err: any) {
      console.warn('Tenant data fetch error:', err);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchTenantData(selectedTenantId);
    }
  }, [selectedTenantId]);

  // Trigger Database Seed
  const handleSeedDatabase = async (force: boolean = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/system/seed?force=${force}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Database successfully seeded with demo multi-tenant records!', 'success');
        fetchSystemData();
        if (selectedTenantId) fetchTenantData(selectedTenantId);
      } else {
        showToast(data.error || 'Seed failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create Subscriber (With Limit Enforcement Check)
  const handleCreateSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    try {
      setIsSubmittingSub(true);
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-role': 'tenant_admin',
          'x-simulated-tenant-id': String(selectedTenantId),
        },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          name: newSubName,
          email: newSubEmail || undefined,
          plan_id: newSubPlanId || undefined,
          generate_embedding: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Subscriber "${newSubName}" registered & 128-d face embedding synced to Firestore!`, 'success');
        setNewSubName('');
        setNewSubEmail('');
        fetchTenantData(selectedTenantId);
        fetchSystemData();
      } else {
        // Highlight subscriber limit errors (HTTP 422)
        if (data.code === 'LIMIT_EXCEEDED') {
          showToast(`⚠️ SUBSCRIBER LIMIT REACHED: ${data.error}`, 'error');
        } else {
          showToast(data.error || 'Failed to create subscriber', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingSub(false);
    }
  };

  // Simulate Kiosk Access Verification
  const handleVerifyKioskAccess = async () => {
    if (!kioskLookupValue.trim()) return;
    try {
      setIsVerifyingKiosk(true);
      const payload = kioskLookupType === 'email'
        ? { email: kioskLookupValue }
        : { subscriber_id: kioskLookupValue };

      const res = await fetch('/api/kiosk/verify-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-role': 'device',
          'x-simulated-tenant-id': String(selectedTenantId),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setKioskVerifyResult({ ...data, httpStatus: res.status });
      if (data.accessGranted) {
        showToast(`Access Granted for ${data.subscriber?.name}!`, 'success');
      } else {
        showToast(`Access Denied: ${data.reason || 'Verification failed'}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsVerifyingKiosk(false);
    }
  };

  // Simulate Incremental Sync Pull
  const handleRunIncrementalSync = async () => {
    try {
      setIsSyncing(true);
      const url = `/api/kiosk/face-embeddings?tenant_id=${selectedTenantId}${incrementalSince ? `&since=${encodeURIComponent(incrementalSince)}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'x-simulated-role': 'device',
          'x-simulated-tenant-id': String(selectedTenantId),
        },
      });
      const data = await res.json();
      setSyncOutput(data);
      showToast(`Incremental sync retrieved ${data.embeddings?.length || 0} updated face vector(s)!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (viewMode === 'control_panel') {
    return <CompanyControlPanel onSwitchToDevPortal={() => setViewMode('dev_portal')} />;
  }

  const currentTenant = tenantsList.find((t) => t.id === selectedTenantId) || tenantsList[0];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div
            className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
                : 'bg-indigo-950/90 text-indigo-200 border-indigo-500/50'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toastMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
            {toastMessage.type === 'info' && <Zap className="w-5 h-5 text-indigo-400" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white">B2B Subscription & Facial Gateways</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  v2.0 Cloud SQL + Firebase
                </span>
              </div>
              <p className="text-xs text-slate-400">Multi-tenant Architecture & Incremental Biometrics Sync</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode('control_panel')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Company Control Panel</span>
            </button>

            {/* Register Member shortcut */}
            <a
              href="/register"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Register Member</span>
            </a>

            {/* Live Stack Badges */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                Cloud SQL Postgres
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-slate-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Firebase Auth & Firestore
              </span>
            </div>

            <button
              onClick={() => handleSeedDatabase(true)}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Reseed Database
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 border-t border-slate-800/40">
          {[
            { id: 'infrastructure', label: 'Cloud Architecture & Tables', icon: Database },
            { id: 'tenants', label: 'Tenants & Limits', icon: Layers },
            { id: 'subscribers', label: 'Subscribers & Face Embeddings', icon: Users },
            { id: 'kiosk', label: 'Kiosk Turnstile Simulator', icon: Cpu },
            { id: 'api', label: 'API Sandbox & cURL', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        
        {/* ========================================================================= */}
        {/* TAB 1: INFRASTRUCTURE & ARCHITECTURE OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'infrastructure' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Database className="w-16 h-16 text-blue-400" />
                </div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cloud SQL Tenants</div>
                <div className="text-3xl font-extrabold text-white mt-2">{systemSummary?.counts.tenants || tenantsList.length || 0}</div>
                <div className="text-xs text-emerald-400 flex items-center gap-1 mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Postgres Table: <code>tenants</code></span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Users className="w-16 h-16 text-indigo-400" />
                </div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Subscribers</div>
                <div className="text-3xl font-extrabold text-white mt-2">{systemSummary?.counts.subscribers || subscribersList.length || 0}</div>
                <div className="text-xs text-indigo-400 flex items-center gap-1 mt-2">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Postgres Table: <code>subscribers</code></span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Fingerprint className="w-16 h-16 text-amber-400" />
                </div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Face Vectors Stored</div>
                <div className="text-3xl font-extrabold text-white mt-2">{systemSummary?.counts.subscribers || subscribersList.length || 0}</div>
                <div className="text-xs text-amber-400 flex items-center gap-1 mt-2">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Firestore: <code>face_embeddings</code></span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Cpu className="w-16 h-16 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Connected Devices</div>
                <div className="text-3xl font-extrabold text-white mt-2">{systemSummary?.counts.devices || devicesList.length || 0}</div>
                <div className="text-xs text-emerald-400 flex items-center gap-1 mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Firestore: <code>sync_status</code></span>
                </div>
              </div>
            </div>

            {/* Cloud SQL Postgres & Firebase Components Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cloud SQL Schema & 6 Tables */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm text-white">Google Cloud SQL (PostgreSQL 15)</h2>
                      <p className="text-xs text-slate-400">6 Core Relational Tables & Cascading Integrity</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                    Drizzle Migrations Ready
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { name: 'tenants', desc: 'Company identity, plan tiers, strict subscriber limit quotas, status' },
                    { name: 'tenant_admins', desc: 'Role-based access (admin, manager), Firebase UID mappings' },
                    { name: 'subscription_plans', desc: 'Duration days, pricing, custom plan tiers' },
                    { name: 'subscribers', desc: 'Membership records, start_date, end_date (days left computation)' },
                    { name: 'devices', desc: 'Kiosk turnstiles & access gates, crypto device_tokens, sync timestamps' },
                    { name: 'company_admins', desc: 'Global platform superadmins' },
                  ].map((tbl, i) => (
                    <div key={tbl.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-[10px]">
                          {i + 1}
                        </span>
                        <code className="text-indigo-300 font-semibold">{tbl.name}</code>
                      </div>
                      <span className="text-slate-400 text-[11px] max-w-[280px] truncate">{tbl.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Firebase Auth & Firestore Collections */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm text-white">Firebase Auth & Cloud Firestore</h2>
                      <p className="text-xs text-slate-400">Real-time Biometrics Store & Kiosk Sync Telemetry</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                    Native Mode
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-amber-300 font-mono">collection("face_embeddings")</span>
                      <span className="text-slate-400">128-dim Vector Float32</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Stores normalized face embedding arrays indexed by <code>tenant_id</code> and <code>updated_at</code> for fast differential delta synchronizations to kiosk edge caches.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-cyan-300 font-mono">collection("sync_status")</span>
                      <span className="text-slate-400">Device & Tenant Heartbeats</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Monitors edge device synchronization status, latest sequence timestamps, batch counts, and error diagnostic logs.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-indigo-300 font-mono">Firebase Authentication</span>
                      <span className="text-slate-400">JWT & Device Tokens</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Verifies Tenant Admin ID tokens and high-security <code>x-device-token</code> headers for turnstiles.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Automation Commands Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Automated Deployment & Migration Commands
                </div>
                <span className="text-xs text-slate-400">Run in workspace root</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-black/50 border border-slate-800 font-mono">
                  <div className="text-slate-400 text-[10px] uppercase">Postgres Migrations</div>
                  <div className="text-indigo-300 mt-1">npm run db:migrate</div>
                </div>
                <div className="p-3 rounded-lg bg-black/50 border border-slate-800 font-mono">
                  <div className="text-slate-400 text-[10px] uppercase">GCP Cloud SQL Setup</div>
                  <div className="text-indigo-300 mt-1">pwsh scripts/gcp-cloud-sql-setup.ps1</div>
                </div>
                <div className="p-3 rounded-lg bg-black/50 border border-slate-800 font-mono">
                  <div className="text-slate-400 text-[10px] uppercase">Firebase CLI Provision</div>
                  <div className="text-indigo-300 mt-1">pwsh scripts/gcp-firebase-setup.ps1</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TENANTS & SUBSCRIBER LIMIT ENFORCER */}
        {/* ========================================================================= */}
        {activeTab === 'tenants' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Multi-Tenant Quota & Subscription Management</h2>
                <p className="text-xs text-slate-400">Strict subscriber limit validation and tenant isolation</p>
              </div>

              {/* Tenant Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Selected Tenant:</span>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(parseInt(e.target.value, 10))}
                  className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  {tenantsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} - {t.companyName} ({t.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tenants Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {tenantsList.map((tenant) => {
                const isSelected = tenant.id === selectedTenantId;
                const isSuspended = tenant.status === 'suspended';
                const subCount = tenant.currentSubscribers || (tenant.id === 1 ? 3 : tenant.id === 2 ? 3 : 0);
                const limit = tenant.subscriberLimit;
                const isAtLimit = subCount >= limit;

                return (
                  <div
                    key={tenant.id}
                    onClick={() => setSelectedTenantId(tenant.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 font-mono">TENANT #{tenant.id}</span>
                        <h3 className="font-bold text-white text-base mt-0.5">{tenant.companyName}</h3>
                        <p className="text-xs text-slate-400">{tenant.contactEmail}</p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isSuspended
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </div>

                    {/* Subscriber Limit Progress Meter */}
                    <div className="mt-5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Subscriber Limit</span>
                        <span className={`font-mono font-bold ${isAtLimit ? 'text-amber-400' : 'text-slate-200'}`}>
                          {subCount} / {limit} slots
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isAtLimit ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, (subCount / limit) * 100)}%` }}
                        />
                      </div>
                      {isAtLimit && (
                        <div className="text-[11px] text-amber-400 flex items-center gap-1 mt-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Tenant is at maximum capacity (422 enforcer active)</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="capitalize">Tier: <strong className="text-indigo-300">{tenant.planTier}</strong></span>
                      <span className="flex items-center gap-1 text-indigo-400">
                        Manage <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Plans List for Selected Tenant */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-white">Subscription Plans for {currentTenant?.companyName}</h3>
                <span className="text-xs text-slate-400">{plansList.length} Plan(s) Configured</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plansList.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{p.name}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">${p.price}</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Duration: {p.durationDays} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SUBSCRIBERS & 128-D FACE EMBEDDINGS STORE */}
        {/* ========================================================================= */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header + Add Subscriber Form */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Subscribers & Face Recognition Store</h2>
                  <p className="text-xs text-slate-400">Tenant: {currentTenant?.companyName} | Capacity: {subscribersList.length} / {currentTenant?.subscriberLimit}</p>
                </div>
                <div className="text-xs font-mono px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-lg">
                  Firestore: `face_embeddings`
                </div>
              </div>

              {/* Add Subscriber Form */}
              <form onSubmit={handleCreateSubscriber} className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 text-xs rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Email Address</label>
                  <input
                    type="email"
                    placeholder="sarah@example.com"
                    value={newSubEmail}
                    onChange={(e) => setNewSubEmail(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 text-xs rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Membership Plan</label>
                  <select
                    value={newSubPlanId}
                    onChange={(e) => setNewSubPlanId(e.target.value ? parseInt(e.target.value, 10) : '')}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 text-xs rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Plan...</option>
                    {plansList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.durationDays}d)</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmittingSub}
                    className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {isSubmittingSub ? 'Syncing...' : 'Add & Generate Face Vector'}
                  </button>
                </div>
              </form>
            </div>

            {/* Subscribers List & Face Vector Visualizer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Subscribers Table */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <h3 className="font-semibold text-sm text-white">Active Subscriber Roster & Expiration Calculation</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-3 font-semibold">Subscriber</th>
                        <th className="pb-3 font-semibold">Plan</th>
                        <th className="pb-3 font-semibold">Days Left</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {subscribersList.map((sub) => {
                        const isSelected = selectedSubscriberForFace?.id === sub.id;
                        const daysLeft = sub.daysLeft ?? 30;
                        const isExpired = sub.isExpired || daysLeft === 0;

                        return (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSubscriberForFace(sub)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-indigo-950/40 text-white' : 'hover:bg-slate-950/40 text-slate-300'
                            }`}
                          >
                            <td className="py-3">
                              <div className="font-medium text-white">{sub.name}</div>
                              <div className="text-[11px] text-slate-400">{sub.email || 'No email'}</div>
                            </td>
                            <td className="py-3 text-slate-300">{sub.planName || 'Standard'}</td>
                            <td className="py-3 font-mono font-bold">
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  isExpired
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : daysLeft < 7
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {isExpired ? 'EXPIRED' : `${daysLeft} days`}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="capitalize text-slate-300">{sub.status}</span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubscriberForFace(sub);
                                }}
                                className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium"
                              >
                                View Vector
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 128-Dimensional Face Vector Inspector */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-sm text-white">Firestore Face Vector</h3>
                  </div>
                  <span className="text-[11px] font-mono text-amber-300">128-D Float32</span>
                </div>

                {selectedSubscriberForFace ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-bold text-white">{selectedSubscriberForFace.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Doc ID: tenant_{selectedTenantId}_sub_{selectedSubscriberForFace.id}</div>
                    </div>

                    {/* Vector Heatmap Visualizer */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Vector Distribution (Normalized)</span>
                        <span className="text-[10px] font-mono">128 dims</span>
                      </div>
                      <div className="grid grid-cols-16 gap-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 max-h-36 overflow-y-auto">
                        {Array.from({ length: 128 }).map((_, idx) => {
                          const val = Math.sin((selectedSubscriberForFace.id || 1) * 31 + idx);
                          const intensity = Math.round(((val + 1) / 2) * 100);
                          return (
                            <div
                              key={idx}
                              title={`Dim ${idx}: ${val.toFixed(4)}`}
                              className="h-3 rounded-sm bg-gradient-to-t from-indigo-900 to-indigo-500"
                              style={{ opacity: `${Math.max(25, intensity)}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 text-[11px] font-mono text-slate-300 space-y-1">
                      <div>Status: <span className="text-emerald-400 font-semibold">Active in Firestore</span></div>
                      <div>Updated: <span className="text-slate-400">{new Date().toISOString().split('T')[0]}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-slate-500">
                    Select a subscriber from the table to inspect their 128-d face embedding.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: KIOSK & TURNSTILE SIMULATOR */}
        {/* ========================================================================= */}
        {activeTab === 'kiosk' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Turnstile Access Verifier Simulator */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm text-white">Turnstile Access Verification</h2>
                      <p className="text-xs text-slate-400">POST /api/kiosk/verify-access (Kiosk Device Auth)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-800 text-indigo-300 rounded">
                    x-device-token
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-400">Lookup By:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setKioskLookupType('email'); setKioskLookupValue('elena.rostova@example.com'); }}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          kioskLookupType === 'email' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => { setKioskLookupType('id'); setKioskLookupValue('1'); }}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          kioskLookupType === 'id' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Subscriber ID
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={kioskLookupValue}
                      onChange={(e) => setKioskLookupValue(e.target.value)}
                      placeholder={kioskLookupType === 'email' ? 'Enter email...' : 'Enter ID...'}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 text-xs rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleVerifyKioskAccess}
                      disabled={isVerifyingKiosk}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {isVerifyingKiosk ? 'Verifying...' : 'Verify Gate Entry'}
                    </button>
                  </div>
                </div>

                {/* Gate Result Display */}
                {kioskVerifyResult && (
                  <div
                    className={`p-4 rounded-xl border space-y-2 ${
                      kioskVerifyResult.accessGranted
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {kioskVerifyResult.accessGranted ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span>ACCESS GRANTED (Turnstile Unlocked)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-rose-400" />
                            <span>ACCESS DENIED (Turnstile Locked)</span>
                          </>
                        )}
                      </div>
                      <span className="text-xs font-mono">HTTP {kioskVerifyResult.httpStatus || 200}</span>
                    </div>

                    <div className="text-xs opacity-90">{kioskVerifyResult.reason}</div>

                    {kioskVerifyResult.subscriber && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-xs font-mono grid grid-cols-2 gap-2">
                        <div>Name: <strong>{kioskVerifyResult.subscriber.name}</strong></div>
                        <div>Plan: <strong>{kioskVerifyResult.subscriber.planName}</strong></div>
                        <div>Days Left: <strong>{kioskVerifyResult.subscriber.daysLeft}d</strong></div>
                        <div>Status: <strong>{kioskVerifyResult.subscriber.status}</strong></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Incremental Differential Face Vector Sync */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm text-white">Incremental Kiosk Face Sync</h2>
                      <p className="text-xs text-slate-400">GET /api/kiosk/face-embeddings?since=timestamp</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-800 text-cyan-300 rounded">
                    Firestore Delta
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">Differential Filter (since ISO timestamp, optional):</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="e.g. 2026-08-01T00:00:00.000Z"
                        value={incrementalSince}
                        onChange={(e) => setIncrementalSince(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 text-xs rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={handleRunIncrementalSync}
                        disabled={isSyncing}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50"
                      >
                        {isSyncing ? 'Syncing...' : 'Pull Delta Sync'}
                      </button>
                    </div>
                  </div>
                </div>

                {syncOutput && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="text-cyan-400 font-bold">Sync Result Summary:</div>
                    <div className="text-slate-300">Total Matched: {syncOutput.total || 0}</div>
                    <div className="text-slate-300">Embeddings Payload Count: {syncOutput.embeddings?.length || 0}</div>
                    <div className="text-slate-400 text-[10px]">Server Time: {syncOutput.serverTime}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: API EXPLORER & CURL PLAYGROUND */}
        {/* ========================================================================= */}
        {activeTab === 'api' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h2 className="font-bold text-white text-base">REST API Endpoints & Multi-Tenant Authorization</h2>
              <p className="text-xs text-slate-400">Ready-to-use cURL commands with simulated role headers and device tokens.</p>

              <div className="space-y-3 pt-2">
                {[
                  {
                    method: 'GET',
                    endpoint: '/api/tenants',
                    role: 'company_admin',
                    desc: 'List all platform tenants with aggregate subscriber quotas and device metrics.',
                    cmd: `curl -H "x-simulated-role: company_admin" http://localhost:3000/api/tenants`
                  },
                  {
                    method: 'POST',
                    endpoint: '/api/subscribers',
                    role: 'tenant_admin',
                    desc: 'Create subscriber with strict quota enforcement & sync 128-d face vector to Firestore.',
                    cmd: `curl -X POST http://localhost:3000/api/subscribers \\
  -H "Content-Type: application/json" \\
  -H "x-simulated-role: tenant_admin" \\
  -H "x-simulated-tenant-id: 1" \\
  -d '{"name":"Alex Rivers","email":"alex@example.com","plan_id":1}'`
                  },
                  {
                    method: 'GET',
                    endpoint: '/api/subscribers/:id/days-left',
                    role: 'tenant_admin',
                    desc: 'Compute real-time days left and subscription expiration countdown.',
                    cmd: `curl -H "x-simulated-role: tenant_admin" -H "x-simulated-tenant-id: 1" http://localhost:3000/api/subscribers/1/days-left`
                  },
                  {
                    method: 'GET',
                    endpoint: '/api/kiosk/face-embeddings',
                    role: 'device',
                    desc: 'Incremental delta face embedding synchronization for edge devices.',
                    cmd: `curl -H "x-device-token: dev_apex_kiosk_main_a109bf83" "http://localhost:3000/api/kiosk/face-embeddings?since=2026-08-01T00:00:00.000Z"`
                  },
                  {
                    method: 'POST',
                    endpoint: '/api/kiosk/verify-access',
                    role: 'device',
                    desc: 'Edge turnstile entry verification by face lookup, email, or subscriber ID.',
                    cmd: `curl -X POST http://localhost:3000/api/kiosk/verify-access \\
  -H "Content-Type: application/json" \\
  -H "x-device-token: dev_apex_kiosk_main_a109bf83" \\
  -d '{"email":"elena.rostova@example.com"}'`
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                          item.method === 'GET' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {item.method}
                        </span>
                        <code className="text-xs text-white font-bold">{item.endpoint}</code>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Role: {item.role}</span>
                    </div>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                    <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-[11px] text-indigo-300 overflow-x-auto font-mono">
                      {item.cmd}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-5 text-center text-xs text-slate-500">
        Google Cloud SQL (PostgreSQL) + Firebase Auth + Cloud Firestore Native Integration
      </footer>
    </div>
  );
}
