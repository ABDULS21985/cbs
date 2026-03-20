import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, DataTable, StatusBadge, TabsPage, FormSection } from '@/components/shared';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { syndicatedLoansApi } from '../api/syndicatedLoanApi';
import { useSyndicatedLoanParticipants, useSyndicatedLoanDrawdowns, useAddSyndicateParticipant, useRequestSyndicateDrawdown, useFundSyndicateDrawdown } from '../hooks/useLendingExt';
import type { SyndicatedLoanFacility, SyndicateParticipant, SyndicateDrawdown } from '../types/syndicatedLoan';

const ROLE_COLORS: Record<string, string> = { LEAD_ARRANGER: 'bg-blue-100 text-blue-800', PARTICIPANT: 'bg-gray-100 text-gray-800', AGENT: 'bg-purple-100 text-purple-800' };
const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function SyndicationDetailPage() {
  const { code = '' } = useParams<{ code: string }>();
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showDrawdown, setShowDrawdown] = useState(false);

  // Fetch facility from the syndicated-loans API by role (workaround — get all and find by code)
  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['syndicated-loans', 'all'],
    queryFn: () => syndicatedLoansApi.getByRole(''),
  });
  const facility = facilities.find((f: SyndicatedLoanFacility) => f.facilityCode === code) ?? null;

  const { data: participants = [] } = useSyndicatedLoanParticipants(code);
  const { data: drawdowns = [] } = useSyndicatedLoanDrawdowns(code);
  const addParticipantMut = useAddSyndicateParticipant();
  const requestDrawdownMut = useRequestSyndicateDrawdown();
  const fundDrawdownMut = useFundSyndicateDrawdown();

  const [partForm, setPartForm] = useState({ participantName: '', participantBic: '', role: 'PARTICIPANT', commitmentAmount: 0, sharePct: 0, settlementAccount: '' });
  const [ddForm, setDdForm] = useState({ drawdownType: 'TERM', amount: 0, currency: 'NGN', interestPeriod: '3M', interestRate: 0, valueDate: '', maturityDate: '' });

  if (isLoading) return <><PageHeader title="Loading..." backTo="/lending/syndication" /><div className="page-container"><div className="h-64 bg-muted animate-pulse rounded-xl" /></div></>;
  if (!facility) return <><PageHeader title="Facility Not Found" backTo="/lending/syndication" /><div className="page-container text-center py-16 text-muted-foreground">Syndicated loan facility not found.</div></>;

  const participantCols: ColumnDef<SyndicateParticipant, unknown>[] = [
    { accessorKey: 'participantName', header: 'Participant', cell: ({ row }) => <span className="font-medium">{row.original.participantName}</span> },
    { accessorKey: 'participantBic', header: 'BIC', cell: ({ row }) => <span className="font-mono text-xs">{row.original.participantBic}</span> },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium', ROLE_COLORS[row.original.role] ?? 'bg-gray-100')}>{row.original.role}</span> },
    { accessorKey: 'commitmentAmount', header: 'Commitment', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.commitmentAmount)}</span> },
    { accessorKey: 'sharePct', header: 'Share %', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.sharePct)}</span> },
    { accessorKey: 'fundedAmount', header: 'Funded', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.fundedAmount)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" /> },
  ];

  const drawdownCols: ColumnDef<SyndicateDrawdown, unknown>[] = [
    { accessorKey: 'drawdownRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.drawdownRef}</span> },
    { accessorKey: 'drawdownType', header: 'Type' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatMoney(row.original.amount)}</span> },
    { accessorKey: 'currency', header: 'CCY', cell: ({ row }) => <span className="text-xs">{row.original.currency}</span> },
    { accessorKey: 'interestRate', header: 'Rate', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.interestRate)}</span> },
    { accessorKey: 'valueDate', header: 'Value Date', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.valueDate)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" /> },
    {
      id: 'actions', header: '', cell: ({ row }) => {
        if (row.original.status !== 'REQUESTED') return null;
        return <button onClick={() => fundDrawdownMut.mutate(row.original.drawdownRef, { onSuccess: () => toast.success('Drawdown funded') })}
          className="px-2 py-1 text-[10px] font-medium rounded bg-green-100 text-green-800 hover:bg-green-200">Fund</button>;
      },
    },
  ];

  const pieData = participants.map((p: SyndicateParticipant) => ({ name: p.participantName, value: p.commitmentAmount }));
  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  const tabs = [
    {
      id: 'participants', label: 'Participants', badge: participants.length,
      content: (
        <div className="p-4 space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowAddParticipant(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"><Plus className="w-3.5 h-3.5" /> Add Participant</button></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><DataTable columns={participantCols} data={participants} enableGlobalFilter emptyMessage="No participants" /></div>
            {pieData.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h4 className="text-xs font-semibold text-muted-foreground mb-3">Share Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {pieData.map((_: unknown, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: number) => formatMoney(v)} /></PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'drawdowns', label: 'Drawdowns', badge: drawdowns.length,
      content: (
        <div className="p-4 space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowDrawdown(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"><Plus className="w-3.5 h-3.5" /> Request Drawdown</button></div>
          <DataTable columns={drawdownCols} data={drawdowns} enableGlobalFilter emptyMessage="No drawdowns" />
        </div>
      ),
    },
    {
      id: 'covenants', label: 'Covenants & Terms',
      content: (
        <div className="p-4">
          <FormSection title="Financial Covenants">
            {facility.financialCovenants && Object.keys(facility.financialCovenants).length > 0 ? (
              <pre className="text-xs font-mono bg-muted/50 rounded-lg p-4 overflow-x-auto">{JSON.stringify(facility.financialCovenants, null, 2)}</pre>
            ) : <p className="text-sm text-muted-foreground">No financial covenants defined</p>}
          </FormSection>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={facility.facilityName} subtitle={facility.facilityCode} backTo="/lending/syndication"
        actions={<div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold', ROLE_COLORS[facility.ourRole] ?? 'bg-gray-100')}>{facility.ourRole}</span>
          <StatusBadge status={facility.status} />
        </div>} />

      <div className="page-container space-y-4">
        <InfoGrid columns={4} items={[
          { label: 'Facility Code', value: facility.facilityCode, mono: true, copyable: true },
          { label: 'Borrower', value: facility.borrowerName },
          { label: 'Lead Arranger', value: facility.leadArranger },
          { label: 'Our Role', value: facility.ourRole },
          { label: 'Total Amount', value: facility.totalFacilityAmount, format: 'money' },
          { label: 'Our Commitment', value: facility.ourCommitment, format: 'money' },
          { label: 'Our Share', value: `${formatPercent(facility.ourSharePct)}` },
          { label: 'Drawn', value: facility.drawnAmount, format: 'money' },
          { label: 'Base Rate', value: facility.baseRate },
          { label: 'Margin', value: `${facility.marginBps} bps` },
          { label: 'Tenor', value: `${facility.tenorMonths} months` },
          { label: 'Maturity', value: facility.maturityDate, format: 'date' },
        ]} />
        <TabsPage tabs={tabs} syncWithUrl />
      </div>

      {showAddParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/50" onClick={() => setShowAddParticipant(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <h3 className="font-semibold">Add Participant</h3>
            <input value={partForm.participantName} onChange={(e) => setPartForm({ ...partForm, participantName: e.target.value })} placeholder="Name" className={inputCls} />
            <input value={partForm.participantBic} onChange={(e) => setPartForm({ ...partForm, participantBic: e.target.value })} placeholder="BIC" className={inputCls} />
            <input type="number" value={partForm.commitmentAmount || ''} onChange={(e) => setPartForm({ ...partForm, commitmentAmount: Number(e.target.value) })} placeholder="Commitment" className={inputCls} />
            <input type="number" value={partForm.sharePct || ''} onChange={(e) => setPartForm({ ...partForm, sharePct: Number(e.target.value) })} placeholder="Share %" className={inputCls} />
            <div className="flex gap-2"><button onClick={() => setShowAddParticipant(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => addParticipantMut.mutate({ code, data: partForm }, { onSuccess: () => { toast.success('Participant added'); setShowAddParticipant(false); } })}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Add</button></div>
          </div>
        </div>
      )}

      {showDrawdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/50" onClick={() => setShowDrawdown(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <h3 className="font-semibold">Request Drawdown</h3>
            <input type="number" value={ddForm.amount || ''} onChange={(e) => setDdForm({ ...ddForm, amount: Number(e.target.value) })} placeholder="Amount" className={inputCls} />
            <input type="number" step="0.01" value={ddForm.interestRate || ''} onChange={(e) => setDdForm({ ...ddForm, interestRate: Number(e.target.value) })} placeholder="Rate %" className={inputCls} />
            <input type="date" value={ddForm.valueDate} onChange={(e) => setDdForm({ ...ddForm, valueDate: e.target.value })} className={inputCls} />
            <div className="flex gap-2"><button onClick={() => setShowDrawdown(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => requestDrawdownMut.mutate({ code, data: ddForm }, { onSuccess: () => { toast.success('Drawdown requested'); setShowDrawdown(false); } })}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Request</button></div>
          </div>
        </div>
      )}
    </>
  );
}
