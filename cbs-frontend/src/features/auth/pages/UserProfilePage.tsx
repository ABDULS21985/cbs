import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, StatCard, InfoGrid, TabsPage } from '@/components/shared';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/formatters';
import {
  User,
  Shield,
  Key,
  Monitor,
  Mail,
  Building2,
  Clock,
  ExternalLink,
  LogOut,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---- Keycloak account URLs (same as authApi.ts) ---------------------------------

const KEYCLOAK_BASE = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'cbs';
const KEYCLOAK_ACCOUNT_URL = `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/account`;

// ---- Profile Tab ----------------------------------------------------------------

function ProfileTab() {
  const { user } = useAuthStore();

  if (!user) return null;

  const profileFields = [
    { label: 'User ID', value: user.id },
    { label: 'Username', value: user.username },
    { label: 'Full Name', value: user.fullName },
    { label: 'Email', value: user.email || '—' },
    { label: 'Branch', value: user.branchName || '—' },
    { label: 'Branch ID', value: user.branchId != null ? String(user.branchId) : '—' },
    { label: 'Last Login', value: user.lastLogin ? formatDateTime(user.lastLogin) : '—' },
  ];

  return (
    <div className="space-y-6">
      {/* Avatar & name */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
          {(user.fullName || user.username || 'U')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{user.fullName || user.username}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {user.roles.map((role) => (
              <StatusBadge key={role} status={role} />
            ))}
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profileFields.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
              <p className="text-sm mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions summary */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Assigned Roles</h3>
        <div className="space-y-2">
          {user.roles.map((role) => (
            <div key={role} className="flex items-center gap-3 p-3 rounded-lg border">
              <Shield className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{role.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">
                  {role === 'CBS_ADMIN'
                    ? 'Full system administration'
                    : role === 'CBS_OFFICER'
                    ? 'Banking operations access'
                    : role === 'CBS_VIEWER'
                    ? 'Read-only access'
                    : role === 'TELLER'
                    ? 'Point-of-sale operations'
                    : role === 'LOAN_OFFICER'
                    ? 'Lending module access'
                    : role === 'TREASURY'
                    ? 'Treasury & investments'
                    : role === 'RISK_OFFICER'
                    ? 'Risk management'
                    : role === 'COMPLIANCE'
                    ? 'Compliance operations'
                    : role === 'AUDITOR'
                    ? 'Audit trail access'
                    : 'Custom role'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Security Tab ---------------------------------------------------------------

function SecurityTab() {
  const { user, tokenExpiresAt, refreshToken, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleChangePassword = () => {
    // Redirect to Keycloak account page - password section
    window.open(`${KEYCLOAK_ACCOUNT_URL}/#/security/signingin`, '_blank');
  };

  const handleManageMfa = () => {
    // Redirect to Keycloak account page - MFA section
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
      // Error handled by auth store
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
      {/* Session info */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Current Session</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Session Status</p>
            <StatusBadge status="ACTIVE" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Token Expires In</p>
            <p className="text-sm font-mono tabular-nums mt-0.5">
              {expiresMinutes}m {expiresSeconds.toString().padStart(2, '0')}s
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Authentication</p>
            <p className="text-sm mt-0.5">Keycloak OIDC + PKCE</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleRefreshSession}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh Session
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Password management */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-2">Password</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Password management is handled by your identity provider (Keycloak). You will be redirected to the account management page.
        </p>
        <button
          onClick={handleChangePassword}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Key className="w-3.5 h-3.5" /> Change Password
          <ExternalLink className="w-3 h-3 ml-1" />
        </button>
      </div>

      {/* MFA */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-2">Multi-Factor Authentication</h3>
        <p className="text-xs text-muted-foreground mb-4">
          MFA enrollment and management is handled by Keycloak. Configure TOTP, SMS, or hardware tokens via your identity provider account.
        </p>
        <button
          onClick={handleManageMfa}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted"
        >
          <Shield className="w-3.5 h-3.5" /> Manage MFA
          <ExternalLink className="w-3 h-3 ml-1" />
        </button>
      </div>

      {/* Device sessions */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-2">Device Activity</h3>
        <p className="text-xs text-muted-foreground mb-4">
          View and manage your active sessions across all devices via Keycloak account management.
        </p>
        <button
          onClick={handleManageSessions}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted"
        >
          <Monitor className="w-3.5 h-3.5" /> View Device Activity
          <ExternalLink className="w-3 h-3 ml-1" />
        </button>
      </div>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function UserProfilePage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'security' ? 'security' : 'profile';

  if (!user) return null;

  return (
    <>
      <PageHeader
        title="My Profile"
        subtitle="View your account details, manage security settings, and monitor session activity"
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
