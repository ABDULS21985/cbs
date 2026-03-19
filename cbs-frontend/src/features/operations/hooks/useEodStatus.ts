import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { eodApi, type EodRun, type EodStep, type EodLogEntry, type EodScheduleConfig } from '../api/eodApi';

interface UseEodStatusReturn {
  currentRun: EodRun | null;
  isRunning: boolean;
  steps: EodStep[];
  logs: EodLogEntry[];
  schedule: EodScheduleConfig | null;
  isLoadingStatus: boolean;
  isLoadingLogs: boolean;
  isTriggeringEod: boolean;
  isRetryingStep: boolean;
  isSkippingStep: boolean;
  isRollingBack: boolean;
  isSavingSchedule: boolean;
  triggerEod: (businessDate: string) => Promise<void>;
  retryStep: (stepId: string) => Promise<void>;
  skipStep: (stepId: string, reason: string) => Promise<void>;
  rollbackRun: () => Promise<void>;
  saveSchedule: (config: EodScheduleConfig) => Promise<void>;
}

const MAX_LOG_ENTRIES = 200;

export function useEodStatus(): UseEodStatusReturn {
  const [currentRun, setCurrentRun] = useState<EodRun | null>(null);
  const [steps, setSteps] = useState<EodStep[]>([]);
  const [logs, setLogs] = useState<EodLogEntry[]>([]);
  const [schedule, setSchedule] = useState<EodScheduleConfig | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isTriggeringEod, setIsTriggeringEod] = useState(false);
  const [isRetryingStep, setIsRetryingStep] = useState(false);
  const [isSkippingStep, setIsSkippingStep] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const logCursorRef = useRef<string | undefined>(undefined);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRunRef = useRef<EodRun | null>(null);

  currentRunRef.current = currentRun;

  const fetchLogs = useCallback(async (runId: string) => {
    setIsLoadingLogs(true);
    try {
      const result = await eodApi.getLogs(runId, logCursorRef.current);
      if (result.entries.length > 0) {
        logCursorRef.current = result.nextCursor;
        setLogs((prev) => {
          const combined = [...prev, ...result.entries];
          return combined.slice(-MAX_LOG_ENTRIES);
        });
      }
    } catch {
      // silent
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const run = await eodApi.getCurrentStatus();
      setCurrentRun(run);
      setSteps(run.steps);
      if (run.id && run.status === 'RUNNING') {
        await fetchLogs(run.id);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingStatus(false);
    }
  }, [fetchLogs]);

  const scheduleNextPoll = useCallback(() => {
    if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    const isRunning = currentRunRef.current?.status === 'RUNNING';
    const delay = isRunning ? 5_000 : 30_000;
    pollingTimerRef.current = setTimeout(async () => {
      await fetchStatus();
      scheduleNextPoll();
    }, delay);
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus().then(() => scheduleNextPoll());
    eodApi.getScheduleConfig().then(setSchedule).catch(() => {});
    return () => {
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    };
  }, [fetchStatus, scheduleNextPoll]);

  const triggerEod = useCallback(async (businessDate: string) => {
    setIsTriggeringEod(true);
    try {
      const run = await eodApi.triggerEod(businessDate);
      setCurrentRun(run);
      setSteps(run.steps);
      setLogs([]);
      logCursorRef.current = undefined;
      toast.success(`EOD run started for ${businessDate}`);
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
      scheduleNextPoll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to trigger EOD');
    } finally {
      setIsTriggeringEod(false);
    }
  }, [scheduleNextPoll]);

  const retryStep = useCallback(async (stepId: string) => {
    if (!currentRunRef.current) return;
    setIsRetryingStep(true);
    try {
      await eodApi.retryStep(currentRunRef.current.id, stepId);
      toast.success('Step retry initiated');
      await fetchStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to retry step');
    } finally {
      setIsRetryingStep(false);
    }
  }, [fetchStatus]);

  const skipStep = useCallback(async (stepId: string, reason: string) => {
    if (!currentRunRef.current) return;
    setIsSkippingStep(true);
    try {
      await eodApi.skipStep(currentRunRef.current.id, stepId, reason);
      toast.success('Step skipped');
      await fetchStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to skip step');
    } finally {
      setIsSkippingStep(false);
    }
  }, [fetchStatus]);

  const rollbackRun = useCallback(async () => {
    if (!currentRunRef.current) return;
    setIsRollingBack(true);
    try {
      await eodApi.rollbackRun(currentRunRef.current.id);
      toast.success('EOD run rolled back successfully');
      await fetchStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to rollback EOD run');
    } finally {
      setIsRollingBack(false);
    }
  }, [fetchStatus]);

  const saveSchedule = useCallback(async (config: EodScheduleConfig) => {
    setIsSavingSchedule(true);
    try {
      const saved = await eodApi.saveScheduleConfig(config);
      setSchedule(saved);
      toast.success('Schedule configuration saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save schedule');
    } finally {
      setIsSavingSchedule(false);
    }
  }, []);

  const isRunning = currentRun?.status === 'RUNNING';

  return {
    currentRun,
    isRunning,
    steps,
    logs,
    schedule,
    isLoadingStatus,
    isLoadingLogs,
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
  };
}
