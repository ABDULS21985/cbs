import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, History, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { governanceApi } from '../api/governanceApi';
import type { SystemParameter, ParameterAudit } from '../api/parameterApi';
import type { ColumnDef } from '@tanstack/react-table';

export function GovernancePage() {
  useEffect(() => { document.title = 'Governance | CBS Admin'; }, []);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'audit' | 'changes' | 'approvals'>('audit');
  const [selectedParamId, setSelectedParamId] = useState<number | null>(null);

  const { data: parameters = [], isLoading } = useQuery({
    queryKey: ['governance', 'parameters'],
    queryFn: () => governanceApi.list(),
  });

  const { data: auditTrail = [] } = useQuery({
    queryKey: ['governance', 'audit', selectedParamId],
    queryFn: () => governanceApi.getAudit(selectedParamId!),
    enabled: !!selectedParamId,
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => governanceApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['governance'] }); toast.success('Parameter approved'); },
    onError: () => toast.error('Failed to approve'),
  });

  const pendingApprovals = parameters.filter((p: SystemParameter) => p.approvalStatus === 'PENDING');
  const recentChanges = parameters.filter((p: SystemParameter) => p.approvalStatus === 'PENDING' || p.updatedAt);

  const paramCols = useMemo<ColumnDef<SystemParameter, unknown>[]>(() => [
    { accessorKey: 'paramKey', header: 'Parameter Key', cell: ({ row }) => <button onClick={() => setSelectedParamId(row.original.id)} className="text-sm font-mono font-medium text-primary hover:underline">{row.original.paramKey}</button> },
    { accessorKey: 'paramCategory', header: 'Category', cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded bg-muted font-medium">{row.original.paramCategory}</span> },
    { accessorKey: 'paramValue', header: 'Value', cell: ({ row }) => <span className="text-sm font-mono truncate max-w-[200px] block">{row.original.isEncrypted ? '••••••' : row.original.paramValue}</span> },
    { accessorKey: 'lastModifiedBy', header: 'Modified By', cell: ({ row }) => <span className="text-sm">{row.original.lastModifiedBy || '—'}</span> },
    { accessorKey: 'updatedAt', header: 'Updated', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.updatedAt ? formatDateTime(row.original.updatedAt) : '—'}</span> },
    { accessorKey: 'approvalStatus', header: 'Approval', cell: ({ row }) => <StatusBadge status={row.original.approvalStatus || 'APPROVED'} dot /> },
    { id: 'actions', header: '', cell: ({ row }) => row.original.approvalStatus === 'PENDING' ? (
      <button onClick={() => approveMut.mutate(row.original.id)} disabled={approveMut.isPending} className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-600 transition-colors" title="Approve"><CheckCircle className="w-4 h-4" /></button>
    ) : <button onClick={() => setSelectedParamId(row.original.id)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="View Audit"><Eye className="w-4 h-4" /></button> },
  ], [approveMut]);

  const auditCols = useMemo<ColumnDef<ParameterAudit, unknown>[]>(() => [
    { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => <span className="text-sm tabular-nums">{formatDateTime(row.original.createdAt)}</span> },
    { accessorKey: 'changedBy', header: 'Changed By', cell: ({ row }) => <span className="text-sm font-medium">{row.original.changedBy}</span> },
    { accessorKey: 'oldValue', header: 'Old Value', cell: ({ row }) => <span className="text-sm font-mono bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">{row.original.oldValue || '—'}</span> },
    { accessorKey: 'newValue', header: 'New Value', cell: ({ row }) => <span className="text-sm font-mono bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">{row.original.newValue}</span> },
    { accessorKey: 'changeReason', header: 'Reason', cell: ({ row }) => <span className="text-sm">{row.original.changeReason || '—'}</span> },
  ], []);

  const tabs = [
    { key: 'audit' as const, label: 'All Parameters', icon: History },
    { key: 'changes' as const, label: `Pending Changes (${recentChanges.length})`, icon: FileText },
    { key: 'approvals' as const, label: `Approvals (${pendingApprovals.length})`, icon: CheckCircle },
  ];

  return (
    <>
      <PageHeader title="Governance" subtitle="Parameter audit trail, change management, and approval workflows" />
      <div className="page-container space-y-6">
        <div className="flex border-b">
          {tabs.map(t => { const Icon = t.icon; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}><Icon className="w-4 h-4" />{t.label}</button>; })}
        </div>

        {activeTab === 'audit' && (isLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={paramCols} data={parameters} enableGlobalFilter emptyMessage="No governance parameters" pageSize={20} />)}
        {activeTab === 'changes' && (isLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={paramCols} data={recentChanges} enableGlobalFilter emptyMessage="No pending changes" pageSize={20} />)}
        {activeTab === 'approvals' && (isLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={paramCols} data={pendingApprovals} enableGlobalFilter emptyMessage="No pending approvals" pageSize={20} />)}
      </div>

      {/* Audit trail slide-over */}
      {selectedParamId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedParamId(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-background border-l shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /><h3 className="text-base font-semibold">Parameter Audit Trail</h3></div>
              <button onClick={() => setSelectedParamId(null)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><span className="sr-only">Close</span>&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {auditTrail.length > 0 ? <DataTable columns={auditCols} data={auditTrail} emptyMessage="No audit records" pageSize={20} /> : <p className="text-sm text-muted-foreground text-center py-12">No audit history for this parameter</p>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
