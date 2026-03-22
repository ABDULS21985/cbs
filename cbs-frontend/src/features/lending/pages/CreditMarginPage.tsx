import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, ArrowUp, ArrowDown, Search, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useMarginCalls, useCollateralPositions, useCounterpartyMarginCalls, useIssueMarginCall, useAcknowledgeCall, useSettleCall, useRecordCollateral } from '../hooks/useCreditMargin';
import type { MarginCall, CollateralPosition } from '../types/creditMargin';

export function CreditMarginPage() {
  const { data: calls = [], isLoading: callsLoading } = useMarginCalls();
  const { data: collateral = [], isLoading: collateralLoading } = useCollateralPositions();
  const issueMut = useIssueMarginCall();
  const ackMut = useAcknowledgeCall();
  const settleMut = useSettleCall();
  const recordMut = useRecordCollateral();

  const [showIssue, setShowIssue] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [settleTarget, setSettleTarget] = useState<MarginCall | null>(null);
  const [settleForm, setSettleForm] = useState({ agreedAmount: 0, collateralType: 'CASH' });
  const [statusFilter, setStatusFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [cpSearch, setCpSearch] = useState('');
  const [searchedCp, setSearchedCp] = useState('');

  const { data: cpCalls = [] } = useCounterpartyMarginCalls(searchedCp);

  const [issueForm, setIssueForm] = useState({ callDirection: 'OUTGOING' as 'OUTGOING' | 'INCOMING', counterpartyCode: '', counterpartyName: '', callType: 'VARIATION', currency: 'NGN', callAmount: 0, portfolioMtm: 0, thresholdAmount: 0, minimumTransfer: 0, callDate: '', responseDeadline: '' });
  const [collForm, setCollForm] = useState({ positionCode: '', counterpartyCode: '', counterpartyName: '', direction: 'LONG' as const, collateralType: 'CASH', currency: 'NGN', marketValue: 0, haircutPct: 0, maturityDate: '' });

  const filtered = useMemo(() => {
    let result = calls;
    if (statusFilter) result = result.filter((c) => c.status === statusFilter);
    if (directionFilter) result = result.filter((c) => c.callDirection === directionFilter);
    return result;
  }, [calls, statusFilter, directionFilter]);

  const openCalls = calls.filter((c) => c.status === 'ISSUED' || c.status === 'ACKNOWLEDGED');
  const totalCollateral = collateral.reduce((s, c) => s + c.adjustedValue, 0);
  const totalDisputed = calls.reduce((s, c) => s + (c.disputeAmount || 0), 0);

  const callCols: ColumnDef<MarginCall, unknown>[] = [
    { accessorKey: 'callRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.callRef}</span> },
    {
      accessorKey: 'callDirection', header: 'Dir',
      cell: ({ row }) => row.original.callDirection === 'OUTGOING'
        ? <span className="flex items-center gap-1 text-xs text-red-600"><ArrowUp className="w-3 h-3" /> OUT</span>
        : <span className="flex items-center gap-1 text-xs text-green-600"><ArrowDown className="w-3 h-3" /> IN</span>,
    },
    { accessorKey: 'counterpartyName', header: 'Counterparty' },
    { accessorKey: 'callType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.callType}</span> },
    { accessorKey: 'callAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatMoney(row.original.callAmount, row.original.currency)}</span> },
    { accessorKey: 'portfolioMtm', header: 'Portfolio MTM', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.portfolioMtm, row.original.currency)}</span> },
    { accessorKey: 'disputeAmount', header: 'Disputed', cell: ({ row }) => row.original.disputeAmount > 0 ? <span className="font-mono text-xs text-red-600">{formatMoney(row.original.disputeAmount)}</span> : <span className="text-xs text-muted-foreground">—</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" /> },
    { accessorKey: 'callDate', header: 'Call Date', cell: ({ row }) => <span className="text-xs">{row.original.callDate ? formatDate(row.original.callDate) : '—'}</span> },
    {
      id: 'actions', header: '', cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {c.status === 'ISSUED' && <button onClick={() => ackMut.mutate(c.callRef, { onSuccess: () => toast.success('Acknowledged') })} className="px-2 py-1 text-[10px] font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200">Acknowledge</button>}
            {c.status === 'ACKNOWLEDGED' && <button onClick={() => { setSettleTarget(c); setSettleForm({ agreedAmount: c.callAmount, collateralType: 'CASH' }); }} className="px-2 py-1 text-[10px] font-medium rounded bg-green-100 text-green-800 hover:bg-green-200">Settle</button>}
          </div>
        );
      },
    },
  ];

  const collCols: ColumnDef<CollateralPosition, unknown>[] = [
    { accessorKey: 'positionCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.positionCode}</span> },
    { accessorKey: 'counterpartyName', header: 'Counterparty' },
    { accessorKey: 'direction', header: 'Dir', cell: ({ row }) => <StatusBadge status={row.original.direction} size="sm" /> },
    { accessorKey: 'collateralType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.collateralType}</span> },
    { accessorKey: 'marketValue', header: 'Market Value', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.marketValue, row.original.currency)}</span> },
    { accessorKey: 'haircutPct', header: 'Haircut', cell: ({ row }) => <span className="font-mono text-xs">{formatPercent(row.original.haircutPct)}</span> },
    { accessorKey: 'adjustedValue', header: 'Adjusted', cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatMoney(row.original.adjustedValue, row.original.currency)}</span> },
    { accessorKey: 'eligible', header: 'Eligible', cell: ({ row }) => row.original.eligible ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" /> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" /> },
  ];

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  const tabs = [
    {
      id: 'calls', label: 'Margin Calls', badge: openCalls.length || undefined,
      content: (
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cn(inputCls, 'w-auto')}>
              <option value="">All Statuses</option>
              {['ISSUED', 'ACKNOWLEDGED', 'SETTLED', 'DISPUTED', 'EXPIRED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)} className={cn(inputCls, 'w-auto')}>
              <option value="">All Directions</option><option value="OUTGOING">Outgoing</option><option value="INCOMING">Incoming</option>
            </select>
          </div>
          <DataTable columns={callCols} data={filtered} isLoading={callsLoading} enableGlobalFilter enableExport exportFilename="margin-calls" emptyMessage="No margin calls" />
        </div>
      ),
    },
    {
      id: 'collateral', label: 'Collateral Positions', badge: collateral.length || undefined,
      content: <div className="p-4"><DataTable columns={collCols} data={collateral} isLoading={collateralLoading} enableGlobalFilter emptyMessage="No collateral positions" /></div>,
    },
    {
      id: 'counterparty', label: 'Counterparty View',
      content: (
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={cpSearch} onChange={(e) => setCpSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setSearchedCp(cpSearch); }}
                placeholder="Counterparty code..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" /></div>
            <button onClick={() => setSearchedCp(cpSearch)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Search</button>
          </div>
          {searchedCp ? (
            <DataTable columns={callCols} data={cpCalls} enableGlobalFilter emptyMessage={`No calls for ${searchedCp}`} />
          ) : (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground"><p className="text-sm">Enter a counterparty code to view margin calls</p></div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Credit Margin Management" subtitle="Margin calls, collateral positions, and counterparty exposure"
        actions={<div className="flex gap-2">
          <button onClick={() => setShowIssue(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Issue Margin Call</button>
          <button onClick={() => setShowRecord(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"><Plus className="w-4 h-4" /> Record Collateral</button>
        </div>} />

      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-label">Open Calls</div><div className="stat-value text-amber-600">{openCalls.length}</div><div className="text-xs text-muted-foreground font-mono">{formatMoney(openCalls.reduce((s, c) => s + c.callAmount, 0))}</div></div>
          <div className="stat-card"><div className="stat-label">Total Collateral</div><div className="stat-value text-sm font-mono">{formatMoney(totalCollateral)}</div></div>
          <div className="stat-card"><div className="stat-label">Net Exposure</div><div className="stat-value text-sm font-mono">{formatMoney(openCalls.reduce((s, c) => s + c.callAmount, 0) - totalCollateral)}</div></div>
          <div className="stat-card"><div className="stat-label">Disputed</div><div className={cn('stat-value text-sm font-mono', totalDisputed > 0 ? 'text-red-600' : '')}>{formatMoney(totalDisputed)}</div></div>
        </div>
        <TabsPage tabs={tabs} syncWithUrl />
      </div>

      {/* Issue Margin Call Dialog */}
      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowIssue(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10"><h2 className="text-base font-semibold">Issue Margin Call</h2><button onClick={() => setShowIssue(false)} className="p-1.5 rounded-md hover:bg-muted">&times;</button></div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1">Direction</label><select value={issueForm.callDirection} onChange={(e) => setIssueForm({ ...issueForm, callDirection: e.target.value as 'OUTGOING' | 'INCOMING' })} className={inputCls}><option value="OUTGOING">Outgoing</option><option value="INCOMING">Incoming</option></select></div>
                <div><label className="block text-xs font-medium mb-1">Type</label><select value={issueForm.callType} onChange={(e) => setIssueForm({ ...issueForm, callType: e.target.value })} className={inputCls}><option value="VARIATION">Variation</option><option value="INITIAL">Initial</option><option value="REGULATORY">Regulatory</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1">Counterparty Code</label><input value={issueForm.counterpartyCode} onChange={(e) => setIssueForm({ ...issueForm, counterpartyCode: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-xs font-medium mb-1">Counterparty Name</label><input value={issueForm.counterpartyName} onChange={(e) => setIssueForm({ ...issueForm, counterpartyName: e.target.value })} className={inputCls} /></div>
              </div>
              <MoneyInput label="Call Amount" value={issueForm.callAmount} onChange={(v) => setIssueForm({ ...issueForm, callAmount: v })} currency="NGN" />
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1">Call Date</label><input type="date" value={issueForm.callDate} onChange={(e) => setIssueForm({ ...issueForm, callDate: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-xs font-medium mb-1">Response Deadline</label><input type="date" value={issueForm.responseDeadline} onChange={(e) => setIssueForm({ ...issueForm, responseDeadline: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="flex gap-2 pt-2"><button onClick={() => setShowIssue(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => issueMut.mutate(issueForm, { onSuccess: () => { toast.success('Margin call issued'); setShowIssue(false); } })} disabled={issueMut.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{issueMut.isPending ? 'Issuing...' : 'Issue Call'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Record Collateral Dialog */}
      {showRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRecord(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <h3 className="font-semibold">Record Collateral Position</h3>
            <input value={collForm.positionCode} onChange={(e) => setCollForm({ ...collForm, positionCode: e.target.value })} placeholder="Position Code" className={inputCls} />
            <div className="grid grid-cols-2 gap-4">
              <input value={collForm.counterpartyCode} onChange={(e) => setCollForm({ ...collForm, counterpartyCode: e.target.value })} placeholder="CP Code" className={inputCls} />
              <input value={collForm.counterpartyName} onChange={(e) => setCollForm({ ...collForm, counterpartyName: e.target.value })} placeholder="CP Name" className={inputCls} />
            </div>
            <MoneyInput label="Market Value" value={collForm.marketValue} onChange={(v) => setCollForm({ ...collForm, marketValue: v })} currency="NGN" />
            <div><label className="block text-xs font-medium mb-1">Haircut %</label><input type="number" step="0.01" value={collForm.haircutPct || ''} onChange={(e) => setCollForm({ ...collForm, haircutPct: Number(e.target.value) })} className={inputCls} /></div>
            <div className="flex gap-2"><button onClick={() => setShowRecord(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => recordMut.mutate(collForm, { onSuccess: () => { toast.success('Collateral recorded'); setShowRecord(false); } })} disabled={recordMut.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{recordMut.isPending ? 'Recording...' : 'Record'}</button></div>
          </div>
        </div>
      )}

      {/* Settle Dialog */}
      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSettleTarget(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <h3 className="font-semibold">Settle Margin Call</h3>
            <p className="text-xs text-muted-foreground font-mono">{settleTarget.callRef}</p>
            <MoneyInput label="Agreed Amount" value={settleForm.agreedAmount} onChange={(v) => setSettleForm({ ...settleForm, agreedAmount: v })} currency={settleTarget.currency as 'NGN'} />
            <div><label className="block text-xs font-medium mb-1">Collateral Type</label><select value={settleForm.collateralType} onChange={(e) => setSettleForm({ ...settleForm, collateralType: e.target.value })} className={inputCls}><option value="CASH">Cash</option><option value="GOVERNMENT_BOND">Government Bond</option><option value="CORPORATE_BOND">Corporate Bond</option><option value="EQUITY">Equity</option></select></div>
            <div className="flex gap-2"><button onClick={() => setSettleTarget(null)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => settleMut.mutate({ ref: settleTarget.callRef, agreedAmount: settleForm.agreedAmount, collateralType: settleForm.collateralType }, { onSuccess: () => { toast.success('Call settled'); setSettleTarget(null); } })} disabled={settleMut.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">{settleMut.isPending ? 'Settling...' : 'Settle'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
