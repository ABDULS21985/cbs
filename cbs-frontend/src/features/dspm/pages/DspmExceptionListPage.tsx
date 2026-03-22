import { useState, useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatCard, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldAlert, Clock, CheckCircle, XCircle, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types/auth';
import {
  useDspmExceptions,
  useCreateDspmException,
  useApproveDspmException,
  useRejectDspmException,
} from '../hooks/useDspm';
import type { DspmException } from '../types/dspm';

/**
 * Resolve the best display name for the currently authenticated user.
 *
 * Priority chain covers all realistic auth modes:
 *   1. displayName  — explicitly set display name (some SSO providers)
 *   2. fullName     — populated by form-based auth and most OIDC providers (name claim)
 *   3. preferred_username — OIDC preferred_username claim (Keycloak, Auth0, etc.)
 *   4. username     — internal username field
 *   5. email prefix — e.g. "john.smith" from "john.smith@bank.com"
 *   6. id           — user ID as last-resort identifier
 *   7. 'unknown'    — hard fallback so we never write an empty string to the DB
 */
function resolveApproverName(user: User | null): string {
  if (!user) return 'unknown';
  const candidates = [
    user.displayName,
    user.fullName,
    user.preferred_username,
    user.username,
    user.email ? user.email.split('@')[0] : '',
    String(user.id),
  ];
  for (const c of candidates) {
    const trimmed = c?.trim();
    if (trimmed) return trimmed;
  }
  return 'unknown';
}

const STATUS_FILTERS = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] as const;

const SORT_OPTIONS = [
  { label: 'Created Date (newest)', value: 'createdAt', order: 'desc' },
  { label: 'Status', value: 'status', order: 'asc' },
  { label: 'Exception Type', value: 'exceptionType', order: 'asc' },
  { label: 'Expires At', value: 'expiresAt', order: 'asc' },
] as const;

// FALSE_POSITIVE is the database/entity default and must be included
const EXCEPTION_TYPES = [
  'FALSE_POSITIVE',
  'TEMPORARY_WAIVER',
  'RISK_ACCEPTANCE',
  'COMPLIANCE_OVERRIDE',
  'MIGRATION_EXEMPTION',
  'TESTING_EXEMPTION',
] as const;

