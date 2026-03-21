import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, History, Edit2, Layers, FileText, CheckCircle, ArrowRightLeft, AlertTriangle, RefreshCw, Download, Upload, X, Loader2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard } from '@/components/shared';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getFeeDefinitions, createFeeDefinition, type FeeDefinition, type FeeCategory, type FeeCalcType } from '../api/feeApi';
import { FeeComparisonPanel } from '../components/FeeComparisonPanel';

// ─── Local badge helper ───────────────────────────────────────────────────────

function CalcBadge({ type, fee }: { type: FeeCalcType; fee: FeeDefinition }) {
  if (type === 'FLAT') {
    return (
      <span className="text-sm font-medium tabular-nums">
        ₦{fee.flatAmount?.toLocaleString('en-NG') ?? '—'}
      </span>
    );
  }
  if (type === 'PERCENTAGE') {
    return (
      <span className="text-sm font-medium tabular-nums">{fee.percentage ?? '—'}%</span>
    );
  }
  if (type === 'MIN_OF') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
        Min(₦{fee.flatAmount?.toLocaleString('en-NG') ?? '—'}, {fee.percentage ?? '—'}%)
      </span>
    );
  }
  if (type === 'MAX_OF') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
        Max(₦{fee.flatAmount?.toLocaleString('en-NG') ?? '—'}, {fee.percentage ?? '—'}%)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      <Layers className="w-3 h-3" />
      {type === 'TIERED' ? 'Tiered' : 'Slab'}
    </span>
  );
}

function StatusBadge({ status }: { status: 'ACTIVE' | 'INACTIVE' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        status === 'ACTIVE'
          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400',
        )}
      />
      {status}
    </span>
  );
}

function CategoryLabel({ category }: { category: FeeCategory }) {
  const labels: Record<FeeCategory, string> = {
    ACCOUNT_MAINTENANCE: 'Account Maintenance',
    TRANSACTION: 'Transaction',
    CARD: 'Card',
    LOAN_PROCESSING: 'Loan Processing',
    STATEMENT: 'Statement',
    CHEQUE: 'Cheque',
    SWIFT: 'SWIFT',
    ATM: 'ATM',
    POS: 'POS',
    ONLINE: 'Online',
    PENALTY: 'Penalty',
    COMMISSION: 'Commission',
    SERVICE_CHARGE: 'Service Charge',
    OTHER: 'Other',
  };
  return <span className="text-sm">{labels[category]}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'ACCOUNT_MAINTENANCE', label: 'Account Maintenance' },
  { value: 'TRANSACTION', label: 'Transaction' },
  { value: 'CARD', label: 'Card' },
  { value: 'LOAN_PROCESSING', label: 'Loan Processing' },
  { value: 'STATEMENT', label: 'Statement' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'SWIFT', label: 'SWIFT' },
  { value: 'ATM', label: 'ATM' },
  { value: 'POS', label: 'POS' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'PENALTY', label: 'Penalty' },
  { value: 'COMMISSION', label: 'Commission' },
  { value: 'SERVICE_CHARGE', label: 'Service Charge' },
  { value: 'OTHER', label: 'Other' },
];

const CALC_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'FLAT', label: 'Flat' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'TIERED', label: 'Tiered' },
  { value: 'SLAB', label: 'Slab' },
  { value: 'MIN_OF', label: 'Min Of' },
  { value: 'MAX_OF', label: 'Max Of' },
];

const selectCls =
  'px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';

// ─── Export Helper ───────────────────────────────────────────────────────────

