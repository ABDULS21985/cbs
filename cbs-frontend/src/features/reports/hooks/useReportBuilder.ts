import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reportBuilderApi, type DataSource, type DataField, type ReportColumn, type ReportFilter, type ReportConfig, type ReportResult, type SavedReport, type ScheduleType, type VisualizationType } from '../api/reportBuilderApi';

export interface SaveFormData {
  name: string;
  description: string;
  schedule: ScheduleType;
  savedTo: 'MY_REPORTS' | 'SHARED' | 'DEPARTMENT';
  deliveryEmails?: string[];
  exportFormat?: 'PDF' | 'EXCEL' | 'CSV';
  scheduleTime?: string;
  scheduleDay?: string;
  saveToDocumentLibrary?: boolean;
}

const DEFAULT_CONFIG: ReportConfig = {
  dataSources: [],
  columns: [],
  filters: [],
  groupBy: [],
  sortBy: undefined,
  sortDir: 'ASC',
  limit: 1000,
  visualization: 'TABLE',
  chartConfig: {},
};

export function useReportBuilder(editReport?: SavedReport) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [config, setConfig] = useState<ReportConfig>(editReport?.config ?? DEFAULT_CONFIG);
  const [previewData, setPreviewData] = useState<ReportResult | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [andOr, setAndOr] = useState<'AND' | 'OR'>('AND');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: dataSources = [], isError: dataSourcesError } = useQuery({
    queryKey: ['report-builder', 'data-sources'],
    queryFn: () => reportBuilderApi.getDataSources(),
    staleTime: 10 * 60 * 1000,
  });

  const selectedSources: DataSource[] = dataSources.filter((s) => config.dataSources.includes(s.id));

  const availableFields: DataField[] = selectedSources.flatMap((s) => s.fields);

  const fetchPreview = useCallback(async (cfg: ReportConfig) => {
    if (cfg.columns.length === 0) {
      setPreviewData(null);
      setPreviewError(null);
      return;
    }
    setIsFetchingPreview(true);
    setPreviewError(null);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const result = await reportBuilderApi.generatePreview(cfg);
      setPreviewData(result);
    } catch {
      setPreviewData(null);
      setPreviewError('Preview could not be generated from the backend.');
    } finally {
      setIsFetchingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPreview(config);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [config, fetchPreview]);

  const setStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setCurrentStep(step);
  }, []);

  const updateConfig = useCallback((partial: Partial<ReportConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const addColumn = useCallback((field: DataField, sourceName: string) => {
    setConfig((prev) => {
      if (prev.columns.some((c) => c.fieldId === field.id)) return prev;
      const newCol: ReportColumn = {
        fieldId: field.id,
        fieldName: field.name,
        displayName: field.displayName,
        type: field.type,
        aggregation: field.aggregatable ? 'NONE' : undefined,
        format: field.type === 'MONEY' ? 'MONEY' : field.type === 'DATE' ? 'DATE' : field.type === 'NUMBER' ? 'NUMBER' : 'TEXT',
      };
      void sourceName;
      return { ...prev, columns: [...prev.columns, newCol] };
    });
  }, []);

  const removeColumn = useCallback((fieldId: string) => {
    setConfig((prev) => ({ ...prev, columns: prev.columns.filter((c) => c.fieldId !== fieldId) }));
  }, []);

  const updateColumn = useCallback((fieldId: string, updates: Partial<ReportColumn>) => {
    setConfig((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.fieldId === fieldId ? { ...c, ...updates } : c)),
    }));
  }, []);

  const moveColumn = useCallback((fieldId: string, direction: 'up' | 'down') => {
    setConfig((prev) => {
      const cols = [...prev.columns];
      const idx = cols.findIndex((c) => c.fieldId === fieldId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= cols.length) return prev;
      [cols[idx], cols[targetIdx]] = [cols[targetIdx], cols[idx]];
      return { ...prev, columns: cols };
    });
  }, []);

  const addFilter = useCallback(() => {
    const firstField = availableFields[0];
    if (!firstField) return;
    const newFilter: ReportFilter = {
      id: `filter-${Date.now()}`,
      fieldId: firstField.id,
      fieldName: firstField.name,
      operator: 'equals',
      value: '',
    };
    setConfig((prev) => ({ ...prev, filters: [...prev.filters, newFilter] }));
  }, [availableFields]);

  const removeFilter = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, filters: prev.filters.filter((f) => f.id !== id) }));
  }, []);

  const updateFilter = useCallback((id: string, updates: Partial<ReportFilter>) => {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  }, []);

  const setVisualization = useCallback((viz: VisualizationType) => {
    setConfig((prev) => ({ ...prev, visualization: viz }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async ({ formData, runAfter }: { formData: SaveFormData; runAfter: boolean }) => {
      const payload = {
        name: formData.name,
        description: formData.description,
        schedule: formData.schedule,
        savedTo: formData.savedTo,
        config,
        deliveryEmails: formData.deliveryEmails,
        exportFormat: formData.exportFormat,
        scheduleTime: formData.scheduleTime,
        scheduleDay: formData.scheduleDay,
      };
      let saved: SavedReport;
      if (editReport) {
        saved = await reportBuilderApi.updateReport(editReport.id, payload);
      } else {
        saved = await reportBuilderApi.createReport(payload);
      }
      if (runAfter) {
        await reportBuilderApi.runReport(saved.id);
      }
      return saved;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.runAfter ? 'Report saved and running!' : 'Report saved successfully');
    },
    onError: () => {
      toast.error('Failed to save report');
    },
  });

  const saveReport = useCallback(
    (formData: SaveFormData) => saveMutation.mutateAsync({ formData, runAfter: false }),
    [saveMutation],
  );

  const saveAndRunReport = useCallback(
    (formData: SaveFormData) => saveMutation.mutateAsync({ formData, runAfter: true }),
    [saveMutation],
  );

  return {
    currentStep,
    config,
    selectedSources,
    availableFields,
    dataSources,
    dataSourcesError,
    previewData,
    previewError,
    isFetchingPreview,
    andOr,
    setAndOr,
    setStep,
    updateConfig,
    addColumn,
    removeColumn,
    updateColumn,
    moveColumn,
    addFilter,
    removeFilter,
    updateFilter,
    setVisualization,
    fetchPreview: () => fetchPreview(config),
    saveReport,
    saveAndRunReport,
    isSaving: saveMutation.isPending,
    savedReport: saveMutation.data,
  };
}

// ─── Stand-alone mutation hooks ────────────────────────────────────────────────

export function useRunReport() {
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params?: Record<string, string> }) =>
      reportBuilderApi.runReport(id, params),
    onSuccess: () => toast.success('Report run started'),
    onError: () => toast.error('Failed to run report'),
  });
}

export function useScheduleReport() {
  return useMutation({
    mutationFn: ({ id, schedule }: { id: string; schedule: import('../api/reportBuilderApi').SchedulePayload }) =>
      reportBuilderApi.updateSchedule(id, schedule),
    onSuccess: () => toast.success('Schedule updated'),
    onError: () => toast.error('Failed to update schedule'),
  });
}

export function useDeleteReport() {
  return useMutation({
    mutationFn: (id: string) => reportBuilderApi.deleteReport(id),
    onSuccess: () => toast.success('Report deleted'),
    onError: () => toast.error('Failed to delete report'),
  });
}

export function useCloneReport() {
  return useMutation({
    mutationFn: (id: string) => reportBuilderApi.cloneReport(id),
    onSuccess: () => toast.success('Report cloned'),
    onError: () => toast.error('Failed to clone report'),
  });
}
