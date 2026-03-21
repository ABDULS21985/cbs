import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, DataTable, ConfirmDialog } from '@/components/shared';
import { Loader2, AlertCircle, CheckCircle, DollarSign, Shield, Clock, Users } from 'lucide-react';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { escrowApi } from '../../api/escrowApi';
import type { EscrowMandate, EscrowRelease } from '../../types/escrow';

// ─── Release Request Form ────────────────────────────────────────────────────

interface ReleaseFormProps {
  mandate: EscrowMandate;
  onClose: () => void;
}

function ReleaseRequestForm({ mandate, onClose }: ReleaseFormProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [accountId, setAccountId] = useState('');

  const mutation = useMutation({
    mutationFn: () => escrowApi.requestRelease(
      mandate.id,
      Number(amount),
      reason,
      accountId ? Number(accountId) : undefined,
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow', 'mandate', mandate.id] });
      toast.success('Release request submitted');
      onClose();
    },
    onError: () => toast.error('Failed to submit release request'),
  });

  const inputCls = 'w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-md mx-4">
        <div className="p-5 border-b">
          <h2 className="text-base font-semibold">Request Escrow Release</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Available: {formatMoney(mandate.remainingAmount, mandate.currencyCode)}
          </p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Release Amount</label>
            <input type="number" min={0.01} max={mandate.remainingAmount} step={0.01} required
              value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reason</label>
            <input required value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}
              placeholder="e.g. Milestone payment completed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Release To Account ID (optional)</label>
            <input type="number" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}
              placeholder="Leave blank for source account" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Release Columns ─────────────────────────────────────────────────────────

const releaseCols: ColumnDef<EscrowRelease, unknown>[] = [
  { accessorKey: 'id', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id}</span> },
  { accessorKey: 'releaseAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm font-semibold">{formatMoney(row.original.releaseAmount)}</span> },
  { accessorKey: 'releaseReason', header: 'Reason' },
  { accessorKey: 'releaseToAccountNumber', header: 'To Account', cell: ({ row }) => <span className="font-mono text-xs">{row.original.releaseToAccountNumber || '—'}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  { accessorKey: 'approvedBy', header: 'Approved By', cell: ({ row }) => <span className="text-xs">{row.original.approvedBy || '—'}</span> },
  { accessorKey: 'transactionRef', header: 'Txn Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.transactionRef || '—'}</span> },
  { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.createdAt)}</span> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function EscrowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showReleaseForm, setShowReleaseForm] = useState(false);

  const { data: mandate, isLoading, isError } = useQuery({
    queryKey: ['escrow', 'mandate', Number(id)],
    queryFn: () => escrowApi.getById(Number(id)),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: (releaseId: number) => escrowApi.approveRelease(releaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow', 'mandate', Number(id)] });
      toast.success('Release approved and executed');
    },
    onError: () => toast.error('Failed to approve release'),
  });

  useEffect(() => {
    if (mandate) document.title = `${mandate.mandateNumber} | Escrow | CBS`;
  }, [mandate]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (isError || !mandate) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <AlertCircle className="w-10 h-10" />
      <p className="text-sm">Escrow mandate not found</p>
    </div>
  );

  const pct = mandate.mandatedAmount > 0 ? (mandate.releasedAmount / mandate.mandatedAmount) * 100 : 0;
  const pendingReleases = mandate.releases?.filter((r) => r.status === 'PENDING') || [];
  const canRelease = mandate.status === 'ACTIVE' || mandate.status === 'PARTIALLY_RELEASED';

  return (
    <>
      <PageHeader
        title={mandate.mandateNumber}
        subtitle="Escrow Mandate"
        backTo="/accounts/escrow"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={mandate.status} size="md" dot />
            {canRelease && (
              <button onClick={() => setShowReleaseForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <DollarSign className="w-3.5 h-3.5" /> Request Release
              </button>
            )}
          </div>
        }
      />

      <div className="px-6 pb-8 space-y-6">
        {/* Release Progress */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Release Progress</span>
            <span className="text-xs font-mono">{pct.toFixed(1)}% released</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Released: {formatMoney(mandate.releasedAmount, mandate.currencyCode)}</span>
            <span>Remaining: {formatMoney(mandate.remainingAmount, mandate.currencyCode)}</span>
            <span>Total: {formatMoney(mandate.mandatedAmount, mandate.currencyCode)}</span>
          </div>
        </div>

        {/* Mandate Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> Mandate Details</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted-foreground">Mandate #</p><p className="font-mono font-medium">{mandate.mandateNumber}</p></div>
              <div><p className="text-muted-foreground">Type</p><StatusBadge status={mandate.escrowType} /></div>
              <div><p className="text-muted-foreground">Customer</p><p className="font-medium">{mandate.customerDisplayName}</p></div>
              <div><p className="text-muted-foreground">Account</p><p className="font-mono">{mandate.accountNumber}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground">Purpose</p><p className="font-medium">{mandate.purpose}</p></div>
              <div><p className="text-muted-foreground">Currency</p><p>{mandate.currencyCode}</p></div>
              <div><p className="text-muted-foreground">Effective</p><p>{formatDate(mandate.effectiveDate)}</p></div>
              {mandate.expiryDate && <div><p className="text-muted-foreground">Expiry</p><p>{formatDate(mandate.expiryDate)}</p></div>}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Parties & Conditions</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {mandate.depositorName && <div><p className="text-muted-foreground">Depositor</p><p className="font-medium">{mandate.depositorName}</p></div>}
              {mandate.beneficiaryName && <div><p className="text-muted-foreground">Beneficiary</p><p className="font-medium">{mandate.beneficiaryName}</p></div>}
              <div><p className="text-muted-foreground">Multi-Sign</p><p>{mandate.requiresMultiSign ? `Yes (${mandate.requiredSignatories} required)` : 'No'}</p></div>
            </div>
            {mandate.releaseConditions && mandate.releaseConditions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Release Conditions</p>
                <ul className="space-y-1">
                  {mandate.releaseConditions.map((cond, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      {cond}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Pending Releases Alert */}
        {pendingReleases.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
              {pendingReleases.length} Pending Release{pendingReleases.length !== 1 ? 's' : ''} Awaiting Approval
            </p>
            <div className="space-y-2">
              {pendingReleases.map((rel) => (
                <div key={rel.id} className="flex items-center justify-between p-2 rounded-lg bg-card border">
                  <div className="text-xs">
                    <span className="font-mono font-semibold">{formatMoney(rel.releaseAmount)}</span>
                    <span className="text-muted-foreground ml-2">— {rel.releaseReason}</span>
                  </div>
                  <button
                    onClick={() => approveMutation.mutate(rel.id)}
                    disabled={approveMutation.isPending}
                    className="px-3 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Approve & Execute
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Release History */}
        <div className="rounded-xl border bg-card">
          <div className="px-5 py-4 border-b">
            <h3 className="text-sm font-semibold">Release History</h3>
          </div>
          <div className="p-4">
            <DataTable
              columns={releaseCols}
              data={mandate.releases || []}
              enableGlobalFilter
              emptyMessage="No releases recorded"
            />
          </div>
        </div>
      </div>

      {showReleaseForm && (
        <ReleaseRequestForm mandate={mandate} onClose={() => setShowReleaseForm(false)} />
      )}
    </>
  );
}
