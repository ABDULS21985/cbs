import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Edit2, Plus, ArrowDownToLine, XCircle, Printer, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, FormSection, TabsPage, StatusBadge, ConfirmDialog } from '@/components/shared';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { fixedDepositApi, type MaturityInstruction } from '../api/fixedDepositApi';
import { FdCalculator } from '../components/FdCalculator';
import { FdEarlyWithdrawalCalc } from '../components/FdEarlyWithdrawalCalc';
import { FdCertificate } from '../components/FdCertificate';
import { FdMaturityInstruction } from '../components/FdMaturityInstruction';
import { RolloverChain } from '../components/RolloverChain';
import { FdTopUpForm } from '../components/FdTopUpForm';
import { FdPartialWithdrawalForm } from '../components/FdPartialWithdrawalForm';

const INSTRUCTION_LABEL_MAP: Record<string, string> = {
  ROLLOVER_ALL: 'Auto-Rollover (Principal + Interest)',
  ROLLOVER_PRINCIPAL: 'Auto-Rollover (Principal Only)',
  LIQUIDATE: 'Liquidate to Account',
  MANUAL: 'Manual Decision at Maturity',
};

export function FixedDepositDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingInstruction, setEditingInstruction] = useState(false);
  const [pendingInstruction, setPendingInstruction] = useState<MaturityInstruction | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showPartialWithdraw, setShowPartialWithdraw] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: fd, isLoading } = useQuery({
    queryKey: ['fixed-deposits', 'detail', id],
    queryFn: () => fixedDepositApi.getFixedDeposit(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const { mutate: updateInstruction, isPending: updatingInstruction } = useMutation({
    mutationFn: (instruction: MaturityInstruction) => fixedDepositApi.updateMaturityInstruction(id!, instruction),
    onSuccess: () => { toast.success('Maturity instruction updated'); queryClient.invalidateQueries({ queryKey: ['fixed-deposits'] }); setEditingInstruction(false); },
    onError: () => toast.error('Failed to update instruction'),
  });

  const terminateMut = useMutation({
    mutationFn: () => fixedDepositApi.terminate(id!, 'Early termination requested'),
    onSuccess: () => { toast.success('Fixed deposit terminated'); queryClient.invalidateQueries({ queryKey: ['fixed-deposits'] }); setShowTerminate(false); },
    onError: () => toast.error('Failed to terminate'),
  });

  useEffect(() => { document.title = fd ? `FD - ${fd.fdNumber} | CBS` : 'Fixed Deposit | CBS'; }, [fd]);

  // Progress calculation
  const progress = useMemo(() => {
    if (!fd) return { pct: 0, daysElapsed: 0, daysRemaining: 0 };
    const start = new Date(fd.startDate).getTime();
    const end = new Date(fd.maturityDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    const daysElapsed = Math.max(0, Math.floor(elapsed / 86400000));
    const daysRemaining = Math.max(0, Math.ceil((end - now) / 86400000));
    const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
    return { pct, daysElapsed, daysRemaining };
  }, [fd]);

  const copyFdNumber = () => { if (fd) { navigator.clipboard.writeText(fd.fdNumber); setCopied(true); setTimeout(() => setCopied(false), 1500); } };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Fixed Deposit" backTo="/accounts/fixed-deposits" />
        <div className="page-container space-y-4">
          <div className="h-24 bg-muted animate-pulse rounded-xl" />
          <div className="h-10 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      </>
    );
  }

  if (!fd) {
    return (
      <>
        <PageHeader title="Fixed Deposit" backTo="/accounts/fixed-deposits" />
        <div className="page-container text-center py-16 text-muted-foreground">Fixed deposit not found.</div>
      </>
    );
  }

  const isActive = fd.status === 'ACTIVE';
  const isMatured = fd.status === 'MATURED';
  const isRolledOver = fd.status === 'ROLLED_OVER';
  const hasRolloverHistory = (fd.rolloverCount ?? 0) > 0 || !!fd.parentFdId;

  // Action buttons
  const actions = (
    <div className="flex items-center gap-2 flex-wrap print:hidden">
      {isActive && (
        <>
          <button onClick={() => setShowTopUp(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"><Plus className="w-3.5 h-3.5" /> Top Up</button>
          <button onClick={() => setShowPartialWithdraw(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"><ArrowDownToLine className="w-3.5 h-3.5" /> Partial Withdrawal</button>
          <button onClick={() => setShowTerminate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"><XCircle className="w-3.5 h-3.5" /> Terminate</button>
        </>
      )}
      <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"><Printer className="w-3.5 h-3.5" /> Certificate</button>
    </div>
  );

  const tabs = [
    {
      id: 'overview', label: 'Overview',
      content: (
        <div className="p-6 space-y-6">
          {/* Progress bar */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress.daysElapsed} days elapsed</span>
              <span className={cn('font-medium', progress.daysRemaining > 0 ? 'text-foreground' : 'text-amber-600')}>
                {progress.daysRemaining > 0 ? `${progress.daysRemaining} days until maturity` : `Matured ${Math.abs(progress.daysRemaining)} days ago`}
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500', isMatured ? 'bg-amber-500 animate-pulse' : 'bg-green-500')} style={{ width: `${progress.pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDate(fd.startDate)}</span>
              <span>{formatDate(fd.maturityDate)}</span>
            </div>
          </div>

          <InfoGrid items={[
            { label: 'FD Number', value: fd.fdNumber, mono: true, copyable: true },
            { label: 'Status', value: <StatusBadge status={fd.status} dot /> },
            { label: 'Customer', value: fd.customerName },
            { label: 'Source Account', value: fd.sourceAccountNumber, format: 'account' as const, copyable: true },
            { label: 'Currency', value: fd.currency },
            { label: 'Principal', value: fd.principalAmount, format: 'money' as const },
            { label: 'Interest Rate', value: `${formatPercent(fd.interestRate)} p.a.` },
            { label: 'Tenor', value: `${fd.tenor} days` },
            { label: 'Gross Interest', value: fd.grossInterest, format: 'money' as const },
            { label: 'WHT (10%)', value: fd.wht, format: 'money' as const },
            { label: 'Net Interest', value: fd.netInterest, format: 'money' as const },
            { label: 'Maturity Value', value: fd.maturityValue, format: 'money' as const },
          ]} columns={3} />

          <FormSection title="Interest Breakdown">
            <FdCalculator principal={fd.principalAmount} rate={fd.interestRate} tenor={fd.tenor} />
          </FormSection>
        </div>
      ),
    },
    {
      id: 'instructions', label: 'Instructions',
      content: (
        <div className="p-6 max-w-lg">
          <FormSection title="Maturity Instruction">
            {!editingInstruction ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{INSTRUCTION_LABEL_MAP[fd.maturityInstruction]}</p>
                    {fd.destinationAccountId && <p className="text-xs text-muted-foreground mt-0.5">Destination: {fd.destinationAccountId}</p>}
                  </div>
                  {isActive && (
                    <button onClick={() => { setEditingInstruction(true); setPendingInstruction({ type: fd.maturityInstruction, destinationAccountId: fd.destinationAccountId }); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"><Edit2 className="w-3 h-3" /> Change</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FdMaturityInstruction value={pendingInstruction ?? { type: fd.maturityInstruction }} onChange={(v) => setPendingInstruction(v)} accounts={[]} />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditingInstruction(false); setPendingInstruction(null); }} className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                  <button onClick={() => pendingInstruction && updateInstruction(pendingInstruction)} disabled={updatingInstruction}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                    {updatingInstruction && <Loader2 className="w-3 h-3 animate-spin" />} Save
                  </button>
                </div>
              </div>
            )}
          </FormSection>
        </div>
      ),
    },
    {
      id: 'transactions', label: 'Transactions',
      content: (
        <div className="p-6 space-y-6">
          {isActive && (
            <FormSection title="Early Withdrawal" description="Estimated proceeds if withdrawn today">
              <FdEarlyWithdrawalCalc fdId={fd.id} fd={fd} />
            </FormSection>
          )}
          {!isActive && (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              <p className="text-sm">This deposit is {fd.status.toLowerCase()}. No transactions available.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'certificate', label: 'Certificate',
      content: <div className="p-6"><FdCertificate fd={fd} /></div>,
    },
    {
      id: 'history', label: 'History',
      badge: hasRolloverHistory ? fd.rolloverCount : undefined,
      content: (
        <div className="p-6 space-y-6">
          {hasRolloverHistory ? (
            <FormSection title="Rollover Chain" description="Previous and subsequent rollovers">
              <RolloverChain currentFd={fd} />
            </FormSection>
          ) : (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              <p className="text-sm">No rollover history — this is the original deposit.</p>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={fd.fdNumber} subtitle={`${fd.customerName} · ${formatMoney(fd.principalAmount, fd.currency)} · ${fd.tenor} days`}
        backTo="/accounts/fixed-deposits" actions={actions} />

      <div className="page-container space-y-4">
        {/* Header badges */}
        <div className="flex items-center gap-2">
          <button onClick={copyFdNumber} className="font-mono text-sm bg-muted px-2 py-0.5 rounded hover:bg-muted/80 flex items-center gap-1">
            {fd.fdNumber} {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-50" />}
          </button>
          <StatusBadge status={fd.status} dot />
          {isRolledOver && (
            <button onClick={() => { /* Navigate to child FD if known */ }} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> View Current FD
            </button>
          )}
        </div>

        <TabsPage tabs={tabs} syncWithUrl />
      </div>

      {/* Dialogs */}
      {showTopUp && <FdTopUpForm fd={fd} onClose={() => setShowTopUp(false)} />}
      {showPartialWithdraw && <FdPartialWithdrawalForm fd={fd} onClose={() => setShowPartialWithdraw(false)} />}
      <ConfirmDialog open={showTerminate} onClose={() => setShowTerminate(false)} onConfirm={() => terminateMut.mutate()}
        title="Terminate Fixed Deposit" description={`Are you sure you want to terminate FD ${fd.fdNumber}? Penalties will apply.`}
        confirmLabel="Yes, Terminate" variant="destructive" isLoading={terminateMut.isPending} />
    </>
  );
}
