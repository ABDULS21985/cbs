import { useState } from 'react';
import { Shield, Clock, AlertOctagon, CheckCircle2, Database, Play, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import {
  useSanctionsStats,
  usePendingMatches,
  useSanctionsMatch,
  useWatchlists,
} from '../hooks/useSanctions';
import { useSanctionsScreen } from '../hooks/useRiskExt';
import { SanctionsStatsCards } from '../components/sanctions/SanctionsStatsCards';
import { PendingMatchTable } from '../components/sanctions/PendingMatchTable';
import { FalsePositiveLog } from '../components/sanctions/FalsePositiveLog';
import { WatchlistManagementTable } from '../components/sanctions/WatchlistManagementTable';
import { BatchScreeningPanel } from '../components/sanctions/BatchScreeningPanel';
import { MatchReviewPanel } from '../components/sanctions/MatchReviewPanel';
import type { SanctionsMatch } from '../types/sanctions';

// ─── Manual Screening Modal ─────────────────────────────────────────────────────

type ScreeningType = 'ONBOARDING' | 'TRANSACTION' | 'PERIODIC_REVIEW' | 'AD_HOC';
type SubjectType = 'INDIVIDUAL' | 'ENTITY';

interface ManualScreeningForm {
  screeningType: ScreeningType;
  subjectName: string;
  subjectType: SubjectType;
  subjectDob: string;
  nationality: string;
  idNumber: string;
  customerId: string;
  transactionRef: string;
}

const INITIAL_FORM: ManualScreeningForm = {
  screeningType: 'AD_HOC',
  subjectName: '',
  subjectType: 'INDIVIDUAL',
  subjectDob: '',
  nationality: '',
  idNumber: '',
  customerId: '',
  transactionRef: '',
};

function ManualScreeningModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<ManualScreeningForm>(INITIAL_FORM);
  const screenMutation = useSanctionsScreen();

  const update = <K extends keyof ManualScreeningForm>(field: K, value: ManualScreeningForm[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subjectName.trim()) return;

    try {
      const payload: Record<string, unknown> = {
        screeningType: form.screeningType,
        subjectName: form.subjectName.trim(),
        subjectType: form.subjectType,
      };
      if (form.subjectType === 'INDIVIDUAL' && form.subjectDob) payload.subjectDob = form.subjectDob;
      if (form.nationality) payload.subjectNationality = form.nationality;
      if (form.idNumber) payload.subjectIdNumber = form.idNumber;
      if (form.customerId) payload.customerId = Number(form.customerId);
      if (form.transactionRef) payload.transactionRef = form.transactionRef;

      const result = await screenMutation.mutateAsync(payload);
      const totalMatches = result?.totalMatches ?? 0;

      if (totalMatches > 0) {
        toast.warning(`Screening complete: ${totalMatches} potential match${totalMatches > 1 ? 'es' : ''} found for "${form.subjectName}"`);
      } else {
        toast.success(`Screening complete: No matches found for "${form.subjectName}"`);
      }

      setForm(INITIAL_FORM);
      onClose();
    } catch {
      toast.error('Screening failed. Please try again.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background rounded-xl shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div>
            <h2 className="text-base font-semibold">Screen Name</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manually screen a name or entity against watchlists</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Screening Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Screening Type
            </label>
            <select
              value={form.screeningType}
              onChange={(e) => update('screeningType', e.target.value as ScreeningType)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ONBOARDING">Onboarding</option>
              <option value="TRANSACTION">Transaction</option>
              <option value="PERIODIC_REVIEW">Periodic Review</option>
              <option value="AD_HOC">Ad Hoc</option>
            </select>
          </div>

          {/* Subject Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Full name or entity name"
              value={form.subjectName}
              onChange={(e) => update('subjectName', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Subject Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Subject Type
            </label>
            <select
              value={form.subjectType}
              onChange={(e) => update('subjectType', e.target.value as SubjectType)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="ENTITY">Entity</option>
            </select>
          </div>

          {/* Date of Birth — only for INDIVIDUAL */}
          {form.subjectType === 'INDIVIDUAL' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={form.subjectDob}
                onChange={(e) => update('subjectDob', e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Nationality */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Nationality
            </label>
            <input
              type="text"
              placeholder="e.g. US, GB, DE"
              value={form.nationality}
              onChange={(e) => update('nationality', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* ID Number */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              ID / Passport Number
            </label>
            <input
              type="text"
              placeholder="Optional identifier"
              value={form.idNumber}
              onChange={(e) => update('idNumber', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={screenMutation.isPending || !form.subjectName.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {screenMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Screening...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Screen
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function SanctionsScreeningPage() {
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [screeningOpen, setScreeningOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useSanctionsStats();
  const { data: pendingData, isLoading: pendingLoading } = usePendingMatches({ status: 'PENDING' });
  const { data: confirmedData, isLoading: confirmedLoading } = usePendingMatches({ status: 'CONFIRMED_HIT' });
  const { data: fpData, isLoading: fpLoading } = usePendingMatches({ status: 'FALSE_POSITIVE' });
  const { data: selectedMatch } = useSanctionsMatch(selectedMatchId);
  const { data: watchlists, isLoading: watchlistsLoading } = useWatchlists();

  const pendingMatches = pendingData?.items ?? [];
  const confirmedMatches = confirmedData?.items ?? [];
  const falsePositives = fpData?.items ?? [];

  const handleRowClick = (match: SanctionsMatch) => {
    setSelectedMatchId(match.id);
  };

  const handleMatchReviewClose = () => {
    setSelectedMatchId(null);
  };

  const tabs = [
    {
      id: 'pending-review',
      label: 'Pending Review',
      icon: Clock,
      badge: pendingMatches.length,
      content: (
        <div className="p-6">
          <PendingMatchTable
            data={pendingMatches}
            isLoading={pendingLoading}
            onRowClick={handleRowClick}
          />
        </div>
      ),
    },
    {
      id: 'confirmed-hits',
      label: 'Confirmed Hits',
      icon: AlertOctagon,
      badge: confirmedMatches.length,
      content: (
        <div className="p-6">
          <PendingMatchTable
            data={confirmedMatches}
            isLoading={confirmedLoading}
            onRowClick={handleRowClick}
          />
        </div>
      ),
    },
    {
      id: 'false-positives',
      label: 'False Positives',
      icon: CheckCircle2,
      content: (
        <div className="p-6">
          <FalsePositiveLog data={falsePositives} isLoading={fpLoading} />
        </div>
      ),
    },
    {
      id: 'watchlists',
      label: 'Watchlists',
      icon: Database,
      content: (
        <div className="p-6">
          <WatchlistManagementTable
            watchlists={watchlists ?? []}
            isLoading={watchlistsLoading}
          />
        </div>
      ),
    },
    {
      id: 'batch-screening',
      label: 'Batch Screening',
      icon: Play,
      content: (
        <BatchScreeningPanel onMatchClick={handleRowClick} />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Sanctions Screening"
        subtitle="Monitor and review sanctions watchlist matches"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScreeningOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Screen Name
            </button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Shield className="w-3.5 h-3.5" />
              Live Screening Active
            </div>
          </div>
        }
      />

      <SanctionsStatsCards stats={stats} isLoading={statsLoading} />

      <TabsPage tabs={tabs} syncWithUrl />

      {/* Match review overlay */}
      {selectedMatchId !== null && selectedMatch && (
        <MatchReviewPanel
          match={selectedMatch}
          onClose={handleMatchReviewClose}
        />
      )}

      {/* Manual screening modal */}
      <ManualScreeningModal open={screeningOpen} onClose={() => setScreeningOpen(false)} />
    </div>
  );
}
