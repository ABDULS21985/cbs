import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Search, Building2, Globe, Shield, Users,
  TrendingUp, BarChart3, Smartphone, AlertTriangle, Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiGet, apiPost, apiPut } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompetitorProfile {
  id: number;
  profileCode: string;
  competitorName: string;
  competitorType: string;
  country: string;
  totalAssets: number | null;
  totalDeposits: number | null;
  totalLoans: number | null;
  branchCount: number | null;
  customerCount: number | null;
  marketSharePct: number | null;
  keyProducts: Record<string, string> | null;
  pricingIntelligence: Record<string, string> | null;
  digitalCapabilities: Record<string, string> | null;
  strengths: Record<string, string> | null;
  weaknesses: Record<string, string> | null;
  threatLevel: string;
  strategicResponse: string | null;
  lastUpdatedDate: string | null;
  status: string;
}

interface CompetitorFormData {
  profileCode: string;
  competitorName: string;
  competitorType: string;
  country: string;
  totalAssets?: number;
  totalDeposits?: number;
  totalLoans?: number;
  branchCount?: number;
  customerCount?: number;
  marketSharePct?: number;
  threatLevel: string;
  strategicResponse?: string;
  keyProducts?: Record<string, string>;
  strengths?: Record<string, string>;
  weaknesses?: Record<string, string>;
}

// ── API ───────────────────────────────────────────────────────────────────────

const competitorKeys = {
  all: ['competitors'] as const,
  byType: (type: string) => ['competitors', 'type', type] as const,
  byThreat: (level: string) => ['competitors', 'threat', level] as const,
};

function useCompetitorsByType(type: string) {
  return useQuery({
    queryKey: type === 'ALL' ? competitorKeys.all : competitorKeys.byType(type),
    queryFn: () =>
      type === 'ALL'
        ? apiGet<CompetitorProfile[]>('/api/v1/competitors/type/ALL')
        : apiGet<CompetitorProfile[]>(`/api/v1/competitors/type/${type}`),
  });
}

function useCompetitorsByThreat(level: string) {
  return useQuery({
    queryKey: competitorKeys.byThreat(level),
    queryFn: () => apiGet<CompetitorProfile[]>(`/api/v1/competitors/threats/${level}`),
    enabled: level !== 'ALL',
  });
}

function useCreateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompetitorFormData) =>
      apiPost<CompetitorProfile>('/api/v1/competitors', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: competitorKeys.all }),
  });
}

function useUpdateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: Partial<CompetitorFormData> }) =>
      apiPut<CompetitorProfile>(`/api/v1/competitors/${code}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: competitorKeys.all }),
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COMPETITOR_TYPES = ['ALL', 'COMMERCIAL_BANK', 'FINTECH', 'MICROFINANCE', 'MOBILE_MONEY'] as const;
const THREAT_LEVELS = ['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const;

const THREAT_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  HIGH: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', dot: 'bg-red-500', label: 'High' },
  MEDIUM: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', dot: 'bg-amber-500', label: 'Medium' },
  LOW: { color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', dot: 'bg-green-500', label: 'Low' },
};

const THREAT_PILL_STYLES: Record<string, string> = {
  ALL: 'bg-muted text-muted-foreground',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function formatCompact(amount: number | null): string {
  if (amount == null) return '--';
  if (Math.abs(amount) >= 1e12) return `\u20A6${(amount / 1e12).toFixed(1)}T`;
  if (Math.abs(amount) >= 1e9) return `\u20A6${(amount / 1e9).toFixed(1)}B`;
  if (Math.abs(amount) >= 1e6) return `\u20A6${(amount / 1e6).toFixed(1)}M`;
  return formatMoney(amount);
}

function formatCount(n: number | null): string {
  if (n == null) return '--';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}

// ── JSON Map Display ──────────────────────────────────────────────────────────

function JsonMapSection({ title, icon: Icon, data }: { title: string; icon: React.ElementType; data: Record<string, string> | null }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div>
      <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      <div className="space-y-1.5">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-sm">
            <span className="font-medium min-w-[100px] text-xs text-muted-foreground">{key.replace(/_/g, ' ')}</span>
            <span className="text-sm">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Detail Slide-over ─────────────────────────────────────────────────────────

function CompetitorDetailPanel({ competitor, onClose, onEdit }: { competitor: CompetitorProfile; onClose: () => void; onEdit: () => void }) {
  const threat = THREAT_CONFIG[competitor.threatLevel] ?? THREAT_CONFIG.MEDIUM;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Competitor Profile</h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={cn('w-2.5 h-2.5 rounded-full', threat.dot)} />
              <h3 className="text-lg font-semibold">{competitor.competitorName}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {competitor.competitorType.replace(/_/g, ' ')} &middot; {competitor.country} &middot; Code: <span className="font-mono">{competitor.profileCode}</span>
            </p>
          </div>

          {/* Threat & Status */}
          <div className="flex items-center gap-3">
            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold', threat.bg, threat.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', threat.dot)} /> {competitor.threatLevel}
            </span>
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              competitor.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600',
            )}>
              {competitor.status}
            </span>
          </div>

          {/* Financial Metrics */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Financial Metrics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Assets</p>
                <p className="text-sm font-bold">{formatCompact(competitor.totalAssets)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Deposits</p>
                <p className="text-sm font-bold">{formatCompact(competitor.totalDeposits)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total Loans</p>
                <p className="text-sm font-bold">{formatCompact(competitor.totalLoans)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Market Share</p>
                <p className="text-sm font-bold">{competitor.marketSharePct != null ? `${competitor.marketSharePct}%` : '--'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Branches</p>
                <p className="text-sm font-bold">{competitor.branchCount?.toLocaleString() ?? '--'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Customers</p>
                <p className="text-sm font-bold">{formatCount(competitor.customerCount)}</p>
              </div>
            </div>
          </div>

          {/* Strategic Response */}
          {competitor.strategicResponse && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Strategic Response</h4>
              <p className="text-sm leading-relaxed rounded-lg border p-3 bg-muted/30">{competitor.strategicResponse}</p>
            </div>
          )}

          {/* JSON Map Sections */}
          <JsonMapSection title="Key Products" icon={BarChart3} data={competitor.keyProducts} />
          <JsonMapSection title="Pricing Intelligence" icon={TrendingUp} data={competitor.pricingIntelligence} />
          <JsonMapSection title="Digital Capabilities" icon={Smartphone} data={competitor.digitalCapabilities} />
          <JsonMapSection title="Strengths" icon={Shield} data={competitor.strengths} />
          <JsonMapSection title="Weaknesses" icon={AlertTriangle} data={competitor.weaknesses} />

          {/* Last Updated */}
          {competitor.lastUpdatedDate && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Last updated: {formatDate(competitor.lastUpdatedDate)}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

// ── Add / Edit Competitor Dialog ──────────────────────────────────────────────

function CompetitorFormDialog({
  mode,
  initial,
  onClose,
}: {
  mode: 'create' | 'edit';
  initial?: CompetitorProfile;
  onClose: () => void;
}) {
  const createMut = useCreateCompetitor();
  const updateMut = useUpdateCompetitor();
  const isPending = createMut.isPending || updateMut.isPending;

  const [form, setForm] = useState<CompetitorFormData>({
    profileCode: initial?.profileCode ?? '',
    competitorName: initial?.competitorName ?? '',
    competitorType: initial?.competitorType ?? 'COMMERCIAL_BANK',
    country: initial?.country ?? 'NGA',
    totalAssets: initial?.totalAssets ?? undefined,
    totalDeposits: initial?.totalDeposits ?? undefined,
    totalLoans: initial?.totalLoans ?? undefined,
    branchCount: initial?.branchCount ?? undefined,
    customerCount: initial?.customerCount ?? undefined,
    marketSharePct: initial?.marketSharePct ?? undefined,
    threatLevel: initial?.threatLevel ?? 'MEDIUM',
    strategicResponse: initial?.strategicResponse ?? undefined,
  });

  const update = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  const canSubmit = form.profileCode.trim() && form.competitorName.trim() && form.competitorType && form.country;

  const handleSubmit = () => {
    if (mode === 'create') {
      createMut.mutate(form, {
        onSuccess: () => { toast.success('Competitor profile created'); onClose(); },
        onError: () => toast.error('Failed to create competitor'),
      });
    } else if (initial) {
      updateMut.mutate(
        { code: initial.profileCode, payload: form },
        {
          onSuccess: () => { toast.success('Competitor profile updated'); onClose(); },
          onError: () => toast.error('Failed to update competitor'),
        },
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="competitor-form-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="competitor-form-title" className="text-base font-semibold">
            {mode === 'create' ? 'Add Competitor' : 'Update Profile'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Profile Code *</label>
              <input
                value={form.profileCode}
                onChange={(e) => update('profileCode', e.target.value.toUpperCase())}
                maxLength={30}
                disabled={mode === 'edit'}
                className={cn(fc, 'font-mono', mode === 'edit' && 'opacity-60')}
                placeholder="e.g. FBN"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Country</label>
              <input value={form.country} onChange={(e) => update('country', e.target.value.toUpperCase())} maxLength={3} className={cn(fc, 'font-mono')} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Competitor Name *</label>
            <input value={form.competitorName} onChange={(e) => update('competitorName', e.target.value)} maxLength={200} className={fc} placeholder="e.g. First Bank of Nigeria" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Competitor Type *</label>
              <select value={form.competitorType} onChange={(e) => update('competitorType', e.target.value)} className={fc}>
                {COMPETITOR_TYPES.filter((t) => t !== 'ALL').map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Threat Level</label>
              <select value={form.threatLevel} onChange={(e) => update('threatLevel', e.target.value)} className={fc}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total Assets</label>
              <input type="number" step="0.01" value={form.totalAssets ?? ''} onChange={(e) => update('totalAssets', e.target.value ? parseFloat(e.target.value) : undefined)} className={fc} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total Deposits</label>
              <input type="number" step="0.01" value={form.totalDeposits ?? ''} onChange={(e) => update('totalDeposits', e.target.value ? parseFloat(e.target.value) : undefined)} className={fc} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total Loans</label>
              <input type="number" step="0.01" value={form.totalLoans ?? ''} onChange={(e) => update('totalLoans', e.target.value ? parseFloat(e.target.value) : undefined)} className={fc} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Branches</label>
              <input type="number" value={form.branchCount ?? ''} onChange={(e) => update('branchCount', e.target.value ? parseInt(e.target.value) : undefined)} className={fc} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Customers</label>
              <input type="number" value={form.customerCount ?? ''} onChange={(e) => update('customerCount', e.target.value ? parseInt(e.target.value) : undefined)} className={fc} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Market Share (%)</label>
              <input type="number" step="0.01" value={form.marketSharePct ?? ''} onChange={(e) => update('marketSharePct', e.target.value ? parseFloat(e.target.value) : undefined)} className={fc} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Strategic Response</label>
            <textarea value={form.strategicResponse ?? ''} onChange={(e) => update('strategicResponse', e.target.value || undefined)} rows={3} maxLength={2000} className={fc} placeholder="How should we respond strategically?" />
          </div>
          <div className="flex gap-2 pt-3 border-t">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create' ? 'Add Competitor' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Competitor Card ───────────────────────────────────────────────────────────

function CompetitorCard({
  competitor,
  onViewDetails,
  onEdit,
}: {
  competitor: CompetitorProfile;
  onViewDetails: () => void;
  onEdit: () => void;
}) {
  const threat = THREAT_CONFIG[competitor.threatLevel] ?? THREAT_CONFIG.MEDIUM;

  return (
    <div className="surface-card p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', threat.dot)} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{competitor.competitorName}</h3>
            <p className="text-xs text-muted-foreground">
              {competitor.competitorType.replace(/_/g, ' ')} &middot; {competitor.country}
            </p>
          </div>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
          competitor.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600',
        )}>
          {competitor.status}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Assets</p>
          <p className="text-sm font-bold tabular-nums">{formatCompact(competitor.totalAssets)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Market Share</p>
          <p className="text-sm font-bold tabular-nums">{competitor.marketSharePct != null ? `${competitor.marketSharePct}%` : '--'}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Branches</p>
          <p className="text-sm font-bold tabular-nums">{competitor.branchCount?.toLocaleString() ?? '--'}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Customers</p>
          <p className="text-sm font-bold tabular-nums">{formatCount(competitor.customerCount)}</p>
        </div>
      </div>

      {/* Threat Level */}
      <div className="flex items-center justify-between mb-4">
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', threat.bg, threat.color)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', threat.dot)} />
          Threat: {competitor.threatLevel}
        </span>
        {competitor.lastUpdatedDate && (
          <span className="text-[10px] text-muted-foreground">Updated {formatDate(competitor.lastUpdatedDate)}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t">
        <button
          onClick={onViewDetails}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors"
        >
          View Details
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors"
        >
          <Edit2 className="w-3 h-3" /> Update Profile
        </button>
      </div>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="surface-card p-5 animate-pulse">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-2/3 bg-muted rounded" />
          <div className="h-3 w-1/3 bg-muted rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-2.5 w-16 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="h-6 w-24 bg-muted rounded-full mb-4" />
      <div className="flex gap-2 pt-3 border-t">
        <div className="flex-1 h-7 bg-muted rounded-lg" />
        <div className="flex-1 h-7 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function CompetitorAnalysisPage() {
  useEffect(() => { document.title = 'Competitor Intelligence | CBS'; }, []);

  const [competitorType, setCompetitorType] = useState<string>('ALL');
  const [threatFilter, setThreatFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorProfile | null>(null);
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitorProfile | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: byTypeData = [], isLoading: loadingByType, isError: errorByType } = useCompetitorsByType(competitorType);
  const { data: byThreatData = [], isLoading: loadingByThreat } = useCompetitorsByThreat(threatFilter);

  // Merge: if threat filter is active, intersect with type results; otherwise use type results
  const competitors = useMemo(() => {
    if (threatFilter === 'ALL') return byTypeData;
    if (!byThreatData.length) return [];
    const threatCodes = new Set(byThreatData.map((c) => c.profileCode));
    return byTypeData.filter((c) => threatCodes.has(c.profileCode));
  }, [byTypeData, byThreatData, threatFilter]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return competitors;
    const q = searchQuery.toLowerCase();
    return competitors.filter(
      (c) =>
        c.competitorName.toLowerCase().includes(q) ||
        c.profileCode.toLowerCase().includes(q),
    );
  }, [competitors, searchQuery]);

  const isLoading = loadingByType || (threatFilter !== 'ALL' && loadingByThreat);

  return (
    <>
      <PageHeader
        title="Competitor Intelligence"
        subtitle="Monitor competitor profiles, market positioning, and threat levels"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Add Competitor
          </button>
        }
      />

      <div className="page-container space-y-4">
        {/* Threat Level Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">Threat:</span>
          {THREAT_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setThreatFilter(level)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                threatFilter === level
                  ? THREAT_PILL_STYLES[level]
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                threatFilter === level && 'ring-1 ring-current/20',
              )}
            >
              {level === 'ALL' ? 'All' : level}
            </button>
          ))}
        </div>

        {/* Competitor Type Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {COMPETITOR_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setCompetitorType(type)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors',
                competitorType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground',
              )}
            >
              {type === 'ALL' ? 'All Types' : type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search competitors..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Error State */}
        {errorByType && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load competitor data. Please try again later.
          </div>
        )}

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No competitors found"
            description="Try adjusting your filters or add a new competitor profile."
            action={{ label: 'Add Competitor', onClick: () => setShowCreate(true), icon: Plus }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <CompetitorCard
                key={c.id}
                competitor={c}
                onViewDetails={() => setSelectedCompetitor(c)}
                onEdit={() => setEditingCompetitor(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Slide-over */}
      {selectedCompetitor && (
        <CompetitorDetailPanel
          competitor={selectedCompetitor}
          onClose={() => setSelectedCompetitor(null)}
          onEdit={() => {
            setEditingCompetitor(selectedCompetitor);
            setSelectedCompetitor(null);
          }}
        />
      )}

      {/* Create Dialog */}
      {showCreate && (
        <CompetitorFormDialog mode="create" onClose={() => setShowCreate(false)} />
      )}

      {/* Edit Dialog */}
      {editingCompetitor && (
        <CompetitorFormDialog
          mode="edit"
          initial={editingCompetitor}
          onClose={() => setEditingCompetitor(null)}
        />
      )}
    </>
  );
}
