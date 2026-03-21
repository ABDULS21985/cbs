import { useState, useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Search, FileText, Hash, Building2, Calendar, CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, EmptyState } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FinancialInstrument {
  id: number;
  instrumentCode: string;
  isin: string | null;
  cusip: string | null;
  sedol: string | null;
  ticker: string | null;
  instrumentName: string;
  instrumentType: string;
  assetClass: string;
  issuerName: string | null;
  issuerCountry: string | null;
  currency: string;
  faceValue: number | null;
  couponRate: number | null;
  couponFrequency: string | null;
  maturityDate: string | null;
  issueDate: string | null;
  creditRating: string | null;
  ratingAgency: string | null;
  exchange: string | null;
  dayCountConvention: string | null;
  settlementDays: number;
  isActive: boolean;
}

interface RegisterInstrumentPayload {
  instrumentCode: string;
  instrumentName: string;
  instrumentType: string;
  assetClass: string;
  currency: string;
  isin?: string;
  exchange?: string;
  issuerName?: string;
  faceValue?: number;
  couponRate?: number;
  maturityDate?: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

const instrumentKeys = {
  all: ['financial-instruments'] as const,
  byCode: (code: string) => ['financial-instruments', 'code', code] as const,
  byType: (type: string) => ['financial-instruments', 'type', type] as const,
  byAssetClass: (ac: string) => ['financial-instruments', 'asset-class', ac] as const,
};

function useInstrumentsByAssetClass(assetClass: string) {
  return useQuery({
    queryKey: assetClass === 'ALL' ? instrumentKeys.all : instrumentKeys.byAssetClass(assetClass),
    queryFn: () =>
      assetClass === 'ALL'
        ? apiGet<FinancialInstrument[]>('/api/v1/financial-instruments/asset-class/ALL')
        : apiGet<FinancialInstrument[]>(`/api/v1/financial-instruments/asset-class/${assetClass}`),
  });
}

function useInstrumentByCode(code: string) {
  return useQuery({
    queryKey: instrumentKeys.byCode(code),
    queryFn: () => apiGet<FinancialInstrument>(`/api/v1/financial-instruments/${code}`),
    enabled: Boolean(code),
  });
}

function useRegisterInstrument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterInstrumentPayload) =>
      apiPost<FinancialInstrument>('/api/v1/financial-instruments', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: instrumentKeys.all }),
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ASSET_CLASSES = ['ALL', 'EQUITY', 'FIXED_INCOME', 'FX', 'COMMODITY', 'DERIVATIVE', 'MONEY_MARKET'] as const;

const INSTRUMENT_TYPES = [
  'BOND', 'EQUITY', 'OPTION', 'FUTURE', 'FX_SPOT', 'FX_FORWARD', 'SWAP',
  'TREASURY_BILL', 'COMMERCIAL_PAPER', 'ETF', 'MUTUAL_FUND', 'COMMODITY',
] as const;

// ── Detail Slide-over ─────────────────────────────────────────────────────────

function DetailSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? <span className="text-muted-foreground/50">--</span>}</p>
    </div>
  );
}

