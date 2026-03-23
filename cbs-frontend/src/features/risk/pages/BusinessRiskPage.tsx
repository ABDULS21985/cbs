import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Plus, CheckCircle2, AlertTriangle, Clock, Search, Filter, X,
  Loader2, ChevronRight, Target, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { businessRiskApi } from '../api/businessRiskApi';
import {
  useBusinessRiskByDomain,
  useBusinessRiskByRating,
  useCreateBusinessRiskAssessment,
  useCompleteBusinessRiskAssessment,
  RISK_EXT_KEYS,
} from '../hooks/useRiskExt';
import type { BusinessRiskAssessment } from '../types/businessRisk';

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_DOMAINS = [
  'STRATEGIC', 'REPUTATIONAL', 'BUSINESS_MODEL', 'COMPETITIVE', 'REGULATORY_CHANGE',
  'TECHNOLOGY', 'TALENT', 'ESG', 'GEOPOLITICAL', 'PANDEMIC',
] as const;

const RISK_RATINGS = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'CRITICAL'] as const;
const CONTROL_EFFECTIVENESS = ['STRONG', 'ADEQUATE', 'WEAK', 'INEFFECTIVE'] as const;
const STATUSES = ['DRAFT', 'COMPLETED', 'REVIEWED', 'ACCEPTED', 'ESCALATED'] as const;

