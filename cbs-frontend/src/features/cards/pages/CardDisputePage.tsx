import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle2, Clock, Scale, Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import { cardsApi } from '../api/cardExtApi';
import type { CardDispute } from '../types/cardExt';

const STATUS_OPTIONS = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED', 'CLOSED'] as const;

// ─── File New Dispute Form ───────────────────────────────────────────────────

function FileDisputeForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    transactionRef: '',
    cardNumber: '',
    reasonCode: 'UNAUTHORIZED',
    amount: 0,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Use the dispute API - file dispute against a transaction
    cardsApi.dispute(0).then(() => {
      toast.success('Dispute filed successfully');
      qc.invalidateQueries({ queryKey: ['card-disputes'] });
      onClose();
    }).catch(() => {
      toast.error('Failed to file dispute');
    }).finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">File New Dispute</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Transaction Reference</label>
            <input className="w-full mt-1 input" placeholder="TXN-XXXXXX" value={form.transactionRef} onChange={(e) => setForm((f) => ({ ...f, transactionRef: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Card Number (masked)</label>
            <input className="w-full mt-1 input" placeholder="****-****-****-1234" value={form.cardNumber} onChange={(e) => setForm((f) => ({ ...f, cardNumber: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reason Code</label>
              <select value={form.reasonCode} onChange={(e) => setForm((f) => ({ ...f, reasonCode: e.target.value }))} className="w-full mt-1 input">
                <option value="UNAUTHORIZED">Unauthorized Transaction</option>
                <option value="FRAUD">Fraud</option>
                <option value="SERVICE_NOT_RENDERED">Service Not Rendered</option>
                <option value="DUPLICATE">Duplicate Charge</option>
                <option value="ATM_FAILED">ATM Failed Dispense</option>
                <option value="COUNTERFEIT">Counterfeit</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Disputed Amount</label>
              <input type="number" className="w-full mt-1 input" value={form.amount || ''} onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} required min={0} step="0.01" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea className="w-full mt-1 input h-20 resize-none" placeholder="Describe the dispute reason..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Filing...' : 'File Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CardDisputePage() {
  useEffect(() => { document.title = 'Disputes & Chargebacks | CBS'; }, []);

  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [showFileDispute, setShowFileDispute] = useState(false);

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['card-disputes', statusFilter],
    queryFn: () => cardsApi.getByStatus(statusFilter),
  });

  const openCount = disputes.filter((d) => d.status === 'OPEN' || d.status === 'INVESTIGATING').length;
  const totalAmount = disputes.reduce((sum, d) => sum + (d.disputeAmount ?? 0), 0);
  const breachedCount = disputes.filter((d) => d.isSlaBreached).length;
  const resolvedCount = disputes.filter((d) => d.status === 'RESOLVED' || d.status === 'CLOSED').length;

  const columns: ColumnDef<CardDispute, unknown>[] = [
    {
      accessorKey: 'disputeRef',
      header: 'Dispute Ref',
      cell: ({ row }) => (
        <button
          onClick={() => navigate(`/cards/disputes/${row.original.id}`)}
          className="font-mono text-xs font-medium text-primary hover:underline"
        >
          {row.original.disputeRef}
        </button>
      ),
    },
    {
      accessorKey: 'merchantName',
      header: 'Merchant',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.merchantName ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'disputeReason',
      header: 'Reason',
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[200px] block">{row.original.disputeReason ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'disputeAmount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm font-mono">
          {formatMoney(row.original.disputeAmount ?? 0, row.original.disputeCurrency ?? 'NGN')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Filed',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      accessorKey: 'isSlaBreached',
      header: 'SLA',
      cell: ({ row }) =>
        row.original.isSlaBreached ? (
          <span className="text-xs text-red-600 font-medium" aria-label="SLA breached">Breached</span>
        ) : (
          <span className="text-xs text-green-600" aria-label="SLA within limit">OK</span>
        ),
    },
  ];

  return (
    <>
      {showFileDispute && <FileDisputeForm onClose={() => setShowFileDispute(false)} />}

      <PageHeader
        title="Disputes & Chargebacks"
        subtitle="Manage card transaction disputes and chargeback lifecycle"
        actions={
          <button onClick={() => setShowFileDispute(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" /> File New Dispute
          </button>
        }
      />
      <div className="page-container space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Open Disputes" value={openCount} format="number" icon={AlertTriangle} loading={isLoading} />
          <StatCard label="Total Disputed" value={totalAmount} format="money" compact icon={Scale} loading={isLoading} />
          <StatCard label="SLA Breached" value={breachedCount} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="Resolved" value={resolvedCount} format="number" icon={CheckCircle2} loading={isLoading} />
        </div>

        {/* Status filter */}
        <div className="flex gap-2" role="group" aria-label="Filter disputes by status">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              aria-label={`Filter by ${s.replace(/_/g, ' ').toLowerCase()} disputes`}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted/40 border-border'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Data table */}
        <DataTable
          columns={columns}
          data={disputes}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="card-disputes"
          emptyMessage="No disputes found for this status"
          pageSize={15}
          onRowClick={(row) => navigate(`/cards/disputes/${row.id}`)}
        />
      </div>
    </>
  );
}