function InstrumentDetailPanel({ code, onClose }: { code: string; onClose: () => void }) {
  const { data: inst, isLoading, isError } = useInstrumentByCode(code);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Instrument Detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load instrument details.
            </div>
          )}
          {inst && (
            <>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold">{inst.instrumentName}</h3>
                  <span className={cn('w-2 h-2 rounded-full', inst.isActive ? 'bg-green-500' : 'bg-gray-300')} />
                </div>
                <p className="text-xs text-muted-foreground font-mono">{inst.instrumentCode}</p>
              </div>

              <DetailSection title="Identification" icon={Hash}>
                <DetailField label="Code" value={<span className="font-mono">{inst.instrumentCode}</span>} />
                <DetailField label="ISIN" value={inst.isin && <span className="font-mono">{inst.isin}</span>} />
                <DetailField label="CUSIP" value={inst.cusip && <span className="font-mono">{inst.cusip}</span>} />
                <DetailField label="SEDOL" value={inst.sedol && <span className="font-mono">{inst.sedol}</span>} />
                <DetailField label="Ticker" value={inst.ticker && <span className="font-mono">{inst.ticker}</span>} />
              </DetailSection>

              <DetailSection title="Classification" icon={FileText}>
                <DetailField label="Type" value={inst.instrumentType} />
                <DetailField label="Asset Class" value={inst.assetClass} />
                <DetailField label="Exchange" value={inst.exchange} />
              </DetailSection>

              <DetailSection title="Issuer" icon={Building2}>
                <DetailField label="Issuer Name" value={inst.issuerName} />
                <DetailField label="Country" value={inst.issuerCountry} />
                <DetailField label="Credit Rating" value={inst.creditRating} />
                <DetailField label="Rating Agency" value={inst.ratingAgency} />
              </DetailSection>

              <DetailSection title="Terms" icon={CreditCard}>
                <DetailField label="Currency" value={inst.currency} />
                <DetailField label="Face Value" value={inst.faceValue != null ? formatMoney(inst.faceValue, inst.currency) : null} />
                <DetailField label="Coupon Rate" value={inst.couponRate != null ? `${inst.couponRate}%` : null} />
                <DetailField label="Coupon Frequency" value={inst.couponFrequency} />
                <DetailField label="Day Count Convention" value={inst.dayCountConvention} />
                <DetailField label="Settlement Days" value={inst.settlementDays != null ? `T+${inst.settlementDays}` : null} />
              </DetailSection>

              <DetailSection title="Dates" icon={Calendar}>
                <DetailField label="Issue Date" value={inst.issueDate ? formatDate(inst.issueDate) : null} />
                <DetailField label="Maturity Date" value={inst.maturityDate ? formatDate(inst.maturityDate) : null} />
              </DetailSection>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// ── Register Instrument Dialog ────────────────────────────────────────────────

function RegisterInstrumentDialog({ onClose }: { onClose: () => void }) {
  const registerMut = useRegisterInstrument();
  const [form, setForm] = useState<RegisterInstrumentPayload>({
    instrumentCode: '',
    instrumentName: '',
    instrumentType: 'EQUITY',
    assetClass: 'EQUITY',
    currency: 'NGN',
  });

  const update = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  const canSubmit = form.instrumentCode.trim() && form.instrumentName.trim() && form.instrumentType && form.assetClass && form.currency;

  const handleSubmit = () => {
    const payload = { ...form };
    // Strip empty optional fields
    if (!payload.isin) delete payload.isin;
    if (!payload.exchange) delete payload.exchange;
    if (!payload.issuerName) delete payload.issuerName;
    if (!payload.faceValue) delete payload.faceValue;
    if (!payload.couponRate) delete payload.couponRate;
    if (!payload.maturityDate) delete payload.maturityDate;

    registerMut.mutate(payload, {
      onSuccess: () => { toast.success('Instrument registered successfully'); onClose(); },
      onError: () => toast.error('Failed to register instrument'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="register-inst-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="register-inst-title" className="text-base font-semibold">Register Instrument</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Instrument Code *</label>
              <input value={form.instrumentCode} onChange={(e) => update('instrumentCode', e.target.value.toUpperCase())} maxLength={30} className={cn(fc, 'font-mono')} placeholder="e.g. GTCO" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Currency *</label>
              <input value={form.currency} onChange={(e) => update('currency', e.target.value.toUpperCase())} maxLength={3} className={cn(fc, 'font-mono')} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Instrument Name *</label>
            <input value={form.instrumentName} onChange={(e) => update('instrumentName', e.target.value)} maxLength={300} className={fc} placeholder="e.g. Guaranty Trust Holding Company Plc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Instrument Type *</label>
              <select value={form.instrumentType} onChange={(e) => update('instrumentType', e.target.value)} className={fc}>
                {INSTRUMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Asset Class *</label>
              <select value={form.assetClass} onChange={(e) => update('assetClass', e.target.value)} className={fc}>
                {ASSET_CLASSES.filter((a) => a !== 'ALL').map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">ISIN</label>
              <input value={form.isin ?? ''} onChange={(e) => update('isin', e.target.value.toUpperCase())} maxLength={12} className={cn(fc, 'font-mono')} placeholder="12-char code" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Exchange</label>
              <input value={form.exchange ?? ''} onChange={(e) => update('exchange', e.target.value)} maxLength={40} className={fc} placeholder="e.g. NGX" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Issuer Name</label>
            <input value={form.issuerName ?? ''} onChange={(e) => update('issuerName', e.target.value)} maxLength={200} className={fc} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Face Value</label>
              <input type="number" step="0.01" value={form.faceValue ?? ''} onChange={(e) => update('faceValue', e.target.value ? parseFloat(e.target.value) : undefined)} className={fc} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Coupon Rate (%)</label>
              <input type="number" step="0.01" value={form.couponRate ?? ''} onChange={(e) => update('couponRate', e.target.value ? parseFloat(e.target.value) : undefined)} className={fc} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Maturity Date</label>
            <input type="date" value={form.maturityDate ?? ''} onChange={(e) => update('maturityDate', e.target.value || undefined)} className={fc} />
          </div>
          <div className="flex gap-2 pt-3 border-t">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || registerMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {registerMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function FinancialInstrumentsPage() {
  useEffect(() => { document.title = 'Financial Instruments | CBS'; }, []);

  const [assetClass, setAssetClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  const { data: instruments = [], isLoading, isError } = useInstrumentsByAssetClass(assetClass);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return instruments;
    const q = searchQuery.toLowerCase();
    return instruments.filter(
      (i) =>
        i.instrumentCode.toLowerCase().includes(q) ||
        i.instrumentName.toLowerCase().includes(q),
    );
  }, [instruments, searchQuery]);

  const columns: ColumnDef<FinancialInstrument, any>[] = useMemo(() => [
    {
      accessorKey: 'instrumentCode',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.instrumentCode}</span>,
    },
    {
      accessorKey: 'instrumentName',
      header: 'Name',
      cell: ({ row }) => <span className="text-sm max-w-[200px] truncate block">{row.original.instrumentName}</span>,
    },
    {
      accessorKey: 'instrumentType',
      header: 'Type',
      cell: ({ row }) => <span className="text-xs">{row.original.instrumentType.replace(/_/g, ' ')}</span>,
    },
    {
      accessorKey: 'assetClass',
      header: 'Asset Class',
      cell: ({ row }) => <span className="text-xs">{row.original.assetClass.replace(/_/g, ' ')}</span>,
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.currency}</span>,
    },
    {
      accessorKey: 'isin',
      header: 'ISIN',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.isin ?? '--'}</span>,
    },
    {
      accessorKey: 'exchange',
      header: 'Exchange',
      cell: ({ row }) => <span className="text-xs">{row.original.exchange ?? '--'}</span>,
    },
    {
      accessorKey: 'creditRating',
      header: 'Rating',
      cell: ({ row }) => <span className="text-xs">{row.original.creditRating ?? '--'}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Active',
      cell: ({ row }) => (
        <span className={cn('inline-block w-2 h-2 rounded-full', row.original.isActive ? 'bg-green-500' : 'bg-gray-300')} />
      ),
    },
  ], []);

  return (
    <>
      <PageHeader
        title="Financial Instruments"
        subtitle="Manage and browse registered financial instruments"
        actions={
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Register Instrument
          </button>
        }
      />

      <div className="page-container space-y-4">
        {/* Asset Class Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {ASSET_CLASSES.map((ac) => (
            <button
              key={ac}
              onClick={() => setAssetClass(ac)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors',
                assetClass === ac
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground',
              )}
            >
              {ac.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Error State */}
        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load financial instruments. Please try again later.
          </div>
        )}

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter={false}
          enableExport
          exportFilename="financial-instruments"
          onRowClick={(row) => setSelectedCode(row.instrumentCode)}
          emptyMessage="No instruments found for this asset class."
          pageSize={15}
        />
      </div>

      {/* Detail Slide-over */}
      {selectedCode && (
        <InstrumentDetailPanel code={selectedCode} onClose={() => setSelectedCode(null)} />
      )}

      {/* Register Dialog */}
      {showRegister && (
        <RegisterInstrumentDialog onClose={() => setShowRegister(false)} />
      )}
    </>
  );
}