export function DspmExceptionListPage() {
  useEffect(() => { document.title = 'Exceptions | DSPM | CBS'; }, []);

  const [showNewException, setShowNewException] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortIdx, setSortIdx] = useState(0);

  const currentSort = SORT_OPTIONS[sortIdx];

  const queryParams = useMemo(() => ({
    size: 500, // fetch enough records for accurate stats
    status: statusFilter === 'All' ? undefined : statusFilter,
    sortBy: currentSort.value,
    order: currentSort.order,
  }), [statusFilter, currentSort]);

  const { data: exceptions = [], isLoading } = useDspmExceptions(queryParams);
  const createMutation = useCreateDspmException();
  const approveMutation = useApproveDspmException();
  const rejectMutation = useRejectDspmException();

  const stats = useMemo(() => {
    const total = exceptions.length;
    const pending = exceptions.filter((e) => e.status === 'PENDING').length;
    const approved = exceptions.filter((e) => e.status === 'APPROVED').length;
    const rejected = exceptions.filter((e) => e.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [exceptions]);

  const handleApprove = (exceptionCode: string) => {
    const approverName = resolveApproverName(useAuthStore.getState().user);
    approveMutation.mutate(
      { code: exceptionCode, approvedBy: approverName },
      {
        onSuccess: () => toast.success('Exception approved'),
        onError: () => toast.error('Failed to approve exception'),
      },
    );
  };

  const handleReject = (exceptionCode: string) => {
    rejectMutation.mutate(exceptionCode, {
      onSuccess: () => toast.success('Exception rejected'),
      onError: () => toast.error('Failed to reject exception'),
    });
  };

  const columns: ColumnDef<DspmException, unknown>[] = [
    {
      accessorKey: 'exceptionCode',
      header: 'Exception Code',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.exceptionCode}</span>,
    },
    {
      accessorKey: 'exceptionType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-xs">{row.original.exceptionType?.replace(/_/g, ' ') ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => (
        <span className="text-sm max-w-[200px] truncate block" title={row.original.reason}>
          {row.original.reason || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'policyId',
      header: 'Policy ID',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.policyId}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'approvedBy',
      header: 'Approved By',
      cell: ({ row }) => row.original.approvedBy || '—',
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expires At',
      cell: ({ row }) => row.original.expiresAt ? formatDate(row.original.expiresAt) : '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.status !== 'PENDING') return null;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleApprove(row.original.exceptionCode); }}
              disabled={approveMutation.isPending}
              className="text-green-600 hover:text-green-700 h-7 text-xs"
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleReject(row.original.exceptionCode); }}
              disabled={rejectMutation.isPending}
              className="text-red-600 hover:text-red-700 h-7 text-xs"
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const handleCreate = (data: Partial<DspmException>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Exception created');
        setShowNewException(false);
      },
      onError: () => toast.error('Failed to create exception'),
    });
  };

  return (
    <>
      <PageHeader
        title="Exceptions"
        subtitle="Manage policy exceptions and risk waivers"
        icon={ShieldAlert}
        actions={
          <Button onClick={() => setShowNewException(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Exception
          </Button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} format="number" icon={ShieldAlert} loading={isLoading} />
          <StatCard label="Pending" value={stats.pending} format="number" icon={Clock} iconBg="bg-amber-50 dark:bg-amber-900/20" iconColor="text-amber-600" loading={isLoading} />
          <StatCard label="Approved" value={stats.approved} format="number" icon={CheckCircle} iconBg="bg-green-50 dark:bg-green-900/20" iconColor="text-green-600" loading={isLoading} />
          <StatCard label="Rejected" value={stats.rejected} format="number" icon={XCircle} iconBg="bg-red-50 dark:bg-red-900/20" iconColor="text-red-600" loading={isLoading} />
        </div>

        {/* Status filter + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                  statusFilter === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {s === 'All' ? 'All' : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Sort by</Label>
            <select
              value={sortIdx}
              onChange={(e) => setSortIdx(Number(e.target.value))}
              className="px-3 py-1.5 border rounded-md text-sm bg-background"
            >
              {SORT_OPTIONS.map((opt, idx) => (
                <option key={idx} value={idx}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={exceptions}
          isLoading={isLoading}
          enableGlobalFilter
          searchPlaceholder="Search exceptions..."
          emptyMessage="No exceptions found."
        />
      </div>

      {showNewException && (
        <NewExceptionDialog
          open
          onClose={() => setShowNewException(false)}
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
        />
      )}
    </>
  );
}

function NewExceptionDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<DspmException>) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    exceptionType: 'FALSE_POSITIVE',
    policyId: '',
    sourceId: '',
    reason: '',
    expiresAt: '',
    riskAccepted: false,
  });

  const set = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    if (!form.policyId) {
      toast.error('Policy ID is required');
      return;
    }
    // Backend expects Instant (ISO-8601 with timezone), not a bare date string
    const expiresAtInstant = form.expiresAt ? `${form.expiresAt}T00:00:00Z` : undefined;
    onSubmit({
      exceptionType: form.exceptionType,
      policyId: Number(form.policyId),
      sourceId: form.sourceId ? Number(form.sourceId) : undefined,
      reason: form.reason,
      expiresAt: expiresAtInstant,
      riskAccepted: form.riskAccepted,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Exception</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Exception Type *</Label>
            <select
              value={form.exceptionType}
              onChange={(e) => set('exceptionType', e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
            >
              {EXCEPTION_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Policy ID *</Label>
              <Input
                type="number"
                value={form.policyId}
                onChange={(e) => set('policyId', e.target.value)}
                placeholder="e.g. 1"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Source ID</Label>
              <Input
                type="number"
                value={form.sourceId}
                onChange={(e) => set('sourceId', e.target.value)}
                placeholder="Optional"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Reason *</Label>
            <textarea
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background resize-none"
              placeholder="Explain why this exception is needed..."
            />
          </div>

          <div>
            <Label>Expires At</Label>
            <Input
              type="date"
              value={form.expiresAt}
              onChange={(e) => set('expiresAt', e.target.value)}
              className="mt-1"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.riskAccepted}
              onChange={(e) => set('riskAccepted', e.target.checked)}
              className="rounded border-gray-300"
            />
            Risk accepted by business owner
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !form.policyId || !form.reason}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Create Exception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
