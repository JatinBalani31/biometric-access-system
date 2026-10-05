import React, { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Building2, HardDrive, History, LogOut, Pencil, Plus, RefreshCw, Save, Trash2, Users, X } from 'lucide-react';
import { LoginView } from '../admin/LoginView.tsx';
import { api } from '../../lib/api-client.ts';
import { auth } from '../../lib/firebase.ts';
import { canTenant, tenantRoles, TenantRole } from '../../lib/permissions.ts';

interface TenantIdentity {
  email: string;
  tenantId: number;
  tenantRole: TenantRole;
}

interface TenantProfile {
  id: number;
  companyName: string;
  contactEmail: string;
  status: string;
  planTier: string;
  subscriberLimit: number;
}

interface Subscriber {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  endDate: string;
  planName: string;
}

interface Plan {
  id: number;
  name: string;
  durationDays: number;
  price: string;
}

interface Device {
  id: number;
  deviceName: string;
  status: string;
  lastSyncedAt: string | null;
}

interface ActivityEntry {
  id: number;
  action: string;
  actorEmail: string;
  actorRole: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
}

type WorkspaceView = 'subscribers' | 'plans' | 'devices' | 'activity';
const workspaceKey = (tenantId: number) => ['tenant-workspace', tenantId] as const;

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function QueryState({
  loading,
  error,
  empty,
  emptyText,
  retry,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  emptyText: string;
  retry: () => void;
  children: React.ReactNode;
}) {
  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading…</div>;
  }
  if (error) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-rose-300">{messageFrom(error)}</p>
        <button onClick={retry} className="mt-4 inline-flex items-center gap-2 border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }
  if (empty) return <div className="py-16 text-center text-sm text-slate-500">{emptyText}</div>;
  return <>{children}</>;
}

export function TenantWorkspace() {
  const [identity, setIdentity] = useState<TenantIdentity | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setIdentity(null);
      setAuthLoading(false);
      return;
    }
    try {
      const { claims } = await user.getIdTokenResult();
      const tenantId = claims.tenantId;
      const tenantRole = claims.tenantRole as TenantRole;
      if (claims.role === 'tenant_admin' && Number.isInteger(tenantId) && tenantRoles.includes(tenantRole)) {
        setIdentity({ email: user.email || '', tenantId: tenantId as number, tenantRole });
      } else {
        setIdentity(null);
        await signOut(auth);
      }
    } catch {
      setIdentity(null);
      await signOut(auth);
    } finally {
      setAuthLoading(false);
    }
  }), []);

  if (authLoading) {
    return <main className="min-h-screen bg-slate-950 p-10 text-center text-sm text-slate-400">Checking sign-in…</main>;
  }

  if (!identity) {
    return (
      <LoginView
        audience="tenant"
        onLoginSuccess={(user) => {
          if (user.role === 'tenant_admin' && typeof user.tenantId === 'number' && Number.isInteger(user.tenantId) && user.tenantRole) {
            setIdentity({ email: user.email, tenantId: user.tenantId, tenantRole: user.tenantRole });
          }
        }}
      />
    );
  }

  return <TenantWorkspaceView identity={identity} onSignOut={() => signOut(auth)} />;
}

