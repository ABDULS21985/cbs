import { useState } from 'react';
import { Play, Settings, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/shared';
import { useEodStatus } from '../hooks/useEodStatus';
import { EodStatusBanner } from '../components/eod/EodStatusBanner';
import { EodStepPipeline } from '../components/eod/EodStepPipeline';
import { EodErrorPanel } from '../components/eod/EodErrorPanel';
import { EodLiveLog } from '../components/eod/EodLiveLog';
import { EodHistoryTable } from '../components/eod/EodHistoryTable';
import { EodDurationTrendChart } from '../components/eod/EodDurationTrendChart';
import { EodScheduleConfig } from '../components/eod/EodScheduleConfig';
import { useQuery } from '@tanstack/react-query';
import { eodApi, type EodStep } from '../api/eodApi';
import { formatDate } from '@/lib/formatters';

export function EodConsolePage() {
  const {
    currentRun,
    isRunning,
    steps,
    logs,
    schedule,
    isLoadingStatus,
    isTriggeringEod,
    isRetryingStep,
    isSkippingStep,
    isRollingBack,
    isSavingSchedule,
    triggerEod,
    retryStep,
    skipStep,
    rollbackRun,
    saveSchedule,
  } = useEodStatus();

  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [showScheduleConfig, setShowScheduleConfig] = useState(false);
  const [selectedFailedStep, setSelectedFailedStep] = useState<EodStep | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const businessDate = currentRun?.businessDate ?? todayStr;

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['eod', 'history'],
    queryFn: () => eodApi.getHistory({ pageSize: 30 }),
    staleTime: 60_000,
  });

  const { data: durationTrend } = useQuery({
    queryKey: ['eod', 'duration-trend'],
    queryFn: () => eodApi.getDurationTrend(30),
    staleTime: 60_000,
  });

  const failedStep = steps.find((s) => s.status === 'FAILED') ?? null;

  const handleStepClick = (step: EodStep) => {
    if (step.status === 'FAILED') {
      setSelectedFailedStep(step);
    }
  };

  const handleRetry = async () => {
    if (!selectedFailedStep) return;
    await retryStep(selectedFailedStep.id);
    setSelectedFailedStep(null);
  };

  const handleSkip = async (reason: string) => {
    if (!selectedFailedStep) return;
    await skipStep(selectedFailedStep.id, reason);
    setSelectedFailedStep(null);
  };

  const handleRollback = async () => {
    await rollbackRun();
    setSelectedFailedStep(null);
  };

  const activeErrorStep = selectedFailedStep ?? failedStep;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="End of Day Processing"
        subtitle={`Business Date: ${formatDate(businessDate)}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScheduleConfig(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4" />
              Schedule Config
            </button>
            <button
              onClick={() => setShowTriggerDialog(true)}
              disabled={isRunning || isTriggeringEod}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              {isTriggeringEod ? 'Starting...' : 'Run EOD'}
            </button>
          </div>
        }
      />

      <div className="px-6 py-4 space-y-6">
        {isLoadingStatus ? (
          <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
        ) : (
          <EodStatusBanner run={currentRun} schedule={schedule} />
        )}

        {steps.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pipeline Progress
            </h2>
            <div className="rounded-xl border bg-card p-4">
              <EodStepPipeline steps={steps} onStepClick={handleStepClick} />
            </div>
          </section>
        )}

        {activeErrorStep && currentRun && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-red-600 uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4" />
              Step Error
            </h2>
            <EodErrorPanel
              step={activeErrorStep}
              runId={currentRun.id}
              onRetry={handleRetry}
              onSkip={handleSkip}
              onRollback={handleRollback}
              isRetrying={isRetryingStep}
              isSkipping={isSkippingStep}
              isRollingBack={isRollingBack}
            />
          </section>
        )}

        {(isRunning || logs.length > 0) && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Live Log
            </h2>
            <EodLiveLog logs={logs} isLive={isRunning} />
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            History & Trends
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold">Run History (Last 30 Days)</h3>
              <EodHistoryTable data={history ?? []} isLoading={historyLoading} />
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold">Duration Trend</h3>
              <EodDurationTrendChart data={durationTrend ?? []} />
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={showTriggerDialog}
        onClose={() => setShowTriggerDialog(false)}
        onConfirm={async () => {
          setShowTriggerDialog(false);
          await triggerEod(todayStr);
        }}
        title="Run End of Day Processing"
        description={`This will start the EOD processing run for business date ${formatDate(todayStr)}. Ensure all branches have signed off before proceeding.`}
        confirmLabel="Start EOD Run"
        isLoading={isTriggeringEod}
      />

      <EodScheduleConfig
        open={showScheduleConfig}
        onClose={() => setShowScheduleConfig(false)}
        config={schedule}
        onSave={saveSchedule}
        isSaving={isSavingSchedule}
      />
    </div>
  );
}
