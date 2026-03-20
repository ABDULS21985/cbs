import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { TabsPage } from '@/components/shared/TabsPage';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import {
  User, Shield, Settings, Activity, FileText,
  Camera, Edit2, Lock, Eye, EyeOff, Smartphone,
  Monitor, Globe, MapPin, Clock, Trash2, Download,
  Upload, AlertTriangle, CheckCircle2, XCircle, Filter,
} from 'lucide-react';
import {
  usePortalProfile,
  useProfileUpdates,
  useSubmitProfileUpdate,
  useChangePassword,
  useToggle2fa,
  useLoginHistory,
  useActiveSessions,
  useTerminateSession,
  useActivityLog,
  usePortalPreferences,
  useUpdatePreferences,
  useUploadDocument,
} from '../hooks/usePortalProfile';
import {
  portalApi,
  type ProfileUpdateRequest,
  type CustomerProfile,
  type LoginHistoryEntry,
  type ActiveSession,
  type ActivityLogEntry,
  type PortalPreferences,
} from '../api/portalApi';
import { formatDateTime, formatRelative } from '@/lib/formatters';

// ─── Personal Info Tab ──────────────────────────────────────────────────────

const PROFILE_FIELDS: Array<{ key: keyof CustomerProfile; label: string; requestType: string; editable: boolean }> = [
  { key: 'email', label: 'Email Address', requestType: 'EMAIL_CHANGE', editable: true },
  { key: 'phonePrimary', label: 'Phone Number', requestType: 'PHONE_CHANGE', editable: true },
  { key: 'phoneSecondary', label: 'Secondary Phone', requestType: 'PHONE_SECONDARY_CHANGE', editable: true },
  { key: 'firstName', label: 'First Name', requestType: 'NAME_CHANGE', editable: false },
  { key: 'middleName', label: 'Middle Name', requestType: 'NAME_CHANGE', editable: false },
  { key: 'lastName', label: 'Last Name', requestType: 'NAME_CHANGE', editable: false },
  { key: 'dateOfBirth', label: 'Date of Birth', requestType: 'DOB_CHANGE', editable: false },
  { key: 'gender', label: 'Gender', requestType: 'GENDER_CHANGE', editable: false },
  { key: 'nationality', label: 'Nationality', requestType: 'NATIONALITY_CHANGE', editable: false },
  { key: 'maritalStatus', label: 'Marital Status', requestType: 'MARITAL_STATUS_CHANGE', editable: false },
];

