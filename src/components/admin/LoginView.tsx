import React, { useState } from 'react';
import { Shield, Lock, Mail, Key, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { auth, googleAuthProvider } from '../../lib/firebase.ts';
import { api } from '../../lib/api-client.ts';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

interface LoginViewProps {
  onLoginSuccess: (user: { email: string; role: string; token?: string }) => void;
}

/**
 * Reads the role from the token's custom claims, falling back to asking the API
 * who it thinks we are. The server is the authority either way — this only picks
 * the screen to render, and a wrong answer here cannot unlock any data.
 */
async function resolveRole(claims: Record<string, any>): Promise<string | null> {
  const claimed = claims.role ?? (claims.company_admin === true ? 'company_admin' : null);
  if (claimed === 'company_admin' || claimed === 'tenant_admin') return claimed;

  try {
    const health = await api.get('/api/health');
    const role = health?.caller?.role;
    return role === 'company_admin' || role === 'tenant_admin' ? role : null;
  } catch {
    return null;
  }
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firebase Email/Password Sign In
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const idTokenResult = await userCred.user.getIdTokenResult(true);

      // The role must come from a signed custom claim. Matching on the email string
      // ("superadmin", "@platform.io") let anyone who could register such an address
      // walk into the panel. The server verifies the same claim independently, so this
      // check only decides which screen to show.
      const role = await resolveRole(idTokenResult.claims);

      if (!role) {
        setError('Access denied: this account has no admin role assigned.');
        setLoading(false);
        return;
      }

      onLoginSuccess({
        email: userCred.user.email || email,
        role,
        token: idTokenResult.token,
      });
    } catch (err: any) {
      // In local dev without live Firebase project connection, allow clear explanation
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Firebase Google Sign-In
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const userCred = await signInWithPopup(auth, googleAuthProvider);
      const idTokenResult = await userCred.user.getIdTokenResult(true);

      const role = await resolveRole(idTokenResult.claims);

      if (!role) {
        setError('Access denied: this Google account has no admin role assigned.');
        setLoading(false);
        return;
      }

      onLoginSuccess({
        email: userCred.user.email || '',
        role,
        token: idTokenResult.token,
      });
    } catch (err: any) {
      setError(err.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  // Instant Dev Sandbox Bypass Login (for frictionless testing)
  const handleDevSandboxLogin = () => {
    setLoading(true);
    setTimeout(() => {
      onLoginSuccess({
        email: 'superadmin@platform.io',
        role: 'company_admin',
      });
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 text-slate-100 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-xl shadow-indigo-500/25 border border-indigo-400/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Company Control Panel</h1>
          <p className="text-sm text-slate-400 mt-2">
            Internal administrative gateway for multi-tenant B2B platform operations
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            <Lock className="w-3 h-3" />
            Restricted: company_admin role only
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@platform.io"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] font-medium text-sm text-white shadow-lg shadow-indigo-600/30 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In as Company Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* The unauthenticated one-click superadmin sign-in that used to sit here
              handed full platform access to anyone who loaded this page. It is now
              available only when the local sandbox flag is on. */}
          {import.meta.env.DEV && (
            <>
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <span className="relative px-3 bg-slate-900 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Local development only
                </span>
              </div>

              <button
                type="button"
                onClick={handleDevSandboxLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md group"
              >
                <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span>Dev sandbox sign-in</span>
              </button>
            </>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs text-center">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>All admin writes are verified via RBAC & logged to audit_logs</span>
        </div>
      </div>
    </div>
  );
};
