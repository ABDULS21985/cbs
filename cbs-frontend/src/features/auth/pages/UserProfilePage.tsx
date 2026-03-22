import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, TabsPage } from '@/components/shared';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/formatters';
import {
  Building2,
  Clock,
  ExternalLink,
  Key,
  Loader2,
  LogOut,
  Monitor,
  RefreshCw,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';

const KEYCLOAK_BASE = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'cbs';
const KEYCLOAK_ACCOUNT_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/account`;

function describeRole(role: string) {
  switch (role) {
    case 'CBS_ADMIN':
      return 'Full system administration';
    case 'CBS_OFFICER':
      return 'Banking operations access';
    case 'CBS_VIEWER':
      return 'Read-only access';
    case 'TELLER':
      return 'Point-of-sale operations';
    case 'LOAN_OFFICER':
      return 'Lending module access';
    case 'TREASURY':
      return 'Treasury and investments';
    case 'RISK_OFFICER':
      return 'Risk management';
    case 'COMPLIANCE':
      return 'Compliance operations';
    case 'AUDITOR':
      return 'Audit trail access';
    default:
      return 'Custom platform role';
  }
}

function ProfileTab() {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  const initials = (user.fullName || user.username || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const profileFields = [
    { label: 'User ID', value: user.id },
    { label: 'Username', value: user.username },
    { label: 'Full Name', value: user.fullName },
    { label: 'Email', value: user.email || '—' },
    { label: 'Branch', value: user.branchName || '—' },
    { label: 'Branch ID', value: user.branchId != null ? String(user.branchId) : '—' },
    { label: 'Last Login', value: user.lastLogin ? formatDateTime(user.lastLogin) : '—' },
  ];

  const summaryCards = [
    {
      label: 'Assigned roles',
      value: String(user.roles.length || 0),
      detail: 'Identity-backed access groups',
      icon: Shield,
    },
    {
      label: 'Branch context',
      value: user.branchName || 'Unassigned',
      detail: user.branchId != null ? `Branch ID ${user.branchId}` : 'No branch bound to this profile',
      icon: Building2,
    },
    {
      label: 'Last access',
      value: user.lastLogin ? formatDateTime(user.lastLogin) : 'No recent session',
      detail: 'Last successful authenticated session',
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="gloss-panel rounded-[28px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 bg-gradient-to-br from-primary/85 via-cyan-400/70 to-accent/85 text-2xl font-extrabold text-slate-950 shadow-[0_18px_40px_rgba(34,211,238,0.18)]">
              {initials}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Identity profile
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {user.fullName || user.username}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {user.email || 'No email provided'} {user.branchName ? `· ${user.branchName}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <div key={role} className="gloss-pill rounded-full px-3 py-1.5">
                    <StatusBadge status={role} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
            {summaryCards.map(({ label, value, detail, icon: Icon }) => (
              <div key={label} className="gloss-pill rounded-2xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-xs uppercase tracking-[0.16em]">{label}</p>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-foreground">{value}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="gloss-panel rounded-[26px] p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Account information
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Directory and session identity fields</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {profileFields.map((field) => (
            <div key={field.label} className="gloss-pill rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {field.label}
              </p>
              <p className="mt-2 break-words text-sm font-medium leading-6 text-foreground">
                {field.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="gloss-panel rounded-[26px] p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Role posture
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Assigned operational privileges</h3>
        </div>
        <div className="grid gap-3">
          {user.roles.map((role) => (
            <div key={role} className="gloss-pill flex items-start gap-3 rounded-2xl px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Shield className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{role.replace(/_/g, ' ')}</p>
                <p className="text-sm leading-6 text-muted-foreground">{describeRole(role)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const { tokenExpiresAt, refreshToken, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleChangePassword = () => {
    window.open(`${KEYCLOAK_ACCOUNT_URL}/#/security/signingin`, '_blank');
  };

  const handleManageMfa = () => {
    window.open(`${KEYCLOAK_ACCOUNT_URL}/#/security/signingin`, '_blank');
  };

  const handleManageSessions = () => {
    window.open(`${KEYCLOAK_ACCOUNT_URL}/#/security/device-activity`, '_blank');
  };

  const handleRefreshSession = async () => {
    setRefreshing(true);
    try {
      await refreshToken();
    } catch {
      // Store handles surfaced errors
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = () => {
    logout();
    window.location.href = '/login';
  };

  const expiresIn = tokenExpiresAt ? Math.max(0, Math.floor((tokenExpiresAt - Date.now()) / 1000)) : 0;
  const expiresMinutes = Math.floor(expiresIn / 60);
  const expiresSeconds = expiresIn % 60;

  return (
    <div className="space-y-6">
      <div className="gloss-panel rounded-[28px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Session control
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Current operator session
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              View token lifetime, refresh the current session, or jump to the hosted identity console for password, MFA, and device activity management.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[430px]">
            <div className="gloss-pill rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Session status
              </p>
              <div className="mt-3">
                <StatusBadge status="ACTIVE" />
              </div>
            </div>
            <div className="gloss-pill rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Token expires in
              </p>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {expiresMinutes}m {expiresSeconds.toString().padStart(2, '0')}s
              </p>
            </div>
            <div className="gloss-pill rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Authentication
              </p>
              <p className="mt-3 text-sm font-semibold text-foreground">Keycloak OIDC + PKCE</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleRefreshSession}
            disabled={refreshing}
            className="auth-primary-button"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh session
          </button>
          <button
            onClick={handleSignOut}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="gloss-panel rounded-[26px] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Key className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Password</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Change credentials in the hosted identity account area instead of locally in the banking app.
              </p>
            </div>
          </div>
          <button onClick={handleChangePassword} className="auth-secondary-button mt-5 w-full">
            Change password
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <div className="gloss-panel rounded-[26px] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Multi-factor authentication</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Enroll, rotate, or review factors under the same centralized identity policy.
              </p>
            </div>
          </div>
          <button onClick={handleManageMfa} className="auth-secondary-button mt-5 w-full">
            Manage MFA
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <div className="gloss-panel rounded-[26px] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Monitor className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Device activity</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Inspect active sessions and sign out other devices from the hosted account console.
              </p>
            </div>
          </div>
          <button onClick={handleManageSessions} className="auth-secondary-button mt-5 w-full">
            View device activity
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserProfilePage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'security' ? 'security' : 'profile';

  useEffect(() => {
    document.title = 'My Profile | CBS';
  }, []);

  if (!user) {
    return null;
  }

  return (
    <>
      <PageHeader
        title="My Profile"
        subtitle="View your account details, manage security settings, and monitor session activity."
      />
      <div className="page-container">
        <TabsPage
          syncWithUrl
          defaultTab={defaultTab}
          tabs={[
            {
              id: 'profile',
              label: 'Profile',
              content: <ProfileTab />,
            },
            {
              id: 'security',
              label: 'Security',
              content: <SecurityTab />,
            },
          ]}
        />
      </div>
    </>
  );
}
