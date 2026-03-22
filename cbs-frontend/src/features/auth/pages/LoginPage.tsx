import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  FlaskConical,
  KeyRound,
  Loader2,
  Orbit,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import coreBankingLoginPhoto from '@/assets/auth/core-banking-login-photo.jpg';
import { AuthShell } from '../components/AuthShell';

const heroMetrics = [
  { value: '240+', label: 'Core models' },
  { value: '758', label: 'Secured APIs' },
  { value: '99.9%', label: 'Access SLA' },
];

const heroFeatures = [
  {
    icon: ShieldCheck,
    title: 'Hosted credentials only',
    description: 'Passwords and MFA never touch the app shell. Authentication stays on Keycloak-hosted pages.',
  },
  {
    icon: Orbit,
    title: 'Role-aware landing',
    description: 'Operators, treasury, compliance, and portal users all re-enter through the same hardened trust boundary.',
  },
  {
    icon: KeyRound,
    title: 'Recovery built in',
    description: 'Reset and callback flows stay linked to session state, PKCE, and auditable identity recovery.',
  },
];

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const { login, devLogin, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    document.title = 'Secure Sign In | CBS';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username || undefined, undefined, from);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start secure sign-in. Please try again.');
    }
  };

  return (
    <AuthShell
      theme="light"
      badge="Identity Perimeter"
      title="Secure sign-in"
      description="Start a hardened hosted sign-in session for DigiCore CBS. Credentials, MFA, and recovery stay with the identity provider."
      icon={ShieldCheck}
      heroBackgroundSrc={coreBankingLoginPhoto}
      heroTitle="Operate every banking domain from a single hardened entry point."
      heroDescription="A cleaner hosted sign-in experience with zero local password handling, PKCE hand-off, and role-aware session recovery for production banking access."
      metrics={heroMetrics}
      features={heroFeatures}
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Need password recovery? Use the hosted reset flow.
          </p>
          <Link to="/forgot-password" className="auth-inline-link">
            Password reset
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    >
      {reason === 'session_expired' && (
        <div className="auth-warning-banner">
          <AlertCircle className="auth-warning-icon mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="auth-warning-title">Session expired</p>
            <p className="auth-warning-copy">
              Your previous secure session timed out. Start a fresh sign-in to continue.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="auth-status-banner border-red-500/20 bg-red-500/10 text-red-100">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
          <div>
            <p className="font-medium text-red-100">Unable to launch sign-in</p>
            <p className="mt-1 text-red-100/75">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="username" className="auth-field-label">
            Username or staff ID
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Optional login hint"
            autoFocus
            autoComplete="username"
            disabled={isLoading}
            className="auth-field-input"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            This pre-fills the hosted Keycloak page. Password entry always happens on the identity provider.
          </p>
        </div>

        <div className="gloss-pill rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Production-safe access hand-off</p>
              <p className="text-sm leading-6 text-muted-foreground">
                DigiCore CBS now uses Authorization Code + PKCE with hosted recovery and MFA. No local password entry, no shadow auth flow.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="auth-primary-button w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to secure sign-in
            </>
          ) : (
            <>
              Continue to secure sign-in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="gloss-pill rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Access path
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">Hosted Keycloak journey</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Best for staff, administrators, and sensitive operational roles.
          </p>
        </div>
        <div className="gloss-pill rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Recovery
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">Identity-managed reset</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Password recovery and MFA enrollment remain under the identity provider security policy.
          </p>
        </div>
      </div>

      <p className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Authentication uses hosted identity pages only
      </p>

      {import.meta.env.DEV && (
        <div className="auth-warning-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="auth-warning-chip">
              <FlaskConical className="h-4 w-4" />
            </div>
            <div>
              <p className="auth-warning-card-title">Development shortcuts</p>
              <p className="auth-warning-card-kicker">
                Local-only bypass
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {(['admin', 'officer', 'teller'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  devLogin(role);
                  navigate(from, { replace: true });
                }}
                className={cn('auth-warning-shortcut')}
              >
                <span className="auth-warning-shortcut-label">{role}</span>
                <span className="auth-warning-shortcut-meta">
                  {role === 'admin' ? 'CBS_ADMIN · full access' : role === 'officer' ? 'CBS_OFFICER' : 'TELLER'}
                </span>
              </button>
            ))}
          </div>
          <p className="auth-warning-note">
            Visible only in development mode. Production operators always use hosted identity flows.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
