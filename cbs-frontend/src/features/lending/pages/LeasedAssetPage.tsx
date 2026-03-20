import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Package, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useLeasedAssetsDueInspection, useInspectLeasedAsset, useRegisterLeasedAsset } from '../hooks/useLendingExt';
import { useQuery } from '@tanstack/react-query';
import type { LeasedAsset } from '../types/leasedAsset';
import { leasedAssetsApi } from '../api/leasedAssetApi';

const CONDITION_COLORS: Record<string, string> = {
  EXCELLENT: 'bg-green-100 text-green-700', GOOD: 'bg-blue-100 text-blue-700',
  FAIR: 'bg-amber-100 text-amber-700', POOR: 'bg-orange-100 text-orange-700',
  DAMAGED: 'bg-red-100 text-red-700',
};

export function LeasedAssetPage() {
  useEffect(() => { document.title = 'Leased Asset Register | CBS'; }, []);
  const [inspectTarget, setInspectTarget] = useState<LeasedAsset | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [condition, setCondition] = useState('GOOD');
  const [nextDue, setNextDue] = useState('');
  const [registerForm, setRegisterForm] = useState({
    leaseContractId: '',
    assetType: 'VEHICLE',
    description: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    originalCost: '',
    currentBookValue: '',
    currentLocation: '',
    condition: 'GOOD',
    nextInspectionDue: '',
  });

  const { data: allAssets = [], isLoading } = useQuery({
    queryKey: ['lending', 'leased-assets', 'all'],
    queryFn: () => leasedAssetsApi.listAll(),
    staleTime: 30_000,
  });
  const { data: dueAssets = [], isLoading: dueLoading } = useLeasedAssetsDueInspection();

  const inspectMutation = useInspectLeasedAsset();
  const registerMutation = useRegisterLeasedAsset();

  const active = allAssets.filter((a) => a.status === 'ACTIVE' || !a.returnedAt);
  const returned = allAssets.filter((a) => a.status === 'RETURNED' || !!a.returnedAt);

  const handleInspect = () => {
    if (!inspectTarget) return;
    inspectMutation.mutate({ code: inspectTarget.assetCode, data: { condition, nextInspectionDue: nextDue } as any }, {
      onSuccess: () => { toast.success('Inspection recorded'); setInspectTarget(null); },
      onError: () => toast.error('Failed to record inspection'),
    });
  };

  const handleRegister = () => {
    if (!registerForm.description || !registerForm.originalCost) {
      toast.error('Description and original cost are required');
      return;
    }
    registerMutation.mutate({
      leaseContractId: registerForm.leaseContractId ? Number(registerForm.leaseContractId) : undefined,
      assetType: registerForm.assetType,
      description: registerForm.description,
      manufacturer: registerForm.manufacturer || undefined,
      model: registerForm.model || undefined,
      serialNumber: registerForm.serialNumber || undefined,
      originalCost: Number(registerForm.originalCost),
      currentBookValue: registerForm.currentBookValue ? Number(registerForm.currentBookValue) : Number(registerForm.originalCost),
      currentLocation: registerForm.currentLocation || undefined,
      condition: registerForm.condition,
      nextInspectionDue: registerForm.nextInspectionDue || undefined,
    }, {
      onSuccess: () => {
        toast.success('Leased asset registered');
        setRegisterOpen(false);
        setRegisterForm({
          leaseContractId: '',
          assetType: 'VEHICLE',
          description: '',
          manufacturer: '',
          model: '',
          serialNumber: '',
          originalCost: '',
          currentBookValue: '',
          currentLocation: '',
          condition: 'GOOD',
          nextInspectionDue: '',
        });
      },
      onError: () => toast.error('Failed to register asset'),
    });
  };

  const assetCols: ColumnDef<LeasedAsset, unknown>[] = [
    { accessorKey: 'assetCode', header: 'Asset Code', cell: ({ row }) => <code className="text-xs font-mono">{row.original.assetCode}</code> },
    { accessorKey: 'assetType', header: 'Type' },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="text-sm truncate max-w-[150px] block">{row.original.description}</span> },
    { id: 'makeModel', header: 'Make/Model', cell: ({ row }) => <span className="text-xs">{row.original.manufacturer} {row.original.model}</span> },
    { accessorKey: 'serialNumber', header: 'Serial #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.serialNumber}</span> },
    { accessorKey: 'originalCost', header: 'Original Cost', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.originalCost)}</span> },
    { accessorKey: 'currentBookValue', header: 'Book Value', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.currentBookValue)}</span> },
    { accessorKey: 'condition', header: 'Condition', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded text-xs font-medium', CONDITION_COLORS[row.original.condition] ?? 'bg-muted')}>{row.original.condition}</span> },
    { accessorKey: 'nextInspectionDue', header: 'Next Inspection', cell: ({ row }) => {
      const d = row.original.nextInspectionDue;
      const overdue = d && new Date(d) < new Date();
      return <span className={cn('text-xs', overdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>{d ? formatDate(d) : '—'}{overdue ? ' (overdue)' : ''}</span>;
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status || 'ACTIVE'} dot /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <button onClick={(e) => { e.stopPropagation(); setInspectTarget(row.original); }} className="px-2 py-1 rounded text-xs font-medium bg-muted hover:bg-muted/80">Inspect</button>
    )},
  ];

  const tabs = [
    { id: 'all', label: 'All Assets', badge: allAssets.length, content: (
      <div className="p-4"><DataTable columns={assetCols} data={allAssets} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="leased-assets" emptyMessage="No leased assets registered" /></div>
    )},
    { id: 'due', label: 'Due for Inspection', badge: dueAssets.length || undefined, content: (
      <div className="p-4"><DataTable columns={assetCols} data={dueAssets} isLoading={dueLoading} enableGlobalFilter emptyMessage="No assets due for inspection" /></div>
    )},
  ];

  return (
    <>
      <PageHeader
        title="Leased Asset Register"
        subtitle="Track, inspect, and manage leased assets"
        actions={(
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Asset
          </button>
        )}
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Assets" value={allAssets.length} format="number" icon={Package} />
          <StatCard label="Active" value={active.length} format="number" icon={CheckCircle} />
          <StatCard label="Due Inspection" value={dueAssets.length} format="number" icon={AlertTriangle} />
          <StatCard label="Returned" value={returned.length} format="number" />
        </div>
        <div className="card overflow-hidden"><TabsPage syncWithUrl tabs={tabs} /></div>
      </div>

      {/* Inspect Dialog */}
      {inspectTarget && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setInspectTarget(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">Record Inspection — {inspectTarget.assetCode}</h3>
              <div><label className="text-xs font-medium text-muted-foreground">Condition</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                  {['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'].map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-muted-foreground">Next Inspection Due</label>
                <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setInspectTarget(null)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleInspect} disabled={inspectMutation.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Record</button>
              </div>
            </div>
          </div>
        </>
      )}

      {registerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setRegisterOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">Register Leased Asset</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Lease Contract ID</label>
                  <input type="number" value={registerForm.leaseContractId} onChange={(e) => setRegisterForm((prev) => ({ ...prev, leaseContractId: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Asset Type</label>
                  <input value={registerForm.assetType} onChange={(e) => setRegisterForm((prev) => ({ ...prev, assetType: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <input value={registerForm.description} onChange={(e) => setRegisterForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Manufacturer</label>
                  <input value={registerForm.manufacturer} onChange={(e) => setRegisterForm((prev) => ({ ...prev, manufacturer: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Model</label>
                  <input value={registerForm.model} onChange={(e) => setRegisterForm((prev) => ({ ...prev, model: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Serial Number</label>
                  <input value={registerForm.serialNumber} onChange={(e) => setRegisterForm((prev) => ({ ...prev, serialNumber: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Current Location</label>
                  <input value={registerForm.currentLocation} onChange={(e) => setRegisterForm((prev) => ({ ...prev, currentLocation: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Original Cost</label>
                  <input type="number" value={registerForm.originalCost} onChange={(e) => setRegisterForm((prev) => ({ ...prev, originalCost: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Current Book Value</label>
                  <input type="number" value={registerForm.currentBookValue} onChange={(e) => setRegisterForm((prev) => ({ ...prev, currentBookValue: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Condition</label>
                  <select value={registerForm.condition} onChange={(e) => setRegisterForm((prev) => ({ ...prev, condition: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                    {['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Next Inspection Due</label>
                  <input type="date" value={registerForm.nextInspectionDue} onChange={(e) => setRegisterForm((prev) => ({ ...prev, nextInspectionDue: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setRegisterOpen(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleRegister} disabled={registerMutation.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Register</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