const RATING_COLORS: Record<string, string> = {
  LOW: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  MODERATE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  HIGH: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  VERY_HIGH: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  CRITICAL: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

const APPETITE_COLORS: Record<string, string> = {
  WITHIN: 'text-green-600 dark:text-green-400',
  APPROACHING: 'text-amber-600 dark:text-amber-400',
  EXCEEDED: 'text-red-600 dark:text-red-400',
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  DRAFT: Clock,
  COMPLETED: CheckCircle2,
  REVIEWED: Target,
  ACCEPTED: CheckCircle2,
  ESCALATED: AlertTriangle,
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Create Assessment Modal ─────────────────────────────────────────────────

function CreateAssessmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMutation = useCreateBusinessRiskAssessment();

  const [form, setForm] = useState({
    assessmentName: '',
    riskDomain: 'STRATEGIC',
    assessor: '',
    inherentRiskScore: 5,
    controlEffectiveness: 'ADEQUATE',
    residualRiskScore: 3,
    riskRating: 'LOW',
    description: '',
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      assessmentDate: new Date().toISOString().slice(0, 10),
    }, {
      onSuccess: () => { toast.success('Assessment created'); onClose(); },
      onError: () => { toast.error('Failed to create assessment'); },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto surface-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">New Business Risk Assessment</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Assessment Name</label>
            <input required value={form.assessmentName} onChange={(e) => setForm({ ...form, assessmentName: e.target.value })}
              placeholder="e.g. Q1 2026 Strategic Risk Review" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Risk Domain</label>
              <select value={form.riskDomain} onChange={(e) => setForm({ ...form, riskDomain: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                {RISK_DOMAINS.map((d) => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assessor</label>
              <input value={form.assessor} onChange={(e) => setForm({ ...form, assessor: e.target.value })}
                placeholder="Assessor name" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Inherent Risk (1-25)</label>
              <input type="number" min={1} max={25} required value={form.inherentRiskScore}
                onChange={(e) => setForm({ ...form, inherentRiskScore: parseInt(e.target.value) || 1 })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Control Effectiveness</label>
              <select value={form.controlEffectiveness} onChange={(e) => setForm({ ...form, controlEffectiveness: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                {CONTROL_EFFECTIVENESS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Residual Risk (1-25)</label>
              <input type="number" min={1} max={25} required value={form.residualRiskScore}
                onChange={(e) => setForm({ ...form, residualRiskScore: parseInt(e.target.value) || 1 })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Risk Rating</label>
            <select value={form.riskRating} onChange={(e) => setForm({ ...form, riskRating: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              {RISK_RATINGS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Assessment scope and key findings" className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none" />
          </div>
          {createMutation.isError && <p className="text-xs text-destructive">Failed to create assessment.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Assessment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assessment Card ─────────────────────────────────────────────────────────

function AssessmentCard({ assessment, onComplete, isAdmin }: { assessment: BusinessRiskAssessment; onComplete: (code: string) => void; isAdmin: boolean }) {
  const ratingStyle = RATING_COLORS[assessment.riskRating] || RATING_COLORS.MODERATE;
  const appetiteStyle = APPETITE_COLORS[assessment.riskAppetiteStatus] || '';
  const StatusIcon = STATUS_ICONS[assessment.status] || Clock;

  return (
    <div className="surface-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{assessment.assessmentName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{assessment.riskDomain.replace(/_/g, ' ')} · {assessment.assessor || '—'}</p>
        </div>
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', ratingStyle)}>
          {assessment.riskRating.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Inherent</p>
          <p className="text-lg font-bold">{assessment.inherentRiskScore}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Controls</p>
          <p className="text-xs font-medium mt-1">{assessment.controlEffectiveness || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Residual</p>
          <p className="text-lg font-bold">{assessment.residualRiskScore}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <StatusIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{assessment.status}</span>
          {assessment.riskAppetiteStatus && (
            <span className={cn('ml-2 font-medium', appetiteStyle)}>
              {assessment.riskAppetiteStatus.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        {isAdmin && assessment.status === 'DRAFT' && (
          <button type="button" onClick={() => onComplete(assessment.assessmentCode)}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
            <CheckCircle2 className="w-3 h-3" /> Complete
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{formatDate(assessment.assessmentDate)}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function BusinessRiskPage() {
  const { isAdmin } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'domain' | 'rating'>('domain');
  const [selectedDomain, setSelectedDomain] = useState('STRATEGIC');
  const [selectedRating, setSelectedRating] = useState('HIGH');

  const domainQuery = useBusinessRiskByDomain(selectedDomain);
  const ratingQuery = useBusinessRiskByRating(viewMode === 'rating' ? selectedRating : '');
  const completeMutation = useCompleteBusinessRiskAssessment();

  const assessments = viewMode === 'domain' ? (domainQuery.data ?? []) : (ratingQuery.data ?? []);
  const isLoading = viewMode === 'domain' ? domainQuery.isLoading : ratingQuery.isLoading;

  // Stats
  const totalCount = assessments.length;
  const draftCount = assessments.filter((a) => a.status === 'DRAFT').length;
  const exceededCount = assessments.filter((a) => a.riskAppetiteStatus === 'EXCEEDED').length;
  const avgResidual = totalCount > 0 ? (assessments.reduce((s, a) => s + a.residualRiskScore, 0) / totalCount).toFixed(1) : '—';

  return (
    <>
      <PageHeader
        title="Business Risk Assessments"
        subtitle="Strategic, reputational, and business model risk assessment management"
        actions={isAdmin ? (
          <button type="button" onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Assessment
          </button>
        ) : undefined}
      />

      <div className="px-6 space-y-6 pb-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Assessments', value: String(totalCount), icon: Shield, accent: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            { label: 'Draft', value: String(draftCount), icon: Clock, accent: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
            { label: 'Exceeded Appetite', value: String(exceededCount), icon: AlertTriangle, accent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
            { label: 'Avg Residual Score', value: avgResidual, icon: TrendingUp, accent: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="surface-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', s.accent)}>
                  <s.icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* View Toggle + Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button type="button" onClick={() => setViewMode('domain')}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'domain' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              By Domain
            </button>
            <button type="button" onClick={() => setViewMode('rating')}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'rating' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              By Rating
            </button>
          </div>

          {viewMode === 'domain' && (
            <select value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm">
              {RISK_DOMAINS.map((d) => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
            </select>
          )}

          {viewMode === 'rating' && (
            <select value={selectedRating} onChange={(e) => setSelectedRating(e.target.value)}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm">
              {RISK_RATINGS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          )}

          <span className="ml-auto text-xs text-muted-foreground">{totalCount} assessment(s)</span>
        </div>

        {/* Assessment Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : assessments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No assessments found for this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assessments.map((a) => (
              <AssessmentCard key={a.id} assessment={a} isAdmin={isAdmin} onComplete={(code) => completeMutation.mutate(code, {
                onSuccess: () => { toast.success('Assessment completed'); },
                onError: () => { toast.error('Failed to complete assessment'); },
              })} />
            ))}
          </div>
        )}
      </div>

      <CreateAssessmentModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
