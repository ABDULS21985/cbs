import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck, Users, AlertTriangle, X, Send } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  useSuitabilityProfiles,
  useSuitabilityChecks,
  useExpiredProfiles,
  useOverrideSuitabilityCheck,
} from '../hooks/useCapitalMarketsExt';
import type { ClientRiskProfile, SuitabilityCheck } from '../types/suitability';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

const RESULT_COLORS: Record<string, string> = {
  SUITABLE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UNSUITABLE: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  OVERRIDE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

// ── Risk Profiles Tab ───────────────────────────────────────────────────────

function RiskProfilesTab() {
  const { data: profiles = [], isLoading } = useSuitabilityProfiles();

  const toleranceData = useMemo(() => {
    const counts: Record<string, number> = {};
    (profiles as ClientRiskProfile[]).forEach((p) => { counts[p.riskTolerance] = (counts[p.riskTolerance] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [profiles]);

  const columns = useMemo<ColumnDef<ClientRiskProfile, unknown>[]>(() => [
    { accessorKey: 'profileCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.profileCode}</span> },
    { accessorKey: 'customerId', header: 'Customer ID' },
    { accessorKey: 'riskTolerance', header: 'Risk Tolerance' },
    { accessorKey: 'investmentObjective', header: 'Objective' },
    { accessorKey: 'investmentHorizon', header: 'Horizon' },
    { accessorKey: 'knowledgeAssessmentScore', header: 'Knowledge Score', cell: ({ row }) => <span className="tabular-nums">{row.original.knowledgeAssessmentScore}</span> },
    { accessorKey: 'nextReviewDate', header: 'Next Review', cell: ({ row }) => formatDate(row.original.nextReviewDate) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ], []);

  return (
    <div className="p-4 space-y-6">
      <DataTable columns={columns} data={profiles as ClientRiskProfile[]} isLoading={isLoading} pageSize={15} />
      {toleranceData.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-4">Risk Tolerance Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={toleranceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {toleranceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Suitability Checks Tab ──────────────────────────────────────────────────

function ChecksTab() {
  const { data: checks = [], isLoading } = useSuitabilityChecks();
  const override = useOverrideSuitabilityCheck();
  const currentUser = useAuthStore((s) => s.user);
  const [overrideRef, setOverrideRef] = useState<string | null>(null);
  const [justification, setJustification] = useState('');

  const columns = useMemo<ColumnDef<SuitabilityCheck, unknown>[]>(() => [
    { accessorKey: 'checkRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.checkRef}</span> },
    { accessorKey: 'customerId', header: 'Customer' },
    { accessorKey: 'instrumentCode', header: 'Instrument' },
    { accessorKey: 'instrumentType', header: 'Type' },
    { accessorKey: 'proposedAmount', header: 'Amount', cell: ({ row }) => formatMoney(row.original.proposedAmount) },
    { accessorKey: 'overallResult', header: 'Result', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', RESULT_COLORS[row.original.overallResult] ?? 'bg-gray-100 text-gray-600')}>{row.original.overallResult}</span> },
    { accessorKey: 'checkedAt', header: 'Checked', cell: ({ row }) => formatDate(row.original.checkedAt) },
    { id: 'actions', header: '', cell: ({ row }) => row.original.overallResult === 'UNSUITABLE' && !row.original.overrideApplied ? (
      <button className="btn-secondary text-xs px-2 py-1" onClick={() => { setOverrideRef(row.original.checkRef); setJustification(''); }}>Override</button>
    ) : null },
  ], []);

  return (
    <div className="p-4 space-y-4">
      <DataTable columns={columns} data={checks as SuitabilityCheck[]} isLoading={isLoading} pageSize={15} />
      {overrideRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setOverrideRef(null)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-4">Override Suitability Check</h2>
            <p className="text-sm text-muted-foreground mb-4">Ref: {overrideRef}</p>
            <form onSubmit={(e) => { e.preventDefault(); override.mutate({ ref: overrideRef, justification, approver: currentUser?.username ?? currentUser?.fullName ?? 'unknown' }, { onSuccess: () => { toast.success('Override applied'); setOverrideRef(null); } }); }} className="space-y-4">
              <div><label className="text-sm font-medium text-muted-foreground">Justification</label><textarea className="w-full mt-1 input min-h-[80px]" value={justification} onChange={(e) => setJustification(e.target.value)} required placeholder="Provide justification for override..." /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setOverrideRef(null)} className="btn-secondary">Cancel</button><button type="submit" disabled={override.isPending} className="btn-primary">{override.isPending ? 'Applying...' : 'Apply Override'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Expired Profiles Tab ────────────────────────────────────────────────────

function ExpiredProfilesTab() {
  const { data: expired = [], isLoading } = useExpiredProfiles();

  const columns = useMemo<ColumnDef<ClientRiskProfile, unknown>[]>(() => [
    { accessorKey: 'profileCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.profileCode}</span> },
    { accessorKey: 'customerId', header: 'Customer' },
    { accessorKey: 'riskTolerance', header: 'Risk Tolerance' },
    { accessorKey: 'nextReviewDate', header: 'Review Due', cell: ({ row }) => <span className="text-red-600 font-medium">{formatDate(row.original.nextReviewDate)}</span> },
    { accessorKey: 'assessedBy', header: 'Assessed By' },
    { id: 'actions', header: '', cell: () => <button className="btn-secondary text-xs px-2 py-1 flex items-center gap-1" onClick={() => toast.success('Reminder sent')}><Send className="w-3 h-3" /> Remind</button> },
  ], []);

  return (
    <div className="p-4">
      <DataTable columns={columns} data={expired as ClientRiskProfile[]} isLoading={isLoading} pageSize={15} emptyMessage="No expired profiles" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SuitabilityPage() {
  useEffect(() => { document.title = 'Client Suitability | CBS'; }, []);

  const { data: profiles = [] } = useSuitabilityProfiles();
  const { data: checks = [] } = useSuitabilityChecks();
  const { data: expired = [] } = useExpiredProfiles();

  return (
    <>
      <PageHeader title="Client Suitability" subtitle="Risk profiling, suitability assessments and compliance" />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Profiles" value={(profiles as ClientRiskProfile[]).length} format="number" icon={Users} />
          <StatCard label="Checks Performed" value={(checks as SuitabilityCheck[]).length} format="number" icon={ShieldCheck} />
          <StatCard label="Expired Profiles" value={(expired as ClientRiskProfile[]).length} format="number" icon={AlertTriangle} />
          <StatCard label="Unsuitable" value={(checks as SuitabilityCheck[]).filter((c) => c.overallResult === 'UNSUITABLE').length} format="number" icon={AlertTriangle} />
        </div>
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={[
            { id: 'profiles', label: 'Risk Profiles', badge: (profiles as ClientRiskProfile[]).length || undefined, content: <RiskProfilesTab /> },
            { id: 'checks', label: 'Suitability Checks', content: <ChecksTab /> },
            { id: 'expired', label: 'Expired Profiles', badge: (expired as ClientRiskProfile[]).length || undefined, content: <ExpiredProfilesTab /> },
          ]} />
        </div>
      </div>
    </>
  );
}
