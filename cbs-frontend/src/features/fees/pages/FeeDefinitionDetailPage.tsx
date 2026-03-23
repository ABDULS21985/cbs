import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Clock, Ban, Calculator, Loader2, CheckCircle2, XCircle, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import { FeeCalculationEditor } from '../components/FeeCalculationEditor';
import { FeeChargeHistoryTable } from '../components/FeeChargeHistoryTable';
import { FeePreviewCalculator } from '../components/FeePreviewCalculator';
import {
  getFeeById,
  getFeeChargesByCode,
  getPendingWaivers,
  updateFeeDefinition,
  approveWaiver,
  rejectWaiver,
  type FeeDefinition,
  type FeeWaiver,
} from '../api/feeApi';

// ─── Waivers Tab ──────────────────────────────────────────────────────────────

function WaiversTab({ feeCode }: { feeCode: string }) {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: waivers = [], isLoading } = useQuery({
    queryKey: ['pending-waivers', feeCode],
    queryFn: getPendingWaivers,
  });

  // feeId on the waiver object is the fee *code* (e.g. "MAINT-001"), not the numeric DB id
  const feeWaivers = waivers.filter((w) => w.feeId === feeCode || !feeCode);

  const approveMutation = useMutation({
    mutationFn: ({ id, by }: { id: string; by: string }) => approveWaiver(id, by),
    onSuccess: () => { toast.success('Waiver approved'); queryClient.invalidateQueries({ queryKey: ['pending-waivers'] }); },
    onError: () => toast.error('Failed to approve waiver'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectWaiver(id, reason),
    onSuccess: () => {
      toast.success('Waiver rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-waivers'] });
      setRejectId(null);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject waiver'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (feeWaivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Ban className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium">No pending waivers</p>
        <p className="text-xs text-muted-foreground mt-1">
          Waiver requests for this fee will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {feeWaivers.map((waiver: FeeWaiver) => (
          <div key={waiver.id} className="surface-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Waiver Request — {waiver.id}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Submitted {new Date(waiver.createdAt).toLocaleDateString('en-NG', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                PENDING
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Amount to Waive</p>
                <p className="font-semibold text-primary">
                  ₦{waiver.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Requested By</p>
                <p className="font-medium">{waiver.requestedBy}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account ID</p>
                <p className="font-mono text-xs">{waiver.accountId}</p>
              </div>
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="text-sm mt-0.5 text-foreground/80">{waiver.reason}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => approveMutation.mutate({ id: waiver.id, by: 'Current User' })}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Approve
              </button>
              <button
                onClick={() => { setRejectId(waiver.id); setRejectReason(''); }}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reject reason dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setRejectId(null)}
              className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"
            >
              <XCircle className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold mb-4">Reject Waiver</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Rejection Reason <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide reason for rejection..."
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRejectId(null)}
                  className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
                  disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FeeDefinitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: fee, isLoading, isError, error } = useQuery({
    queryKey: ['fee-definition', id],
    queryFn: () => getFeeById(id!),
    enabled: !!id,
  });

  // Use fee CODE (e.g. "MAINT-001") to fetch charge history, not the numeric definition ID.
  // The backend /history/fee/{feeCode} endpoint was added to support this lookup.
  const { data: chargeHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['fee-charge-history', fee?.code],
    queryFn: () => getFeeChargesByCode(fee!.code),
    enabled: !!fee?.code,
  });

  const { data: waivers = [] } = useQuery<FeeWaiver[]>({
    queryKey: ['pending-waivers'],
    queryFn: getPendingWaivers,
  });
  // waivers.feeId is the fee code string — compare against fee.code, not the numeric id param
  const pendingWaiverCount = fee ? waivers.filter((w) => w.feeId === fee.code).length : 0;

  const updateMutation = useMutation({
    mutationFn: (data: Partial<FeeDefinition>) => updateFeeDefinition(id!, data),
    onSuccess: () => {
      toast.success('Fee definition updated');
      queryClient.invalidateQueries({ queryKey: ['fee-definition', id] });
      queryClient.invalidateQueries({ queryKey: ['fee-definitions'] });
    },
    onError: () => toast.error('Failed to update fee definition'),
  });

  useEffect(() => {
    document.title = fee ? `Fee - ${fee.name} | CBS` : 'Fee Detail | CBS';
  }, [fee]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/admin/fees" />
        <div className="page-container space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-5 w-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 w-full bg-muted animate-pulse rounded-lg" />)}
          </div>
        </div>
      </>
    );
  }

  if (isError || !fee) {
    const is404 = (error as any)?.response?.status === 404 || (error as any)?.message?.includes('not found');
    return (
      <>
        <PageHeader title={is404 ? 'Fee Not Found' : 'Error'} backTo="/admin/fees" />
        <div className="page-container">
          <div className="rounded-xl border bg-destructive/10 border-destructive/20 p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive font-medium">
              {is404 ? 'This fee definition could not be found.' : 'Failed to load fee definition.'}
            </p>
            {!is404 && (
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['fee-definition', id] })}
                className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                Retry
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  const tabs = [
    {
      id: 'details',
      label: 'Details',
      icon: FileText,
      content: (
        <div className="p-6 max-w-4xl">
          <FeeCalculationEditor
            initialData={fee}
            mode="view"
            onSubmit={(data) => updateMutation.mutate(data)}
            isSubmitting={updateMutation.isPending}
          />
        </div>
      ),
    },
    {
      id: 'history',
      label: 'Charge History',
      icon: Clock,
      badge: chargeHistory.length,
      content: (
        <div className="p-6">
          {historyLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading history...
            </div>
          ) : (
            <FeeChargeHistoryTable charges={chargeHistory} />
          )}
        </div>
      ),
    },
    {
      id: 'waivers',
      label: 'Waivers',
      icon: Ban,
      badge: pendingWaiverCount,
      content: (
        <div className="p-6">
          <WaiversTab feeCode={fee.code} />
        </div>
      ),
    },
    {
      id: 'calculator',
      label: 'Calculator',
      icon: Calculator,
      content: (
        <div className="p-6">
          <FeePreviewCalculator feeCode={fee.code} />
        </div>
      ),
    },
  ];

  const statusColors: Record<FeeDefinition['status'], string> = {
    ACTIVE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    INACTIVE: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <>
      <PageHeader
        title={fee.name}
        subtitle={`${fee.code} · ${fee.category.replace(/_/g, ' ')}`}
        backTo="/admin/fees"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const cloneData = {
                  ...fee,
                  id: undefined,
                  code: `${fee.code}-COPY`,
                  name: `${fee.name} (Copy)`,
                  status: 'INACTIVE' as const,
                  createdAt: undefined,
                };
                navigate('/admin/fees/new', { state: { cloneData } });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Clone Fee
            </button>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[fee.status]}`}>
              {fee.status}
            </span>
          </div>
        }
      />

      <div className="page-container p-0">
        <TabsPage tabs={tabs} defaultTab="details" syncWithUrl />
      </div>
    </>
  );
}