function TenantWorkspaceView({ identity, onSignOut }: { identity: TenantIdentity; onSignOut: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<WorkspaceView>('subscribers');
  const [subscriberDraft, setSubscriberDraft] = useState({ name: '', email: '', phone: '', plan_id: '' });
  const [editingSubscriber, setEditingSubscriber] = useState<{ id: number; name: string; status: string } | null>(null);
  const [planDraft, setPlanDraft] = useState({ name: '', duration_days: '30', price: '0.00' });
  const [editingPlan, setEditingPlan] = useState<{ id: number; name: string; duration_days: string; price: string } | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [newDeviceToken, setNewDeviceToken] = useState('');
  const invalidate = () => queryClient.invalidateQueries({ queryKey: workspaceKey(identity.tenantId) });

  const profile = useQuery({
    queryKey: [...workspaceKey(identity.tenantId), 'profile'],
    queryFn: () => api.get<TenantProfile>('/api/tenants/me'),
  });
  const subscribers = useQuery({
    queryKey: [...workspaceKey(identity.tenantId), 'subscribers'],
    queryFn: async () => (await api.get<{ data: Subscriber[] }>('/api/subscribers')).data,
  });
  const plans = useQuery({
    queryKey: [...workspaceKey(identity.tenantId), 'plans'],
    queryFn: () => api.get<Plan[]>('/api/plans'),
  });
  const devices = useQuery({
    queryKey: [...workspaceKey(identity.tenantId), 'devices'],
    queryFn: () => api.get<Device[]>('/api/devices'),
  });
  const activity = useQuery({
    queryKey: [...workspaceKey(identity.tenantId), 'activity'],
    queryFn: async () => (await api.get<{ logs: ActivityEntry[] }>('/api/tenants/me/activity')).logs,
    enabled: canTenant(identity.tenantRole, 'activity', 'read'),
  });

  const createSubscriber = useMutation({
    mutationFn: () => api.post('/api/subscribers', {
      name: subscriberDraft.name,
      email: subscriberDraft.email || undefined,
      phone: subscriberDraft.phone || undefined,
      plan_id: subscriberDraft.plan_id ? Number(subscriberDraft.plan_id) : undefined,
    }),
    onSuccess: async () => { setSubscriberDraft({ name: '', email: '', phone: '', plan_id: '' }); await invalidate(); },
  });
  const updateSubscriber = useMutation({
    mutationFn: (input: { id: number; name: string; status: string }) => api.patch(`/api/subscribers/${input.id}`, input),
    onSuccess: async () => { setEditingSubscriber(null); await invalidate(); },
  });
  const deleteSubscriber = useMutation({
    mutationFn: (id: number) => api.delete(`/api/subscribers/${id}`),
    onSuccess: invalidate,
  });
  const createPlan = useMutation({
    mutationFn: () => api.post('/api/plans', {
      name: planDraft.name,
      duration_days: Number(planDraft.duration_days),
      price: planDraft.price,
    }),
    onSuccess: async () => { setPlanDraft({ name: '', duration_days: '30', price: '0.00' }); await invalidate(); },
  });
  const updatePlan = useMutation({
    mutationFn: (input: { id: number; name: string; duration_days: string; price: string }) => api.patch(`/api/plans/${input.id}`, {
      name: input.name,
      duration_days: Number(input.duration_days),
      price: input.price,
    }),
    onSuccess: async () => { setEditingPlan(null); await invalidate(); },
  });
  const deletePlan = useMutation({
    mutationFn: (id: number) => api.delete(`/api/plans/${id}`),
    onSuccess: invalidate,
  });
  const createDevice = useMutation({
    mutationFn: () => api.post<{ device: Device; apiKeyInstructions: { bearerFormat: string } }>('/api/devices', { device_name: deviceName }),
    onSuccess: async (result) => { setNewDeviceToken(result.apiKeyInstructions.bearerFormat); setDeviceName(''); await invalidate(); },
  });
  const updateDevice = useMutation({
    mutationFn: (input: { id: number; status: string }) => api.patch(`/api/devices/${input.id}`, { status: input.status }),
    onSuccess: invalidate,
  });
  const revokeDevice = useMutation({
    mutationFn: (id: number) => api.delete(`/api/devices/${id}`),
    onSuccess: invalidate,
  });

  if (profile.isLoading || profile.error || !profile.data) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-14 text-slate-100">
        <div className="mx-auto max-w-3xl border-y border-slate-800">
          <QueryState loading={profile.isLoading} error={profile.error} empty={!profile.data} emptyText="Organization not found." retry={() => void profile.refetch()}>
            <span />
          </QueryState>
        </div>
      </main>
    );
  }

  const tabs: { id: WorkspaceView; label: string; icon: React.ReactNode }[] = [
    { id: 'subscribers', label: 'Members', icon: <Users className="h-4 w-4" /> },
    { id: 'plans', label: 'Plans', icon: <Building2 className="h-4 w-4" /> },
    { id: 'devices', label: 'Devices', icon: <HardDrive className="h-4 w-4" /> },
    ...(canTenant(identity.tenantRole, 'activity', 'read') ? [{ id: 'activity' as const, label: 'Activity', icon: <History className="h-4 w-4" /> }] : []),
  ];

  const roleCan = (resource: 'subscribers' | 'plans' | 'devices', action: 'create' | 'update' | 'delete') =>
    canTenant(identity.tenantRole, resource, action);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase text-cyan-300">Organization workspace</p>
            <h1 className="truncate text-xl font-semibold">{profile.data.companyName}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden text-sm text-slate-400 sm:block">{identity.tenantRole}</span>
            <button onClick={() => void onSignOut()} title="Sign out" className="border border-slate-700 p-2 text-slate-300 hover:bg-slate-800">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7">
        <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-800" aria-label="Workspace sections">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setView(tab.id)} aria-current={view === tab.id ? 'page' : undefined}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm ${view === tab.id ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>

        {view === 'subscribers' && (
          <section aria-labelledby="members-title">
            <h2 id="members-title" className="mb-5 text-lg font-semibold">Members</h2>
            {roleCan('subscribers', 'create') && (
              <form onSubmit={(event: FormEvent) => { event.preventDefault(); createSubscriber.mutate(); }} className="mb-6 grid gap-3 border-y border-slate-800 py-4 md:grid-cols-5">
                <input required value={subscriberDraft.name} onChange={(e) => setSubscriberDraft({ ...subscriberDraft, name: e.target.value })} placeholder="Member name" className="bg-slate-900 px-3 py-2 text-sm" />
                <input type="email" value={subscriberDraft.email} onChange={(e) => setSubscriberDraft({ ...subscriberDraft, email: e.target.value })} placeholder="Email" className="bg-slate-900 px-3 py-2 text-sm" />
                <input value={subscriberDraft.phone} onChange={(e) => setSubscriberDraft({ ...subscriberDraft, phone: e.target.value })} placeholder="Phone" className="bg-slate-900 px-3 py-2 text-sm" />
                <select value={subscriberDraft.plan_id} onChange={(e) => setSubscriberDraft({ ...subscriberDraft, plan_id: e.target.value })} className="bg-slate-900 px-3 py-2 text-sm">
                  <option value="">No plan selected</option>{(plans.data || []).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
                <button disabled={createSubscriber.isPending} className="inline-flex items-center justify-center gap-2 bg-cyan-700 px-3 py-2 text-sm hover:bg-cyan-600 disabled:opacity-50"><Plus className="h-4 w-4" /> Add member</button>
                {createSubscriber.error && <p role="alert" className="text-sm text-rose-300 md:col-span-5">{messageFrom(createSubscriber.error)}</p>}
              </form>
            )}
            <QueryState loading={subscribers.isLoading} error={subscribers.error} empty={!subscribers.data?.length} emptyText="No members yet." retry={() => void subscribers.refetch()}>
              <div className="overflow-x-auto border-y border-slate-800">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="py-3 pr-4">Name</th><th className="py-3 pr-4">Contact</th><th className="py-3 pr-4">Plan</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Expires</th><th className="py-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {(subscribers.data || []).map((member) => (
                      <tr key={member.id}>
                        <td className="py-3 pr-4">{editingSubscriber?.id === member.id
                          ? <input value={editingSubscriber.name} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, name: e.target.value })} className="bg-slate-900 px-2 py-1" />
                          : member.name}</td>
                        <td className="py-3 pr-4 text-slate-400">{member.email || member.phone || '—'}</td>
                        <td className="py-3 pr-4 text-slate-300">{member.planName || 'Unassigned'}</td>
                        <td className="py-3 pr-4">{editingSubscriber?.id === member.id
                          ? <select value={editingSubscriber.status} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, status: e.target.value })} className="bg-slate-900 px-2 py-1"><option>active</option><option>suspended</option><option>expired</option></select>
                          : member.status}</td>
                        <td className="py-3 pr-4 text-slate-400">{new Date(member.endDate).toLocaleDateString()}</td>
                        <td className="py-3 text-right">
                          {editingSubscriber?.id === member.id ? <span className="inline-flex gap-2">
                            <button title="Save member" onClick={() => updateSubscriber.mutate(editingSubscriber)} className="text-cyan-300"><Save className="h-4 w-4" /></button>
                            <button title="Cancel edit" onClick={() => setEditingSubscriber(null)} className="text-slate-400"><X className="h-4 w-4" /></button>
                          </span> : <span className="inline-flex gap-3">
                            {roleCan('subscribers', 'update') && <button title="Edit member" onClick={() => setEditingSubscriber({ id: member.id, name: member.name, status: member.status })} className="text-cyan-300"><Pencil className="h-4 w-4" /></button>}
                            {roleCan('subscribers', 'delete') && <button title="Delete member" onClick={() => { if (window.confirm(`Delete ${member.name}?`)) deleteSubscriber.mutate(member.id); }} className="text-rose-300"><Trash2 className="h-4 w-4" /></button>}
                          </span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </QueryState>
            {(updateSubscriber.error || deleteSubscriber.error) && <p role="alert" className="mt-3 text-sm text-rose-300">{messageFrom(updateSubscriber.error || deleteSubscriber.error)}</p>}
          </section>
        )}

        {view === 'plans' && (
          <section aria-labelledby="plans-title">
            <h2 id="plans-title" className="mb-5 text-lg font-semibold">Subscription plans</h2>
            {roleCan('plans', 'create') && <form onSubmit={(event: FormEvent) => { event.preventDefault(); createPlan.mutate(); }} className="mb-6 grid gap-3 border-y border-slate-800 py-4 md:grid-cols-4">
              <input required value={planDraft.name} onChange={(e) => setPlanDraft({ ...planDraft, name: e.target.value })} placeholder="Plan name" className="bg-slate-900 px-3 py-2 text-sm" />
              <input required type="number" min="1" value={planDraft.duration_days} onChange={(e) => setPlanDraft({ ...planDraft, duration_days: e.target.value })} aria-label="Duration in days" className="bg-slate-900 px-3 py-2 text-sm" />
              <input required type="number" min="0" step="0.01" value={planDraft.price} onChange={(e) => setPlanDraft({ ...planDraft, price: e.target.value })} aria-label="Price" className="bg-slate-900 px-3 py-2 text-sm" />
              <button disabled={createPlan.isPending} className="inline-flex items-center justify-center gap-2 bg-cyan-700 px-3 py-2 text-sm hover:bg-cyan-600 disabled:opacity-50"><Plus className="h-4 w-4" /> Add plan</button>
              {createPlan.error && <p role="alert" className="text-sm text-rose-300 md:col-span-4">{messageFrom(createPlan.error)}</p>}
            </form>}
            <QueryState loading={plans.isLoading} error={plans.error} empty={!plans.data?.length} emptyText="No plans configured yet." retry={() => void plans.refetch()}>
              <div className="divide-y divide-slate-800 border-y border-slate-800">
                {(plans.data || []).map((plan) => <div key={plan.id} className="flex flex-wrap items-center gap-3 py-3">
                  {editingPlan?.id === plan.id ? <>
                    <input value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} className="min-w-40 bg-slate-900 px-2 py-1" />
                    <input type="number" min="1" value={editingPlan.duration_days} onChange={(e) => setEditingPlan({ ...editingPlan, duration_days: e.target.value })} aria-label="Duration in days" className="w-24 bg-slate-900 px-2 py-1" />
                    <input type="number" min="0" step="0.01" value={editingPlan.price} onChange={(e) => setEditingPlan({ ...editingPlan, price: e.target.value })} aria-label="Price" className="w-28 bg-slate-900 px-2 py-1" />
                    <button title="Save plan" onClick={() => updatePlan.mutate(editingPlan)} className="text-cyan-300"><Save className="h-4 w-4" /></button>
                    <button title="Cancel edit" onClick={() => setEditingPlan(null)} className="text-slate-400"><X className="h-4 w-4" /></button>
                  </> : <>
                    <span className="min-w-40 flex-1 font-medium">{plan.name}</span><span className="text-slate-400">{plan.durationDays} days</span><span className="w-24 text-right">{plan.price}</span>
                    {roleCan('plans', 'update') && <button title="Edit plan" onClick={() => setEditingPlan({ id: plan.id, name: plan.name, duration_days: String(plan.durationDays), price: plan.price })} className="ml-2 text-cyan-300"><Pencil className="h-4 w-4" /></button>}
                    {roleCan('plans', 'delete') && <button title="Delete plan" onClick={() => { if (window.confirm(`Delete ${plan.name}?`)) deletePlan.mutate(plan.id); }} className="text-rose-300"><Trash2 className="h-4 w-4" /></button>}
                  </>}
                </div>)}
              </div>
            </QueryState>
            {(updatePlan.error || deletePlan.error) && <p role="alert" className="mt-3 text-sm text-rose-300">{messageFrom(updatePlan.error || deletePlan.error)}</p>}
          </section>
        )}

        {view === 'devices' && (
          <section aria-labelledby="devices-title">
            <h2 id="devices-title" className="mb-5 text-lg font-semibold">Access devices</h2>
            {roleCan('devices', 'create') && <form onSubmit={(event: FormEvent) => { event.preventDefault(); createDevice.mutate(); }} className="mb-6 flex flex-wrap gap-3 border-y border-slate-800 py-4">
              <input required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Device name" className="min-w-64 flex-1 bg-slate-900 px-3 py-2 text-sm" />
              <button disabled={createDevice.isPending} className="inline-flex items-center gap-2 bg-cyan-700 px-3 py-2 text-sm hover:bg-cyan-600 disabled:opacity-50"><Plus className="h-4 w-4" /> Add device</button>
              {createDevice.error && <p role="alert" className="w-full text-sm text-rose-300">{messageFrom(createDevice.error)}</p>}
            </form>}
            {newDeviceToken && <p className="mb-4 break-all border border-amber-700/60 bg-amber-950/30 p-3 text-sm text-amber-200">Copy this device token now: <code>{newDeviceToken}</code></p>}
            <QueryState loading={devices.isLoading} error={devices.error} empty={!devices.data?.length} emptyText="No devices registered yet." retry={() => void devices.refetch()}>
              <div className="overflow-x-auto border-y border-slate-800">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="py-3 pr-4">Device</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Last sync</th><th className="py-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">{(devices.data || []).map((device) => <tr key={device.id}>
                    <td className="py-3 pr-4">{device.deviceName}</td><td className="py-3 pr-4">{device.status}</td><td className="py-3 pr-4 text-slate-400">{device.lastSyncedAt ? new Date(device.lastSyncedAt).toLocaleString() : 'Never'}</td>
                    <td className="py-3 text-right">
                      {roleCan('devices', 'update') && device.status !== 'revoked' && <button onClick={() => updateDevice.mutate({ id: device.id, status: device.status === 'maintenance' ? 'active' : 'maintenance' })} className="mr-3 text-cyan-300">{device.status === 'maintenance' ? 'Activate' : 'Maintenance'}</button>}
                      {roleCan('devices', 'delete') && device.status !== 'revoked' && <button title="Revoke device" onClick={() => { if (window.confirm(`Revoke ${device.deviceName}?`)) revokeDevice.mutate(device.id); }} className="text-rose-300"><Trash2 className="h-4 w-4" /></button>}
                    </td>
                  </tr>)}</tbody>
                </table>
              </div>
            </QueryState>
            {(updateDevice.error || revokeDevice.error) && <p role="alert" className="mt-3 text-sm text-rose-300">{messageFrom(updateDevice.error || revokeDevice.error)}</p>}
          </section>
        )}

        {view === 'activity' && canTenant(identity.tenantRole, 'activity', 'read') && (
          <section aria-labelledby="activity-title">
            <h2 id="activity-title" className="mb-5 text-lg font-semibold">Organization activity</h2>
            <QueryState loading={activity.isLoading} error={activity.error} empty={!activity.data?.length} emptyText="No activity recorded yet." retry={() => void activity.refetch()}>
              <div className="divide-y divide-slate-800 border-y border-slate-800">
                {(activity.data || []).map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p className="font-medium">{entry.action}</p><p className="text-xs text-slate-400">{entry.actorEmail} · {entry.actorRole} · {entry.targetType} {entry.targetId || ''}</p></div>
                  <time className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</time>
                </div>)}
              </div>
            </QueryState>
          </section>
        )}
      </main>
    </div>
  );
}