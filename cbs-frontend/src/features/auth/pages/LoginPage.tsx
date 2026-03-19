import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      if (useAuthStore.getState().mfaRequired) {
        navigate('/mfa');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#0B1A56] via-[#1E40AF] to-[#15308A] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-bold text-lg">BB</div>
            <span className="text-xl font-semibold tracking-tight">DigiCore</span>
          </div>
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold leading-tight">Core Banking System</h1>
            <p className="text-lg text-blue-200 mt-4 leading-relaxed">
              Secure, scalable, and compliant banking operations platform.
              Manage customers, accounts, lending, payments, treasury, and risk — all in one place.
            </p>
            <div className="flex gap-6 mt-8 text-sm text-blue-300">
              <div><span className="text-2xl font-bold text-white block">240+</span>DB Tables</div>
              <div><span className="text-2xl font-bold text-white block">758</span>API Endpoints</div>
              <div><span className="text-2xl font-bold text-white block">99.9%</span>Uptime SLA</div>
            </div>
          </div>
          <p className="text-xs text-blue-400">&copy; {new Date().getFullYear()} DigiCore MFB. All rights reserved.</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-bold text-lg text-white">BB</div>
            <span className="text-xl font-semibold">DigiCore CBS</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access the platform</p>
          </div>

          {reason === 'session_expired' && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Your session expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Username / Staff ID</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
                disabled={isLoading}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full px-3 py-2 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Remember username
              </label>
              <a href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-8">
            Demo: username <code className="bg-muted px-1 rounded">admin</code> / password <code className="bg-muted px-1 rounded">admin</code>
          </p>
        </div>
      </div>
    </div>
  );
}