function exportFeesToCsv(fees: FeeDefinition[]) {
  const headers = ['code', 'name', 'category', 'calcType', 'flatAmount', 'percentage', 'minFee', 'maxFee', 'vatApplicable', 'vatRate', 'schedule', 'waiverAuthority', 'status'];
  const rows = fees.map((f) => headers.map((h) => {
    const val = f[h as keyof FeeDefinition];
    return typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val ?? '');
  }));
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fee-definitions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportFeesToJson(fees: FeeDefinition[]) {
  const blob = new Blob([JSON.stringify(fees, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fee-definitions-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import Dialog ──────────────────────────────────────────────────────────

function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importedFees, setImportedFees] = useState<Partial<FeeDefinition>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    try {
      let parsed: Partial<FeeDefinition>[];
      if (file.name.endsWith('.json')) {
        parsed = JSON.parse(text);
      } else {
        // CSV parsing
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');
        parsed = lines.slice(1).map((line) => {
          const vals = line.split(',');
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => { obj[h.trim()] = vals[i]?.trim(); });
          if (obj.flatAmount) obj.flatAmount = Number(obj.flatAmount);
          if (obj.percentage) obj.percentage = Number(obj.percentage);
          if (obj.minFee) obj.minFee = Number(obj.minFee);
          if (obj.maxFee) obj.maxFee = Number(obj.maxFee);
          if (obj.vatRate) obj.vatRate = Number(obj.vatRate);
          if (obj.vatApplicable) obj.vatApplicable = obj.vatApplicable === 'true';
          return obj as Partial<FeeDefinition>;
        });
      }
      // Validate
      const errs: string[] = [];
      parsed.forEach((f, i) => {
        if (!f.code) errs.push(`Row ${i + 1}: Missing fee code`);
        if (!f.name) errs.push(`Row ${i + 1}: Missing fee name`);
        if (!f.category) errs.push(`Row ${i + 1}: Missing category`);
      });
      setImportedFees(parsed);
      setErrors(errs);
    } catch {
      setErrors(['Invalid file format']);
    }
  };

  const handleImport = async () => {
    const valid = importedFees.filter((f) => f.code && f.name && f.category);
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const fee of valid) {
      try {
        await createFeeDefinition(fee as Omit<FeeDefinition, 'id' | 'createdAt'>);
        success++;
      } catch {
        failed++;
      }
    }
    setImportResults({ success, failed });
    setImporting(false);
    if (success > 0) onImported();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-1">Import Fee Definitions</h2>
        <p className="text-sm text-muted-foreground mb-4">Upload a CSV or JSON file</p>

        {importResults ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-900/10 p-4 text-center">
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">{importResults.success} fee(s) imported</p>
              {importResults.failed > 0 && <p className="text-xs text-red-600 mt-1">{importResults.failed} failed</p>}
            </div>
            <button onClick={onClose} className="w-full btn-primary">Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Drop CSV or JSON file here</p>
            </div>

            {importedFees.length > 0 && (
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{importedFees.length} fee(s) found</p>
                {errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={handleImport} disabled={importedFees.length === 0 || importing} className="btn-primary flex items-center gap-2">
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                Import {importedFees.filter((f) => f.code && f.name).length} Fees
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FeeScheduleListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [calcTypeFilter, setCalcTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: fees = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['fee-definitions'],
    queryFn: getFeeDefinitions,
  });

  useEffect(() => { document.title = 'Fees & Charges | CBS'; }, []);

  const filtered = useMemo(() => {
    return fees.filter((fee) => {
      if (categoryFilter && fee.category !== categoryFilter) return false;
      if (calcTypeFilter && fee.calcType !== calcTypeFilter) return false;
      if (statusFilter !== 'ALL' && fee.status !== statusFilter) return false;
      return true;
    });
  }, [fees, categoryFilter, calcTypeFilter, statusFilter]);

  const columns: ColumnDef<FeeDefinition, any>[] = [
    {
      accessorKey: 'code',
      header: 'Fee Code',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-medium text-muted-foreground">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Fee Name',
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => <CategoryLabel category={getValue<FeeCategory>()} />,
    },
    {
      accessorKey: 'calcType',
      header: 'Calc Type',
      cell: ({ getValue }) => {
        const v = getValue<FeeCalcType>();
        const labels: Record<FeeCalcType, string> = {
          FLAT: 'Flat',
          PERCENTAGE: 'Percentage',
          TIERED: 'Tiered',
          SLAB: 'Slab',
          MIN_OF: 'Min Of',
          MAX_OF: 'Max Of',
        };
        return <span className="text-sm">{labels[v]}</span>;
      },
    },
    {
      id: 'amountRate',
      header: 'Amount / Rate',
      cell: ({ row }) => <CalcBadge type={row.original.calcType} fee={row.original} />,
    },
    {
      accessorKey: 'schedule',
      header: 'Schedule',
      cell: ({ getValue }) => {
        const labels: Record<string, string> = {
          PER_TRANSACTION: 'Per Txn',
          MONTHLY: 'Monthly',
          QUARTERLY: 'Quarterly',
          ANNUAL: 'Annual',
        };
        return <span className="text-sm text-muted-foreground">{labels[getValue<string>()] ?? getValue<string>()}</span>;
      },
    },
    {
      id: 'products',
      header: 'Products',
      cell: ({ row }) => {
        const products = row.original.applicableProducts;
        if (products.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              {products[0]}
            </span>
            {products.length > 1 && (
              <span className="text-xs text-muted-foreground">+{products.length - 1}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<'ACTIVE' | 'INACTIVE'>()} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/fees/${row.original.id}`);
            }}
            title="Edit"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/fees/${row.original.id}?tab=history`);
            }}
            title="View History"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Fees & Charges"
        subtitle="Manage fee definitions, charge history, and waivers"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <Upload className="w-4 h-4" /> Import
            </button>
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                <Download className="w-4 h-4" /> Export
              </button>
              <div className="absolute right-0 top-full mt-1 bg-background rounded-lg border shadow-lg z-10 hidden group-hover:block">
                <button onClick={() => exportFeesToCsv(fees)} className="w-full px-4 py-2 text-sm text-left hover:bg-muted">Export CSV</button>
                <button onClick={() => exportFeesToJson(fees)} className="w-full px-4 py-2 text-sm text-left hover:bg-muted">Export JSON</button>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/fees/new')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Fee Definition
            </button>
          </div>
        }
      />

      <div className="page-container space-y-4">
        {/* Revenue summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Fee Definitions" value={fees.length} format="number" icon={FileText} />
          <StatCard label="Active Fees" value={fees.filter((f) => f.status === 'ACTIVE').length} format="number" icon={CheckCircle} />
          <StatCard label="Monthly Revenue" value="—" />
          <StatCard label="Waiver Rate" value="—" />
        </div>

        {/* Compare bar */}
        {selectedForCompare.length >= 2 && (
          <div className="flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{selectedForCompare.length} fees selected</span>
            <button onClick={() => setShowCompare(true)}
              className="ml-auto px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
              Compare Selected
            </button>
            <button onClick={() => setSelectedForCompare([])}
              className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 rounded-xl border bg-card">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={selectCls}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={calcTypeFilter}
            onChange={(e) => setCalcTypeFilter(e.target.value)}
            className={selectCls}
          >
            {CALC_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="flex items-center rounded-lg border bg-background overflow-hidden text-sm">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-2 font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {(categoryFilter || calcTypeFilter || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setCategoryFilter('');
                setCalcTypeFilter('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} fee{filtered.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {isError ? (
          <div className="rounded-xl border p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm font-medium text-destructive">Failed to load fee definitions</p>
            <button onClick={() => refetch()} className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            enableGlobalFilter
            enableRowSelection
            onRowSelectionChange={(rows: FeeDefinition[]) => setSelectedForCompare(rows.map((r) => r.id))}
            onRowClick={(row: FeeDefinition) => navigate(`/admin/fees/${row.id}`)}
            emptyMessage="No fee definitions found. Create your first fee definition."
          />
        )}
      </div>

      {showCompare && (
        <FeeComparisonPanel
          fees={fees.filter((f) => selectedForCompare.includes(f.id))}
          onClose={() => setShowCompare(false)}
        />
      )}

      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImported={() => queryClient.invalidateQueries({ queryKey: ['fee-definitions'] })}
        />
      )}
    </>
  );
}