function PersonalInfoTab({ customerId }: { customerId: number }) {
  const { data: profile, isLoading } = usePortalProfile(customerId);
  const { data: pendingUpdates = [] } = useProfileUpdates(customerId);
  const submitMutation = useSubmitProfileUpdate(customerId);
  const [editField, setEditField] = useState<{ key: string; label: string; requestType: string; currentValue: string } | null>(null);
  const [newValue, setNewValue] = useState('');

  const handleSubmitUpdate = () => {
    if (!editField || !newValue.trim()) return;
    submitMutation.mutate(
      { requestType: editField.requestType, oldValue: editField.currentValue, newValue: newValue.trim() },
      {
        onSuccess: () => {
          toast.success('Update request submitted for bank approval');
          setEditField(null);
          setNewValue('');
        },
        onError: () => toast.error('Failed to submit update request'),
      },
    );
  };

  const getPendingForField = (requestType: string) =>
    pendingUpdates.filter((u) => u.requestType === requestType && u.status === 'PENDING');

  if (isLoading) {
    return <div className="p-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-muted/30 animate-pulse rounded-lg" />)}</div>;
  }

  if (!profile) return <div className="p-6 text-muted-foreground">Profile data unavailable.</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {profile.displayName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
        <div>
          <h2 className="font-semibold text-lg">{profile.displayName}</h2>
          <p className="text-sm text-muted-foreground">CIF: {profile.cifNumber}</p>
          <StatusBadge status={profile.status} dot />
        </div>
      </div>

      {/* Profile Fields */}
      <div className="rounded-lg border bg-card divide-y">
        {PROFILE_FIELDS.map(({ key, label, requestType, editable }) => {
          const value = String(profile[key] ?? '');
          const pending = getPendingForField(requestType);
          return (
            <div key={key} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                <p className="text-sm mt-0.5 truncate">{value || '—'}</p>
                {pending.length > 0 && (
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status="PENDING" dot />
                    <span className="text-xs text-muted-foreground">
                      Requested: {pending[0].newValue}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => { setEditField({ key, label, requestType, currentValue: value }); setNewValue(''); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-md hover:bg-muted transition-colors shrink-0"
              >
                {editable ? <><Edit2 className="w-3 h-3" /> Request Update</> : <><Lock className="w-3 h-3" /> Request Change</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Addresses */}
      {profile.addresses && profile.addresses.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="px-5 py-3 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Addresses</h3>
          </div>
          <div className="divide-y">
            {profile.addresses.map((addr, i) => (
              <div key={i} className="px-5 py-3">
                <p className="text-xs text-muted-foreground font-medium uppercase">{addr.type}</p>
                <p className="text-sm mt-0.5">{[addr.line1, addr.line2, addr.city, addr.state, addr.country].filter(Boolean).join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Update Requests History */}
      {pendingUpdates.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="px-5 py-3 border-b">
            <h3 className="text-sm font-semibold">Update Requests</h3>
          </div>
          <div className="divide-y">
            {pendingUpdates.map((req) => (
              <div key={req.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{req.requestType?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {req.oldValue} &rarr; {req.newValue}
                  </p>
                  {req.submittedAt && (
                    <p className="text-xs text-muted-foreground">{formatRelative(req.submittedAt)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={req.status ?? 'PENDING'} dot />
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <span className="text-xs text-red-500" title={req.rejectionReason}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editField && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-lg">Request Update: {editField.label}</h3>
            <div>
              <label className="text-sm text-muted-foreground">Current Value</label>
              <p className="text-sm font-medium mt-0.5">{editField.currentValue || '—'}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">New Value</label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={`Enter new ${editField.label.toLowerCase()}`}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This change requires bank officer approval and may take 1–2 business days.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditField(null)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitUpdate}
                disabled={!newValue.trim() || submitMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Security Tab ───────────────────────────────────────────────────────────

function SecurityTab({ customerId }: { customerId: number }) {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const changePasswordMutation = useChangePassword(customerId);
  const toggle2faMutation = useToggle2fa(customerId);
  const { data: loginHistory = [], isLoading: historyLoading } = useLoginHistory(customerId);
  const { data: sessions = [], isLoading: sessionsLoading } = useActiveSessions(customerId);
  const terminateSessionMutation = useTerminateSession(customerId);
  const { data: profile } = usePortalProfile(customerId);
  const [qrData, setQrData] = useState<{ qrCodeUrl?: string; secret?: string } | null>(null);

  const is2faEnabled = profile?.preferredChannel === '2FA_ENABLED' ||
    (profile as any)?.metadata?.twoFactorEnabled === true;

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate(passwordForm, {
      onSuccess: () => {
        toast.success('Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      onError: () => toast.error('Failed to change password'),
    });
  };

  const handleToggle2fa = (enable: boolean) => {
    toggle2faMutation.mutate(enable, {
      onSuccess: (data) => {
        if (enable && data.qrCodeUrl) {
          setQrData({ qrCodeUrl: data.qrCodeUrl, secret: data.secret });
        } else {
          setQrData(null);
        }
        toast.success(data.message);
      },
      onError: () => toast.error('Failed to update 2FA settings'),
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Change Password */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h3>
        </div>
        <div className="p-5 space-y-4 max-w-md">
          <div>
            <label className="text-xs text-muted-foreground font-medium">Current Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || changePasswordMutation.isPending}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {changePasswordMutation.isPending ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Smartphone className="w-4 h-4" /> Two-Factor Authentication</h3>
          <button
            onClick={() => handleToggle2fa(!is2faEnabled)}
            disabled={toggle2faMutation.isPending}
            className={cn(
              'w-11 h-6 rounded-full transition-all relative inline-flex items-center',
              is2faEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
            )}
          >
            <span className={cn(
              'absolute w-5 h-5 rounded-full bg-white shadow transition-transform',
              is2faEnabled ? 'translate-x-5' : 'translate-x-0.5',
            )} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground">
            {is2faEnabled
              ? 'Two-factor authentication is enabled. Your account is protected with an additional security layer.'
              : 'Enable two-factor authentication to add an extra layer of security to your account.'}
          </p>
          {qrData?.qrCodeUrl && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2">
              <p className="text-sm font-medium">Scan this QR code with your authenticator app:</p>
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center border">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData.qrCodeUrl)}`} alt="2FA QR Code" className="w-44 h-44" />
              </div>
              {qrData.secret && (
                <p className="text-xs text-muted-foreground">Manual entry key: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{qrData.secret}</code></p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Login History */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Login History</h3>
        </div>
        {historyLoading ? (
          <div className="p-5"><div className="h-32 bg-muted/30 animate-pulse rounded-lg" /></div>
        ) : loginHistory.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No login history available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">IP Address</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Device</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((entry: LoginHistoryEntry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-2.5 text-sm">{formatDateTime(entry.timestamp)}</td>
                    <td className="px-4 py-2.5 text-sm font-mono text-xs">{entry.ipAddress}</td>
                    <td className="px-4 py-2.5 text-sm">{entry.device}</td>
                    <td className="px-4 py-2.5 text-sm">{entry.location}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={entry.status} dot />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Monitor className="w-4 h-4" /> Active Sessions</h3>
        </div>
        {sessionsLoading ? (
          <div className="p-5"><div className="h-24 bg-muted/30 animate-pulse rounded-lg" /></div>
        ) : sessions.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No active sessions.</div>
        ) : (
          <div className="divide-y">
            {sessions.map((session: ActiveSession) => (
              <div key={session.sessionId} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {session.device}
                      {session.current && <span className="text-xs text-green-600 font-normal">(This device)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.ipAddress} &middot; {session.location} &middot; Last active: {formatRelative(session.lastActive)}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <button
                    onClick={() => {
                      terminateSessionMutation.mutate(session.sessionId, {
                        onSuccess: () => toast.success('Session terminated'),
                        onError: () => toast.error('Failed to terminate session'),
                      });
                    }}
                    disabled={terminateSessionMutation.isPending}
                    className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" />
                    Terminate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Preferences Tab ────────────────────────────────────────────────────────

const COMM_CATEGORIES = [
  { key: 'TRANSACTIONS', label: 'Transaction Alerts' },
  { key: 'MARKETING', label: 'Marketing' },
  { key: 'SECURITY', label: 'Security Alerts', mandatory: true },
];
const COMM_CHANNELS = ['EMAIL', 'SMS', 'PUSH'] as const;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ha', label: 'Hausa' },
  { code: 'ig', label: 'Igbo' },
];

const STATEMENT_DELIVERY_OPTIONS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'DOWNLOAD', label: 'Download Only' },
  { value: 'BOTH', label: 'Both' },
];

function PreferencesTab({ customerId }: { customerId: number }) {
  const { data: preferences, isLoading } = usePortalPreferences(customerId);
  const updateMutation = useUpdatePreferences(customerId);
  const { data: accounts = [] } = usePortalAccounts();
  const [commPrefs, setCommPrefs] = useState<Record<string, boolean>>({});

  const handleSave = (field: string, value: string | number) => {
    if (!preferences) return;
    const updated = { ...preferences, [field]: value };
    updateMutation.mutate(updated, {
      onSuccess: () => toast.success('Preference updated'),
      onError: () => toast.error('Failed to update preference'),
    });
  };

  const toggleComm = useCallback((category: string, channel: string) => {
    const key = `${category}-${channel}`;
    setCommPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success('Communication preference updated');
  }, []);

  if (isLoading) {
    return <div className="p-6"><div className="h-48 bg-muted/30 animate-pulse rounded-lg" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Communication Preferences Matrix */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h3 className="text-sm font-semibold">Communication Preferences</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage notifications per category and channel</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-48">Category</th>
                {COMM_CHANNELS.map((ch) => (
                  <th key={ch} className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">{ch}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMM_CATEGORIES.map((cat) => (
                <tr key={cat.key} className="border-b last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                    {cat.label}
                    {cat.mandatory && <Lock className="w-3 h-3 text-muted-foreground" title="Cannot disable — mandatory" />}
                  </td>
                  {COMM_CHANNELS.map((ch) => {
                    const key = `${cat.key}-${ch}`;
                    const enabled = cat.mandatory ? true : (commPrefs[key] !== false);
                    return (
                      <td key={ch} className="px-4 py-3 text-center">
                        <button
                          onClick={() => !cat.mandatory && toggleComm(cat.key, ch)}
                          disabled={cat.mandatory}
                          className={cn(
                            'w-11 h-6 rounded-full transition-all relative inline-flex items-center',
                            enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
                            cat.mandatory && 'opacity-60 cursor-not-allowed',
                          )}
                        >
                          <span className={cn(
                            'absolute w-5 h-5 rounded-full bg-white shadow transition-transform',
                            enabled ? 'translate-x-5' : 'translate-x-0.5',
                          )} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Language Preference */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4" /> Language</h3>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSave('language', lang.code)}
              className={cn(
                'px-4 py-2 text-sm rounded-md border transition-colors',
                preferences?.language === lang.code
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted',
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Default Transfer Account */}
      {accounts.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Default Transfer Account</h3>
          <select
            value={preferences?.defaultTransferAccountId ?? ''}
            onChange={(e) => handleSave('defaultTransferAccountId', Number(e.target.value))}
            className="w-full max-w-md px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select default account</option>
            {accounts.map((acc: any) => (
              <option key={acc.id} value={acc.id}>{acc.accountName} — {acc.accountNumber}</option>
            ))}
          </select>
        </div>
      )}

      {/* Statement Delivery */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Statement Delivery</h3>
        <div className="flex flex-wrap gap-2">
          {STATEMENT_DELIVERY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSave('statementDelivery', opt.value)}
              className={cn(
                'px-4 py-2 text-sm rounded-md border transition-colors',
                preferences?.statementDelivery === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function usePortalAccounts() {
  return useQuery({
    queryKey: ['portal', 'accounts'],
    queryFn: () => portalApi.getAccounts(),
    staleTime: 60_000,
  });
}

// ─── Activity Log Tab ───────────────────────────────────────────────────────

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All Activities' },
  { value: 'LOGIN', label: 'Logins' },
  { value: 'TRANSFER', label: 'Transfers' },
  { value: 'CARD', label: 'Card Changes' },
  { value: 'PROFILE', label: 'Profile Updates' },
  { value: 'SERVICE_REQUEST', label: 'Service Requests' },
];

function ActivityLogTab({ customerId }: { customerId: number }) {
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params: Record<string, unknown> = {};
  if (eventTypeFilter) params.eventType = eventTypeFilter;
  if (dateFrom) params.from = dateFrom;
  if (dateTo) params.to = dateTo;

  const { data: activities = [], isLoading } = useActivityLog(customerId, params);

  const handleExport = () => {
    const csv = [
      ['Date', 'Event', 'Action', 'Description', 'IP Address', 'Channel'].join(','),
      ...activities.map((a: ActivityLogEntry) =>
        [a.performedAt, a.eventType, a.action, `"${a.description ?? ''}"`, a.ipAddress ?? '', a.channel ?? ''].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="To"
        />
        <button
          onClick={handleExport}
          disabled={activities.length === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted/30 animate-pulse rounded-lg" />)}</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No activities found.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {activities.map((activity: ActivityLogEntry) => (
            <div key={activity.id} className="px-5 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                {activity.action === 'CREATE' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {activity.action === 'UPDATE' && <Edit2 className="w-4 h-4 text-blue-500" />}
                {activity.action === 'DELETE' && <XCircle className="w-4 h-4 text-red-500" />}
                {!['CREATE', 'UPDATE', 'DELETE'].includes(activity.action) && <Activity className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{activity.eventType?.replace(/_/g, ' ')}</span>
                  {activity.channel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{activity.channel}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{activity.description || 'No description'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(activity.performedAt)}
                  {activity.ipAddress && <> &middot; {activity.ipAddress}</>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ──────────────────────────────────────────────────────────

function DocumentsTab({ customerId }: { customerId: number }) {
  const { data: profile } = usePortalProfile(customerId);
  const uploadMutation = useUploadDocument(customerId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const documents = profile?.identifications ?? [];

  const handleUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    uploadMutation.mutate(file, {
      onSuccess: () => toast.success('Document uploaded successfully'),
      onError: () => toast.error('Failed to upload document'),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
        )}
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drag & drop a document here</p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse (max 10MB)</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="mt-3 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {uploadMutation.isPending ? 'Uploading…' : 'Choose File'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </div>

      {/* Document List */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> KYC Documents</h3>
        </div>
        {documents.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No documents uploaded yet.</div>
        ) : (
          <div className="divide-y">
            {documents.map((doc, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.number}
                      {doc.issuingAuthority && <> &middot; {doc.issuingAuthority}</>}
                    </p>
                    {doc.expiryDate && (
                      <p className={cn('text-xs mt-0.5', isExpiringSoon(doc.expiryDate) ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                        {isExpiringSoon(doc.expiryDate) && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        Expires: {doc.expiryDate}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={new Date(doc.expiryDate ?? '2099-01-01') < new Date() ? 'EXPIRED' : 'ACTIVE'} dot />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function PortalProfilePage() {
  const { user } = useAuthStore();
  const customerId = Number(user?.id) || 0;
  const { data: pendingUpdates = [] } = useProfileUpdates(customerId);
  const pendingCount = pendingUpdates.filter((u) => u.status === 'PENDING').length;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold px-6 py-4">My Profile</h1>
      <TabsPage
        syncWithUrl
        tabs={[
          {
            id: 'personal',
            label: 'Personal Info',
            icon: User,
            badge: pendingCount,
            content: <PersonalInfoTab customerId={customerId} />,
          },
          {
            id: 'security',
            label: 'Security',
            icon: Shield,
            content: <SecurityTab customerId={customerId} />,
          },
          {
            id: 'preferences',
            label: 'Preferences',
            icon: Settings,
            content: <PreferencesTab customerId={customerId} />,
          },
          {
            id: 'activity',
            label: 'Activity Log',
            icon: Activity,
            content: <ActivityLogTab customerId={customerId} />,
          },
          {
            id: 'documents',
            label: 'Documents',
            icon: FileText,
            content: <DocumentsTab customerId={customerId} />,
          },
        ]}
      />
    </div>
  );
}
