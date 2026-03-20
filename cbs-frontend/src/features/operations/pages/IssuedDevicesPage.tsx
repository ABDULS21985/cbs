import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Plus, X, CreditCard, ShieldCheck, ShieldOff, RefreshCw,
  Smartphone, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import { formatDate, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';
import type { IssuedDevice } from '../types/issuedDevice';

// ─── Types ──────────────────────────────────────────────────────────────────────

type DeviceType = 'CARD' | 'TOKEN' | 'SECURITY_KEY' | 'OTP_DEVICE';
type DeviceStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'REPLACED';
type BlockReason = 'LOST' | 'STOLEN' | 'FRAUD' | 'CUSTOMER_REQUEST' | 'SECURITY';

interface RegisterDeviceRequest {
  deviceType: DeviceType;
  customerId: string;
  accountId: string;
  deviceIdentifier: string;
  expiryDate: string;
}

interface BlockDeviceRequest {
  reason: BlockReason;
  notes: string;
}

interface ReplaceDeviceRequest {
  reason: string;
  newDeviceIdentifier: string;
}

// ─── API ────────────────────────────────────────────────────────────────────────

const devicesPageApi = {
  getAll: () => apiGet<IssuedDevice[]>('/api/v1/issued-devices'),
  register: (data: RegisterDeviceRequest) =>
    apiPost<IssuedDevice>('/api/v1/issued-devices', data),
  activate: (code: string) =>
    apiPost<IssuedDevice>(`/api/v1/issued-devices/${code}/activate`),
  block: (code: string, data: BlockDeviceRequest) =>
    apiPost<IssuedDevice>(`/api/v1/issued-devices/${code}/block`, data),
  unblock: (code: string) =>
    apiPost<IssuedDevice>(`/api/v1/issued-devices/${code}/unblock`),
  replace: (code: string, data: ReplaceDeviceRequest) =>
    apiPost<IssuedDevice>(`/api/v1/issued-devices/${code}/replace`, data),
};

const KEYS = {
  all: ['issued-devices', 'all'] as const,
};

// ─── Type Badge ─────────────────────────────────────────────────────────────────

const DEVICE_TYPE_COLORS: Record<string, string> = {
  CARD: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TOKEN: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SECURITY_KEY: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  OTP_DEVICE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function DeviceTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', DEVICE_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600')}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function daysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function IssuedDevicesPage() {
  const qc = useQueryClient();

  // Dialogs
  const [showRegister, setShowRegister] = useState(false);
  const [blockDialog, setBlockDialog] = useState<{ code: string } | null>(null);
  const [replaceDialog, setReplaceDialog] = useState<{ code: string } | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCustomer, setFilterCustomer] = useState('');

  // Forms
  const [registerForm, setRegisterForm] = useState<RegisterDeviceRequest>({
    deviceType: 'CARD',
    customerId: '',
    accountId: '',
    deviceIdentifier: '',
    expiryDate: '',
  });

  const [blockForm, setBlockForm] = useState<BlockDeviceRequest>({
    reason: 'CUSTOMER_REQUEST',
    notes: '',
  });

  const [replaceForm, setReplaceForm] = useState<ReplaceDeviceRequest>({
    reason: '',
    newDeviceIdentifier: '',
  });

  // Data
  const { data: devices = [], isLoading } = useQuery({
    queryKey: KEYS.all,
    queryFn: devicesPageApi.getAll,
    staleTime: 15_000,
  });

  // Mutations
  const registerDevice = useMutation({
    mutationFn: devicesPageApi.register,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Device registered');
      setShowRegister(false);
      setRegisterForm({ deviceType: 'CARD', customerId: '', accountId: '', deviceIdentifier: '', expiryDate: '' });
    },
    onError: () => toast.error('Failed to register device'),
  });

  const activateDevice = useMutation({
    mutationFn: devicesPageApi.activate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Device activated');
    },
    onError: () => toast.error('Failed to activate device'),
  });

  const blockDevice = useMutation({
    mutationFn: ({ code, data }: { code: string; data: BlockDeviceRequest }) =>
      devicesPageApi.block(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Device blocked');
      setBlockDialog(null);
      setBlockForm({ reason: 'CUSTOMER_REQUEST', notes: '' });
    },
    onError: () => toast.error('Failed to block device'),
  });

  const unblockDevice = useMutation({
    mutationFn: devicesPageApi.unblock,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Device unblocked');
    },
    onError: () => toast.error('Failed to unblock device'),
  });

  const replaceDevice = useMutation({
    mutationFn: ({ code, data }: { code: string; data: ReplaceDeviceRequest }) =>
      devicesPageApi.replace(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Device replacement initiated');
      setReplaceDialog(null);
      setReplaceForm({ reason: '', newDeviceIdentifier: '' });
    },
    onError: () => toast.error('Failed to replace device'),
  });

  // Filter
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (filterType !== 'ALL' && d.deviceType !== filterType) return false;
      if (filterStatus !== 'ALL' && d.activationStatus !== filterStatus) return false;
      if (filterCustomer && !String(d.customerId).includes(filterCustomer)) return false;
      return true;
    });
  }, [devices, filterType, filterStatus, filterCustomer]);

  // Stats
  const totalDevices = devices.length;
  const activeDevices = devices.filter((d) => d.activationStatus === 'ACTIVE').length;
  const blockedDevices = devices.filter((d) => d.activationStatus === 'BLOCKED').length;
  const pendingDevices = devices.filter((d) => d.activationStatus === 'PENDING').length;
  const replacementPending = devices.filter((d) => d.activationStatus === 'REPLACED' || !!d.replacedByCode).length;

  // Columns
  const columns: ColumnDef<IssuedDevice, unknown>[] = useMemo(
    () => [
      { accessorKey: 'deviceCode', header: 'Device ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.deviceCode}</span> },
      { accessorKey: 'deviceType', header: 'Type', cell: ({ row }) => <DeviceTypeBadge type={row.original.deviceType} /> },
      { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="text-sm">{row.original.customerId}</span> },
      { accessorKey: 'linkedAccountId', header: 'Account', cell: ({ row }) => <span className="text-sm font-mono">{row.original.linkedAccountId}</span> },
      { accessorKey: 'activationStatus', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.activationStatus} /> },
      { accessorKey: 'issuedAt', header: 'Issued Date', cell: ({ row }) => <span className="text-sm">{row.original.issuedAt ? formatDate(row.original.issuedAt) : '-'}</span> },
      {
        accessorKey: 'expiryDate',
        header: 'Expiry Date',
        cell: ({ row }) => {
          const expiry = row.original.expiryDate;
          if (!expiry) return <span className="text-sm text-muted-foreground">-</span>;
          const days = daysUntilExpiry(expiry);
          return (
            <span className={cn('text-sm', days < 30 ? 'text-red-600 font-semibold' : days < 90 ? 'text-amber-600' : '')}>
              {formatDate(expiry)}
            </span>
          );
        },
      },
      {
        id: 'lastUsed',
        header: 'Last Used',
        cell: ({ row }) => {
          const activated = row.original.activatedAt;
          if (!activated) return <span className="text-sm text-muted-foreground">Never</span>;
          return <span className="text-sm">{formatRelative(activated)}</span>;
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const d = row.original;
          const status = d.activationStatus;
          return (
            <div className="flex items-center gap-1">
              {status === 'PENDING' && (
                <button
                  onClick={() => activateDevice.mutate(d.deviceCode)}
                  className="p-1.5 rounded-md hover:bg-muted text-green-600"
                  title="Activate"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {status === 'ACTIVE' && (
                <>
                  <button
                    onClick={() => setBlockDialog({ code: d.deviceCode })}
                    className="p-1.5 rounded-md hover:bg-muted text-red-600"
                    title="Block"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setReplaceDialog({ code: d.deviceCode })}
                    className="p-1.5 rounded-md hover:bg-muted text-amber-600"
                    title="Replace"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {status === 'BLOCKED' && (
                <>
                  <button
                    onClick={() => unblockDevice.mutate(d.deviceCode)}
                    className="p-1.5 rounded-md hover:bg-muted text-green-600"
                    title="Unblock"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setReplaceDialog({ code: d.deviceCode })}
                    className="p-1.5 rounded-md hover:bg-muted text-amber-600"
                    title="Replace"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [activateDevice, unblockDevice],
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Issued Devices"
        subtitle="Card and device lifecycle management"
        actions={
          <button
            onClick={() => setShowRegister(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Device
          </button>
        }
      />

      <div className="px-6 py-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Devices" value={totalDevices} format="number" icon={CreditCard} loading={isLoading} />
          <StatCard label="Active" value={activeDevices} format="number" icon={ShieldCheck} loading={isLoading} />
          <StatCard label="Blocked" value={blockedDevices} format="number" icon={Lock} loading={isLoading} />
          <StatCard label="Pending Activation" value={pendingDevices} format="number" icon={Smartphone} loading={isLoading} />
          <StatCard label="Replacements Pending" value={replacementPending} format="number" icon={RefreshCw} loading={isLoading} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <select className="ml-2 input text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="CARD">Card</option>
              <option value="TOKEN">Token</option>
              <option value="SECURITY_KEY">Security Key</option>
              <option value="OTP_DEVICE">OTP Device</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select className="ml-2 input text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="BLOCKED">Blocked</option>
              <option value="EXPIRED">Expired</option>
              <option value="REPLACED">Replaced</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Customer</label>
            <input
              className="ml-2 input text-sm w-40"
              placeholder="Search customer..."
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
            />
          </div>
        </div>

        {/* DataTable */}
        <DataTable columns={columns} data={filteredDevices} isLoading={isLoading} pageSize={15} emptyMessage="No issued devices found" />
      </div>

      {/* Register Device Dialog */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowRegister(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Register Device</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                registerDevice.mutate(registerForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground">Device Type</label>
                <select
                  className="w-full mt-1 input"
                  value={registerForm.deviceType}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, deviceType: e.target.value as DeviceType }))}
                >
                  <option value="CARD">Card</option>
                  <option value="TOKEN">Token</option>
                  <option value="SECURITY_KEY">Security Key</option>
                  <option value="OTP_DEVICE">OTP Device</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
                  <input
                    className="w-full mt-1 input"
                    placeholder="e.g., 1001"
                    value={registerForm.customerId}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, customerId: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                  <input
                    className="w-full mt-1 input"
                    placeholder="e.g., 5001"
                    value={registerForm.accountId}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, accountId: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Device Identifier</label>
                <input
                  className="w-full mt-1 input"
                  placeholder="e.g., card number or serial"
                  value={registerForm.deviceIdentifier}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, deviceIdentifier: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                <input
                  type="date"
                  className="w-full mt-1 input"
                  value={registerForm.expiryDate}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRegister(false)} className="px-3 py-2 text-sm rounded-lg border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerDevice.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {registerDevice.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Device Dialog */}
      {blockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => { setBlockDialog(null); setBlockForm({ reason: 'CUSTOMER_REQUEST', notes: '' }); }} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Block Device</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                blockDevice.mutate({ code: blockDialog.code, data: blockForm });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reason</label>
                <select
                  className="w-full mt-1 input"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value as BlockReason }))}
                >
                  <option value="LOST">Lost</option>
                  <option value="STOLEN">Stolen</option>
                  <option value="FRAUD">Fraud</option>
                  <option value="CUSTOMER_REQUEST">Customer Request</option>
                  <option value="SECURITY">Security</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <textarea
                  className="w-full mt-1 input min-h-[80px]"
                  placeholder="Additional notes..."
                  value={blockForm.notes}
                  onChange={(e) => setBlockForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setBlockDialog(null); setBlockForm({ reason: 'CUSTOMER_REQUEST', notes: '' }); }} className="px-3 py-2 text-sm rounded-lg border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={blockDevice.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {blockDevice.isPending ? 'Blocking...' : 'Block Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace Device Dialog */}
      {replaceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => { setReplaceDialog(null); setReplaceForm({ reason: '', newDeviceIdentifier: '' }); }} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Replace Device</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                replaceDevice.mutate({ code: replaceDialog.code, data: replaceForm });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reason</label>
                <input
                  className="w-full mt-1 input"
                  placeholder="Reason for replacement"
                  value={replaceForm.reason}
                  onChange={(e) => setReplaceForm((f) => ({ ...f, reason: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">New Device Identifier</label>
                <input
                  className="w-full mt-1 input"
                  placeholder="e.g., new card number or serial"
                  value={replaceForm.newDeviceIdentifier}
                  onChange={(e) => setReplaceForm((f) => ({ ...f, newDeviceIdentifier: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setReplaceDialog(null); setReplaceForm({ reason: '', newDeviceIdentifier: '' }); }} className="px-3 py-2 text-sm rounded-lg border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replaceDevice.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {replaceDevice.isPending ? 'Replacing...' : 'Replace Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
