import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, FormSection, AuditTimeline, StatusBadge } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { fixedDepositApi, type MaturityInstruction } from '../api/fixedDepositApi';
import { FdCalculator } from '../components/FdCalculator';
import { FdEarlyWithdrawalCalc } from '../components/FdEarlyWithdrawalCalc';
import { FdCertificate } from '../components/FdCertificate';
import { FdMaturityInstruction } from '../components/FdMaturityInstruction';


export function FixedDepositDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editingInstruction, setEditingInstruction] = useState(false);
  const [pendingInstruction, setPendingInstruction] = useState<MaturityInstruction | null>(null);

  const { data: fd, isLoading } = useQuery({
    queryKey: ['fixed-deposits', 'detail', id],
    queryFn: () => fixedDepositApi.getFixedDeposit(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const { mutate: updateInstruction, isPending: updatingInstruction } = useMutation({
    mutationFn: (instruction: MaturityInstruction) =>
      fixedDepositApi.updateMaturityInstruction(id!, instruction),
    onSuccess: () => {
      toast.success('Maturity instruction updated');
      queryClient.invalidateQueries({ queryKey: ['fixed-deposits', 'detail', id] });
      setEditingInstruction(false);
      setPendingInstruction(null);
    },
    onError: () => {
      toast.error('Failed to update maturity instruction');
    },
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title="Fixed Deposit" backTo="/accounts/fixed-deposits" />
        <div className="page-container flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!fd) {
    return (
      <>
        <PageHeader title="Fixed Deposit" backTo="/accounts/fixed-deposits" />
        <div className="page-container text-center py-16 text-muted-foreground">
          Fixed deposit not found.
        </div>
      </>
    );
  }

  const infoItems = [
    { label: 'FD Number', value: fd.fdNumber, mono: true, copyable: true },
    { label: 'Status', value: <StatusBadge status={fd.status} dot /> },
    { label: 'Customer', value: fd.customerName },
    { label: 'Customer ID', value: fd.customerId, mono: true },
    { label: 'Source Account', value: fd.sourceAccountNumber, format: 'account' as const, copyable: true },
    { label: 'Currency', value: fd.currency },
    { label: 'Principal Amount', value: fd.principalAmount, format: 'money' as const },
    { label: 'Interest Rate', value: `${formatPercent(fd.interestRate)} p.a.` },
    { label: 'Tenor', value: `${fd.tenor} days` },
    { label: 'Start Date', value: fd.startDate, format: 'date' as const },
    { label: 'Maturity Date', value: fd.maturityDate, format: 'date' as const },
    { label: 'Gross Interest', value: fd.grossInterest, format: 'money' as const },
    { label: 'WHT (10%)', value: fd.wht, format: 'money' as const },
    { label: 'Net Interest', value: fd.netInterest, format: 'money' as const },
    { label: 'Maturity Value', value: fd.maturityValue, format: 'money' as const },
    { label: 'Rollover Count', value: fd.rolloverCount !== undefined ? String(fd.rolloverCount) : '0' },
  ];

  const isRolledOver = (fd.rolloverCount ?? 0) > 0 || !!fd.parentFdId;

  return (
    <>
      <PageHeader
        title={fd.fdNumber}
        subtitle={`${fd.customerName} · ${formatMoney(fd.principalAmount, fd.currency)} · ${fd.tenor} days`}
        backTo="/accounts/fixed-deposits"
      />

      <div className="page-container space-y-6">
        {/* FD Details */}
        <FormSection title="Fixed Deposit Details">
          <InfoGrid items={infoItems} columns={3} />
        </FormSection>

        {/* Interest Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormSection title="Interest Breakdown">
            <FdCalculator
              principal={fd.principalAmount}
              rate={fd.interestRate}
              tenor={fd.tenor}
            />
          </FormSection>

          {/* Maturity Instruction */}
          <FormSection
            title="Maturity Instruction"
            description={editingInstruction ? 'Select a new instruction' : undefined}
          >
            {!editingInstruction ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{INSTRUCTION_LABEL_MAP[fd.maturityInstruction]}</p>
                    {fd.destinationAccountId && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Destination: {fd.destinationAccountId}
                      </p>
                    )}
                  </div>
                  {fd.status === 'ACTIVE' && (
                    <button
                      onClick={() => {
                        setEditingInstruction(true);
                        setPendingInstruction({ type: fd.maturityInstruction, destinationAccountId: fd.destinationAccountId });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Change
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FdMaturityInstruction
                  value={pendingInstruction ?? { type: fd.maturityInstruction }}
                  onChange={(v) => setPendingInstruction(v)}
                  accounts={[]}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setEditingInstruction(false); setPendingInstruction(null); }}
                    className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => pendingInstruction && updateInstruction(pendingInstruction)}
                    disabled={updatingInstruction}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {updatingInstruction && <Loader2 className="w-3 h-3 animate-spin" />}
                    Save
                  </button>
                </div>
              </div>
            )}
          </FormSection>
        </div>

        {/* Early Withdrawal */}
        {fd.status === 'ACTIVE' && (
          <FormSection title="Early Withdrawal" description="Estimated proceeds if withdrawn today">
            <FdEarlyWithdrawalCalc fdId={fd.id} fd={fd} />
          </FormSection>
        )}

        {/* Certificate */}
        <FormSection title="FD Certificate" collapsible defaultOpen={false}>
          <FdCertificate fd={fd} />
        </FormSection>

        {/* Rollover History */}
        {isRolledOver && (
          <FormSection title="Rollover History" description="Previous rollovers for this deposit">
            <AuditTimeline events={[]} />
          </FormSection>
        )}
      </div>
    </>
  );
}

const INSTRUCTION_LABEL_MAP: Record<string, string> = {
  ROLLOVER_ALL: 'Auto-Rollover (Principal + Interest)',
  ROLLOVER_PRINCIPAL: 'Auto-Rollover (Principal Only)',
  LIQUIDATE: 'Liquidate to Account',
  MANUAL: 'Manual Decision at Maturity',
};
