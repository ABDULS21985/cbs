import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormSection } from '@/components/shared';
import { useReportBuilder } from '../hooks/useReportBuilder';
import { DataSourceSelector } from '../components/builder/DataSourceSelector';
import { FieldSelector } from '../components/builder/FieldSelector';
import { FilterBuilder } from '../components/builder/FilterBuilder';
import { VisualizationPicker } from '../components/builder/VisualizationPicker';
import { ReportPreview } from '../components/builder/ReportPreview';
import { ScheduleConfig } from '../components/builder/ScheduleConfig';
import { ReportSaveForm } from '../components/builder/ReportSaveForm';
import { reportBuilderApi } from '../api/reportBuilderApi';

const STEPS = [
  { number: 1, label: 'Data Source', description: 'Choose your data' },
  { number: 2, label: 'Fields & Filters', description: 'Select columns and filter criteria' },
  { number: 3, label: 'Visualization', description: 'Choose display type' },
  { number: 4, label: 'Save & Schedule', description: 'Configure and save' },
];

export function CustomReportBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { data: editReport } = useQuery({
    queryKey: ['saved-report', editId],
    queryFn: () => reportBuilderApi.getReport(editId!),
    enabled: !!editId,
  });

  const {
    currentStep,
    config,
    selectedSources,
    availableFields,
    dataSources,
    previewData,
    isFetchingPreview,
    andOr,
    setAndOr,
    setStep,
    updateConfig,
    addColumn,
    removeColumn,
    updateColumn,
    moveColumn,
    setVisualization,
    fetchPreview,
    saveReport,
    saveAndRunReport,
    isSaving,
  } = useReportBuilder(editReport);

  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [scheduleDay, setScheduleDay] = useState('MON');
  const [schedule, setSchedule] = useState<import('../api/reportBuilderApi').ScheduleType>('MANUAL');

  function canProceed(): boolean {
    if (currentStep === 1) return config.dataSources.length > 0;
    if (currentStep === 2) return config.columns.length > 0;
    return true;
  }

  function handleNext() {
    if (currentStep < 4 && canProceed()) {
      setStep((currentStep + 1) as 1 | 2 | 3 | 4);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setStep((currentStep - 1) as 1 | 2 | 3 | 4);
    } else {
      navigate('/reports/custom');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="h-5 w-px bg-border" />
            <h1 className="text-lg font-bold">{editId ? 'Edit Report' : 'New Custom Report'}</h1>
          </div>

          <div className="flex items-center gap-0 pb-0">
            {STEPS.map((step, idx) => (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => {
                    if (step.number <= currentStep || (step.number === currentStep + 1 && canProceed())) {
                      setStep(step.number as 1 | 2 | 3 | 4);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    currentStep === step.number
                      ? 'border-primary text-primary'
                      : step.number < currentStep
                        ? 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                        : 'border-transparent text-muted-foreground/50 cursor-not-allowed',
                  )}
                >
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    currentStep === step.number
                      ? 'bg-primary text-primary-foreground'
                      : step.number < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground',
                  )}>
                    {step.number < currentStep ? <Check className="w-3.5 h-3.5" /> : step.number}
                  </span>
                  <span className="hidden sm:block">{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Select Data Sources</h2>
              <p className="text-sm text-muted-foreground">Choose one or more data sources to include in your report</p>
            </div>
            <DataSourceSelector
              selected={config.dataSources}
              onChange={(ids) => updateConfig({ dataSources: ids, columns: [], filters: [] })}
              sources={dataSources}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Fields & Filters</h2>
              <p className="text-sm text-muted-foreground">Select columns to include and apply filters to narrow the data</p>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-3">
                <div className="rounded-xl border bg-card p-4 h-full" style={{ minHeight: '400px' }}>
                  <h3 className="text-sm font-semibold mb-3">Available Fields</h3>
                  <div className="h-[calc(100%-2rem)]">
                    <FieldSelector
                      sources={selectedSources}
                      selectedColumns={config.columns}
                      onAdd={addColumn}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-9 space-y-4">
                <FormSection title="Report Columns" description="Drag or use arrows to reorder columns">
                  {config.columns.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Click fields on the left to add columns to your report
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {config.columns.map((col, idx) => (
                        <div key={col.fieldId} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveColumn(col.fieldId, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveColumn(col.fieldId, 'down')}
                              disabled={idx === config.columns.length - 1}
                              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={col.displayName}
                              onChange={(e) => updateColumn(col.fieldId, { displayName: e.target.value })}
                              className="w-full px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                              {col.type}
                            </span>

                            {col.aggregation !== undefined && (
                              <select
                                value={col.aggregation ?? 'NONE'}
                                onChange={(e) => updateColumn(col.fieldId, { aggregation: e.target.value as typeof col.aggregation })}
                                className="px-2 py-1 text-xs border rounded bg-background focus:outline-none"
                              >
                                <option value="NONE">No Agg.</option>
                                <option value="SUM">SUM</option>
                                <option value="COUNT">COUNT</option>
                                <option value="AVG">AVG</option>
                                <option value="MIN">MIN</option>
                                <option value="MAX">MAX</option>
                              </select>
                            )}

                            <select
                              value={col.format ?? 'TEXT'}
                              onChange={(e) => updateColumn(col.fieldId, { format: e.target.value as typeof col.format })}
                              className="px-2 py-1 text-xs border rounded bg-background focus:outline-none"
                            >
                              <option value="TEXT">Text</option>
                              <option value="NUMBER">Number</option>
                              <option value="MONEY">Money</option>
                              <option value="PERCENT">Percent</option>
                              <option value="DATE">Date</option>
                            </select>
                          </div>

                          <button
                            onClick={() => removeColumn(col.fieldId)}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </FormSection>

                <FormSection title="Filters" collapsible defaultOpen>
                  <FilterBuilder
                    filters={config.filters}
                    availableFields={availableFields}
                    andOr={andOr}
                    onFiltersChange={(filters) => updateConfig({ filters })}
                    onAndOrChange={setAndOr}
                  />
                </FormSection>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Visualization</h2>
              <p className="text-sm text-muted-foreground">Choose how your data should be displayed</p>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5">
                <FormSection title="Display Type">
                  <VisualizationPicker
                    vizType={config.visualization}
                    onChange={(viz) => setVisualization(viz)}
                    columns={config.columns}
                    chartConfig={config.chartConfig}
                    onChartConfigChange={(chartConfig) => updateConfig({ chartConfig })}
                  />
                </FormSection>
              </div>
              <div className="col-span-12 lg:col-span-7">
                <ReportPreview
                  result={previewData}
                  vizType={config.visualization}
                  chartConfig={config.chartConfig}
                  isLoading={isFetchingPreview}
                  onRefresh={fetchPreview}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Save & Schedule</h2>
              <p className="text-sm text-muted-foreground">Name your report, configure schedule and delivery settings</p>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5 space-y-4">
                <FormSection title="Schedule">
                  <ScheduleConfig
                    schedule={schedule}
                    scheduleTime={scheduleTime}
                    scheduleDay={scheduleDay}
                    onScheduleChange={setSchedule}
                    onTimeChange={setScheduleTime}
                    onDayChange={setScheduleDay}
                  />
                </FormSection>
                <FormSection title="Report Details">
                  <ReportSaveForm
                    onSave={async (data) => {
                      await saveReport({ ...data, schedule });
                      navigate('/reports/custom');
                    }}
                    onSaveAndRun={async (data) => {
                      const saved = await saveAndRunReport({ ...data, schedule });
                      if (saved) navigate(`/reports/custom/${saved.id}/view`);
                    }}
                    isSaving={isSaving}
                    schedule={schedule}
                    scheduleTime={scheduleTime}
                    scheduleDay={scheduleDay}
                  />
                </FormSection>
              </div>
              <div className="col-span-12 lg:col-span-7">
                <ReportPreview
                  result={previewData}
                  vizType={config.visualization}
                  chartConfig={config.chartConfig}
                  isLoading={isFetchingPreview}
                  onRefresh={fetchPreview}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {currentStep < 4 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-card py-4 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.label}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep < 4 && <div className="h-20" />}
    </div>
  );
}
