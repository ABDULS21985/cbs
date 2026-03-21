import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, TabsPage } from '@/components/shared';
import { CheckCircle2, AlertTriangle, Clock, BarChart3, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settlementApi, type SettlementInstruction } from '../api/settlementApi';
import { SettlementDashboardStrip } from '../components/settlement/SettlementDashboard';
import { InstructionTable } from '../components/settlement/InstructionTable';
import { InstructionForm } from '../components/settlement/InstructionForm';
import { SettlementBatchTable } from '../components/settlement/SettlementBatchTable';
import { FailedSettlementPanel } from '../components/settlement/FailedSettlementPanel';
import {
  SettlementRateChart,
  SettlementByDepositoryChart,
  TopFailingCounterpartiesTable,
  StpRateCard,
} from '../components/settlement/SettlementTimeline';
import { toast } from 'sonner';

const KEYS = {
  instructions: () => ['settlements', 'instructions'],
  batches: () => ['settlements', 'batches'],
  failed: () => ['settlements', 'failed'],
  dashboard: () => ['settlements', 'dashboard'],
};

// ── Instructions Tab ─────────────────────────────────────────────────────────

function InstructionsTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data = [], isLoading, isError } = useQuery({
    queryKey: KEYS.instructions(),
    queryFn: () => settlementApi.getInstructions(),
    staleTime: 30_000,
  });

  const createInstruction = useMutation({
    mutationFn: settlementApi.createInstruction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
      toast.success('Instruction created');
      setShowForm(false);
    },
  });

  const submitInstruction = useMutation({
    mutationFn: (ref: string) => settlementApi.submitInstruction(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
      toast.success('Instruction submitted');
    },
  });

  const recordResult = useMutation({
    mutationFn: (ref: string) => settlementApi.recordResult(ref, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
      toast.success('Settlement recorded');
    },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 btn-primary">
          <Plus className="w-4 h-4" /> New Instruction
        </button>
      </div>
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Settlement instructions could not be loaded from the backend.
        </div>
      )}
      <InstructionTable
        data={data}
        isLoading={isLoading}
        onSubmit={(instr) => submitInstruction.mutate(instr.ref)}
        onRecordResult={(instr) => recordResult.mutate(instr.ref)}
      />
      {showForm && (
        <InstructionForm
          onSubmit={(payload) => createInstruction.mutate(payload)}
          isPending={createInstruction.isPending}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ── Batches Tab ──────────────────────────────────────────────────────────────

function BatchesTab() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: KEYS.batches(),
    queryFn: () => settlementApi.getBatches(),
    staleTime: 30_000,
  });

  return (
    <div className="p-4">
      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Settlement batches could not be loaded from the backend.
        </div>
      )}
      <SettlementBatchTable data={data} isLoading={isLoading} />
    </div>
  );
}

// ── Failed Tab ───────────────────────────────────────────────────────────────

function FailedTab() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: KEYS.failed(),
    queryFn: () => settlementApi.getFailedSettlements(),
    staleTime: 30_000,
  });

  return (
    <div className="p-4">
      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed-settlement data could not be loaded from the backend.
        </div>
      )}
      <FailedSettlementPanel
        data={data}
        isLoading={isLoading}
        onResubmit={(item) => toast.info(`Resubmitting ${item.instructionRef}...`)}
        onCancel={(item) => toast.info(`Cancelling ${item.instructionRef}...`)}
        onEscalate={(item) => toast.info(`Escalating ${item.instructionRef}...`)}
      />
    </div>
  );
}

// ── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: KEYS.dashboard(),
    queryFn: () => settlementApi.getDashboard(),
    staleTime: 60_000,
  });

  return (
    <div className="p-4 space-y-6">
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Settlement dashboard analytics could not be loaded from the backend.
        </div>
      )}
      <StpRateCard data={data} isLoading={isLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SettlementRateChart data={data} isLoading={isLoading} />
        <SettlementByDepositoryChart data={data} isLoading={isLoading} />
      </div>
      <TopFailingCounterpartiesTable data={data} isLoading={isLoading} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SettlementPage() {
  const { data: dashData, isError: dashError } = useQuery({
    queryKey: KEYS.dashboard(),
    queryFn: () => settlementApi.getDashboard(),
    staleTime: 60_000,
  });
  const { data: failed = [], isError: failedError } = useQuery({
    queryKey: KEYS.failed(),
    queryFn: () => settlementApi.getFailedSettlements(),
    staleTime: 30_000,
  });

  return (
    <>
      <PageHeader
        title="Settlement"
        subtitle="Settlement instructions, batching, failed settlement management, and analytics"
      />
      <div className="page-container space-y-6">
        {(dashError || failedError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            One or more settlement datasets could not be loaded from the backend.
          </div>
        )}
        {/* Real-time dashboard strip */}
        <SettlementDashboardStrip data={dashData} isLoading={!dashData} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Today" value={dashError ? '--' : dashData?.totalToday ?? 0} format="number" icon={BarChart3} />
          <StatCard label="Settled" value={dashError ? '--' : dashData?.settled ?? 0} format="number" icon={CheckCircle2} />
          <StatCard label="Pending" value={dashError ? '--' : dashData?.pending ?? 0} format="number" icon={Clock} />
          <StatCard label="Failed" value={dashError ? '--' : dashData?.failed ?? 0} format="number" icon={AlertTriangle} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              { id: 'instructions', label: 'Instructions', content: <InstructionsTab /> },
              { id: 'batches', label: 'Batches', content: <BatchesTab /> },
              {
                id: 'failed',
                label: 'Failed',
                badge: failed.length || undefined,
                content: <FailedTab />,
              },
              { id: 'dashboard', label: 'Dashboard', content: <DashboardTab /> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
