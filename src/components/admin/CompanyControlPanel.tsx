import { api } from '../../lib/api-client.ts';
import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase.ts';
import {
  Shield,
  Building2,
  Activity,
  DollarSign,
  History,
  LogOut,
  Sparkles,
  Layers,
  ChevronRight,
  Menu,
  X,
  User,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus
} from 'lucide-react';
import { LoginView } from './LoginView.tsx';
import { TenantListView } from './TenantListView.tsx';
import { TenantDetailView } from './TenantDetailView.tsx';
import { CreateTenantModal } from './CreateTenantModal.tsx';
import { UsageDashboardView } from './UsageDashboardView.tsx';
import { BillingView } from './BillingView.tsx';
import { AuditLogView } from './AuditLogView.tsx';

interface CompanyControlPanelProps {
  onSwitchToDevPortal?: () => void;
}

export const CompanyControlPanel: React.FC<CompanyControlPanelProps> = ({
  onSwitchToDevPortal,
}) => {
  // Auth state (Enforcing company_admin role on every screen)
  const [currentUser, setCurrentUser] = useState<{ email: string; role: string } | null>(null);

  // Navigation State
  const [activeScreen, setActiveScreen] = useState<'tenants' | 'tenant-detail' | 'usage' | 'billing' | 'audit'>('tenants');
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Data
  const [tenants, setTenants] = useState<any[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Quick Suspend/Activate Modal
  const [quickStatusModal, setQuickStatusModal] = useState<{ tenantId: number; currentStatus: string; companyName: string } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      setTenants(await api.get('/api/tenants'));
    } catch (err: any) {
      showToast('Failed to load tenants list', 'error');
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'company_admin') {
      fetchTenants();
    }
  }, [currentUser]);

  // Handle Tenant Selection
  const handleSelectTenant = (id: number) => {
    setSelectedTenantId(id);
    setActiveScreen('tenant-detail');
  };

  // Handle Quick Status Toggle
  const handleConfirmQuickStatus = async () => {
    if (!quickStatusModal) return;
    const nextStatus = quickStatusModal.currentStatus === 'suspended' ? 'active' : 'suspended';

    try {
      setIsSubmittingStatus(true);
      await api.patch(`/api/tenants/${quickStatusModal.tenantId}`, {
        status: nextStatus,
        reason: statusReason || undefined,
      });

      showToast(
        `Tenant "${quickStatusModal.companyName}" ${nextStatus === 'suspended' ? 'suspended' : 'reactivated'} successfully`,
        nextStatus === 'suspended' ? 'error' : 'success'
      );
      setQuickStatusModal(null);
      setStatusReason('');
      fetchTenants();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // If not authenticated as company_admin, show Login Screen (Screen 1)
  if (!currentUser || currentUser.role !== 'company_admin') {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.email}! Access granted to Company Control Panel.`, 'success');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-xs sm:text-sm font-medium backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                <span>Company Control Panel</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                  INTERNAL ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">B2B Platform Operations & Multi-Tenant Management</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveScreen('tenants');
                setSelectedTenantId(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeScreen === 'tenants' || activeScreen === 'tenant-detail'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Tenants</span>
            </button>

            <button
              onClick={() => setActiveScreen('usage')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeScreen === 'usage'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Usage & Telemetry</span>
            </button>

            <button
              onClick={() => setActiveScreen('billing')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeScreen === 'billing'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Billing & MRR</span>
            </button>

            <button
              onClick={() => setActiveScreen('audit')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeScreen === 'audit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {onSwitchToDevPortal && (
              <button
                onClick={onSwitchToDevPortal}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
                title="Switch to Developer Sandbox / API View"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dev API Sandbox</span>
              </button>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-white truncate max-w-[140px]">{currentUser.email}</div>
                <div className="text-[10px] text-emerald-400 font-mono font-medium flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  company_admin
                </div>
              </div>

              <button
                onClick={async () => {
                  await signOut(auth);
                  setCurrentUser(null);
                  showToast('Signed out of company control panel', 'info');
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 px-2 py-2 bg-slate-950">
          <button
            onClick={() => {
              setActiveScreen('tenants');
              setSelectedTenantId(null);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activeScreen === 'tenants' || activeScreen === 'tenant-detail' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            Tenants
          </button>
          <button
            onClick={() => setActiveScreen('usage')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activeScreen === 'usage' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            Usage
          </button>
          <button
            onClick={() => setActiveScreen('billing')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activeScreen === 'billing' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            Billing
          </button>
          <button
            onClick={() => setActiveScreen('audit')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activeScreen === 'audit' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            Audit Logs
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full">
        {activeScreen === 'tenants' && (
          <TenantListView
            tenants={tenants}
            loading={loadingTenants}
            onSelectTenant={handleSelectTenant}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onToggleStatus={(tenantId, currentStatus, companyName) =>
              setQuickStatusModal({ tenantId, currentStatus, companyName })
            }
            onRefresh={fetchTenants}
          />
        )}

        {activeScreen === 'tenant-detail' && selectedTenantId && (
          <TenantDetailView
            tenantId={selectedTenantId}
            onBack={() => {
              setActiveScreen('tenants');
              setSelectedTenantId(null);
              fetchTenants();
            }}
            onShowToast={showToast}
          />
        )}

        {activeScreen === 'usage' && (
          <UsageDashboardView
            onSelectTenant={(id) => {
              handleSelectTenant(id);
            }}
          />
        )}

        {activeScreen === 'billing' && (
          <BillingView
            onSelectTenant={(id) => {
              handleSelectTenant(id);
            }}
          />
        )}

        {activeScreen === 'audit' && <AuditLogView />}
      </main>

      {/* Create Tenant Modal (Screen 4) */}
      <CreateTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTenantCreated={(newTenant) => {
          showToast(`Tenant "${newTenant.companyName}" successfully onboarded!`, 'success');
          fetchTenants();
        }}
      />

      {/* Quick Suspend/Reactivate Modal */}
      {quickStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  quickStatusModal.currentStatus === 'suspended'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {quickStatusModal.currentStatus === 'suspended'
                    ? `Reactivate ${quickStatusModal.companyName}`
                    : `Suspend ${quickStatusModal.companyName}`}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {quickStatusModal.currentStatus === 'suspended'
                    ? 'All biometric face recognition kiosks will resume granting subscriber access.'
                    : 'All kiosks will immediately lock and deny biometric verification until reactivated.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reason for Audit Trail</label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Account reinstated after payment review..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setQuickStatusModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmQuickStatus}
                disabled={isSubmittingStatus}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all cursor-pointer ${
                  quickStatusModal.currentStatus === 'suspended'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {isSubmittingStatus
                  ? 'Processing...'
                  : quickStatusModal.currentStatus === 'suspended'
                  ? 'Confirm Reactivation'
                  : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
