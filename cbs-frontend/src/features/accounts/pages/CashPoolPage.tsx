import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Layers, ChevronDown, ChevronUp, Settings2, History } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { PoolStructureTree } from '../components/cashpool/PoolStructureTree';
import { SweepHistoryTable } from '../components/cashpool/SweepHistoryTable';
import { SweepConfigForm } from '../components/cashpool/SweepConfigForm';
import { InterestBenefitCalculator } from '../components/cashpool/InterestBenefitCalculator';
import {
  getCashPools,
  getSweepHistory,
  createCashPool,
  updateParticipant,
  type CashPool,
  type CashPoolParticipant,
} from '../api/cashPoolApi';

// ── New Pool dialog form ──────────────────────────────────────────────────────

const newPoolSchema = z.object({
  name: z.string().min(3, 'Pool name is required'),
  headerAccountNumber: z.string().min(10, 'Account number must be at least 10 digits'),
  headerAccountName: z.string().min(2, 'Account name is required'),
});

type NewPoolFormData = z.infer<typeof newPoolSchema>;

interface NewPoolDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

function NewPoolDialog({ onClose, onSuccess }: NewPoolDialogProps) {
  const createMutation = useMutation({
    mutationFn: createCashPool,
    onSuccess,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPoolFormData>({
    resolver: zodResolver(newPoolSchema),
  });

  const onSubmit = (data: NewPoolFormData) => {
    createMutation.mutate({
      name: data.name,
      headerAccount: {
        id: `hdr-${Date.now()}`,
        number: data.headerAccountNumber,
        name: data.headerAccountName,
        balance: 0,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold">New Cash Pool</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Pool Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Corporate Treasury Pool"
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50',
                errors.name && 'border-red-500',
              )}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Header Account Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('headerAccountNumber')}
              placeholder="10-digit account number"
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                errors.headerAccountNumber && 'border-red-500',
              )}
            />
            {errors.headerAccountNumber && (
              <p className="text-xs text-red-600">{errors.headerAccountNumber.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Header Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('headerAccountName')}
              placeholder="e.g. Group Treasury Account"
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50',
                errors.headerAccountName && 'border-red-500',
              )}
            />
            {errors.headerAccountName && (
              <p className="text-xs text-red-600">{errors.headerAccountName.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {createMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Pool
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Participant Slide-out panel ───────────────────────────────────────────────

interface ParticipantPanelProps {
  participant: CashPoolParticipant;
  onClose: () => void;
  onSaved: () => void;
}

function ParticipantPanel({ participant, onClose, onSaved }: ParticipantPanelProps) {
  const saveMutation = useMutation({
    mutationFn: (data: Partial<CashPoolParticipant>) =>
      updateParticipant(participant.poolId, participant.id, data),
    onSuccess: onSaved,
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Settings2 className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Sweep Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {saveMutation.isSuccess && (
            <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 px-4 py-3">
              <p className="text-sm text-green-700 dark:text-green-400">
                Sweep configuration saved successfully.
              </p>
            </div>
          )}
          <SweepConfigForm
            participant={participant}
            onSave={(data) => saveMutation.mutate(data as Partial<CashPoolParticipant>)}
            onCancel={onClose}
          />
        </div>
      </div>
    </>
  );
}

// ── Pool Card ─────────────────────────────────────────────────────────────────

interface PoolCardProps {
  pool: CashPool;
  onParticipantClick: (participant: CashPoolParticipant) => void;
}

function PoolCard({ pool, onParticipantClick }: PoolCardProps) {
  const [showSweepHistory, setShowSweepHistory] = useState(false);

  const { data: sweeps = [], isLoading: sweepsLoading } = useQuery({
    queryKey: ['sweep-history', pool.id],
    queryFn: () => getSweepHistory(pool.id),
    enabled: showSweepHistory,
  });

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Pool header */}
      <div className="px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">{pool.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {new Date(pool.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            ACTIVE
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Structure tree + Calculator side by side on larger screens */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Pool Structure
            </div>
            <PoolStructureTree
              pool={pool}
              onParticipantClick={(participantId) => {
                const p = pool.participants.find((x) => x.id === participantId);
                if (p) onParticipantClick(p);
              }}
            />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Interest Calculator
            </div>
            <InterestBenefitCalculator totalBalance={pool.totalBalance} />
          </div>
        </div>

        {/* Sweep History toggle */}
        <div>
          <button
            onClick={() => setShowSweepHistory((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-4 h-4" />
            Sweep History
            {showSweepHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showSweepHistory && (
            <div className="mt-3">
              {sweepsLoading ? (
                <div className="h-32 rounded-lg bg-muted animate-pulse" />
              ) : (
                <SweepHistoryTable sweeps={sweeps} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CashPoolPage() {
  const queryClient = useQueryClient();
  const [showNewPoolDialog, setShowNewPoolDialog] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<CashPoolParticipant | null>(null);

  const { data: pools = [], isLoading } = useQuery({
    queryKey: ['cash-pools'],
    queryFn: getCashPools,
  });

  const handlePoolCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-pools'] });
    setShowNewPoolDialog(false);
  };

  const handleParticipantSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-pools'] });
    setTimeout(() => setSelectedParticipant(null), 1500);
  };

  // Summary stats
  const totalPools = pools.length;
  const totalBalance = pools.reduce((s, p) => s + p.totalBalance, 0);
  const totalParticipants = pools.reduce((s, p) => s + p.participants.filter((x) => x.status === 'ACTIVE').length, 0);
  const totalInterestBenefit = pools.reduce((s, p) => s + p.interestBenefit, 0);

  return (
    <div>
      <PageHeader
        title="Cash Pooling"
        subtitle="Manage notional and physical cash pooling arrangements"
        actions={
          <button
            onClick={() => setShowNewPoolDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Pool
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Total Pools</div>
            <div className="stat-value">{totalPools}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Participants</div>
            <div className="stat-value">{totalParticipants}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Pool Balance</div>
            <div className="stat-value text-sm">
              ₦{(totalBalance / 1e9).toFixed(2)}B
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Monthly Interest Benefit</div>
            <div className="stat-value text-green-600 text-sm">
              +₦{(totalInterestBenefit / 1e6).toFixed(2)}M
            </div>
          </div>
        </div>

        {/* Pool cards */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-96 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : pools.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center">
            <Layers className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No cash pools configured yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new pool to start managing cash concentration.
            </p>
            <button
              onClick={() => setShowNewPoolDialog(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Pool
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {pools.map((pool) => (
              <PoolCard
                key={pool.id}
                pool={pool}
                onParticipantClick={setSelectedParticipant}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Pool Dialog */}
      {showNewPoolDialog && (
        <NewPoolDialog
          onClose={() => setShowNewPoolDialog(false)}
          onSuccess={handlePoolCreated}
        />
      )}

      {/* Participant Sweep Config Slide-out Panel */}
      {selectedParticipant && (
        <ParticipantPanel
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
          onSaved={handleParticipantSaved}
        />
      )}
    </div>
  );
}
