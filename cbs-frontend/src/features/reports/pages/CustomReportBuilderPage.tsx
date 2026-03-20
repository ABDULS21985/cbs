import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Check, Save, Play, CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormSection } from '@/components/shared';
import { useReportBuilder } from '../hooks/useReportBuilder';
import { DataSourceSelector } from '../components/builder/DataSourceSelector';
import { FieldDragDrop } from '../components/builder/FieldDragDrop';
import { FilterRuleBuilder } from '../components/builder/FilterRuleBuilder';
import { VisualizationPicker } from '../components/builder/VisualizationPicker';
import { ReportPreview } from '../components/builder/ReportPreview';
import { ScheduleForm } from '../components/builder/ScheduleForm';
import { reportBuilderApi } from '../api/reportBuilderApi';

// ─── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: 'Data Source', description: 'Choose your data' },
  { number: 2, label: 'Fields', description: 'Pick and arrange columns' },
  { number: 3, label: 'Filters', description: 'Narrow down the data' },
  { number: 4, label: 'Visualization', description: 'Choose display type' },
  { number: 5, label: 'Schedule', description: 'Delivery & frequency' },
  { number: 6, label: 'Review & Save', description: 'Name and save report' },
] as const;

type Step = 1 | 2 | 3 | 4 | 5 | 6;

// ─── Review step sub-component ─────────────────────────────────────────────────

interface ReviewStepProps {
  config: import('../api/reportBuilderApi').ReportConfig;
  schedule: import('../api/reportBuilderApi').ScheduleType;
  scheduleTime: string;
  scheduleDay: string;
  recipients: string[];
  exportFormats: string[];
  onlyIfChanged: boolean;
  onSave: (name: string, description: string, category: string, accessLevel: string) => void;
  onSaveAndRun: (name: string, description: string, category: string, accessLevel: string) => void;
  onSaveAndSchedule: (name: string, description: string, category: string, accessLevel: string) => void;
  isSaving: boolean;
}

function ReviewStep({
  config,
  schedule,
  scheduleTime,
  scheduleDay,
  recipients,
  exportFormats,
  onlyIfChanged,
  onSave,
  onSaveAndRun,
  onSaveAndSchedule,
  isSaving,
}: ReviewStepProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [accessLevel, setAccessLevel] = useState<'PRIVATE' | 'MY_TEAM' | 'ALL_OFFICERS'>('PRIVATE');
  const [nameError, setNameError] = useState('');

  function validate() {
    if (!name.trim()) {
      setNameError('Report name is required');
      return false;
    }
    setNameError('');
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    onSave(name, description, category, accessLevel);
  }

  function handleSaveAndRun() {
    if (!validate()) return;
    onSaveAndRun(name, description, category, accessLevel);
  }

  function handleSaveAndSchedule() {
    if (!validate()) return;
    onSaveAndSchedule(name, description, category, accessLevel);
  }

  const ACCESS_OPTIONS: { value: 'PRIVATE' | 'MY_TEAM' | 'ALL_OFFICERS'; label: string; desc: string }[] = [
    { value: 'PRIVATE', label: 'Private', desc: 'Only you can see this report' },
    { value: 'MY_TEAM', label: 'My Team', desc: 'Visible to your department' },
    { value: 'ALL_OFFICERS', label: 'All Officers', desc: 'Visible to all bank staff' },
  ];

  const CATEGORY_OPTIONS = ['Operations', 'Finance', 'Risk', 'Compliance', 'Sales', 'Marketing', 'Executive', 'Other'];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left: form */}
      <div className="col-span-12 lg:col-span-5 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Report Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(''); }}
            placeholder="e.g. Monthly Loan Portfolio Summary"
            className={cn(
              'w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30',
              nameError && 'border-red-500',
            )}
          />
          {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what this report shows..."
            rows={3}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— Select category —</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Access Level</label>
          <div className="space-y-2">
            {ACCESS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAccessLevel(opt.value)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                  accessLevel === opt.value
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5',
                  accessLevel === opt.value
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground',
                )} />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: summary */}
      <div className="col-span-12 lg:col-span-7 space-y-4">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Configuration Summary</h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <SummaryItem label="Data Sources" value={config.dataSources.join(', ') || '—'} />
            <SummaryItem label="Columns" value={`${config.columns.length} selected`} />
            <SummaryItem label="Filters" value={config.filters.length > 0 ? `${config.filters.length} condition(s)` : 'No filters'} />
            <SummaryItem label="Visualization" value={config.visualization.replace('_', ' ')} />
            <SummaryItem label="Schedule" value={schedule} />
            {schedule !== 'MANUAL' && (
              <>
                <SummaryItem label="Time" value={scheduleTime} />
                {(schedule === 'WEEKLY' || schedule === 'MONTHLY') && (
                  <SummaryItem label="Day" value={scheduleDay} />
                )}
              </>
            )}
            <SummaryItem label="Formats" value={exportFormats.length > 0 ? exportFormats.join(' + ') : '—'} />
            <SummaryItem label="Recipients" value={recipients.length > 0 ? `${recipients.length} email(s)` : 'None'} />
            {onlyIfChanged && <SummaryItem label="Condition" value="Only if data changed" />}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save as Draft
          </button>
          <button
            onClick={handleSaveAndRun}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Save &amp; Run Now
          </button>
          {schedule !== 'MANUAL' && (
            <button
              onClick={handleSaveAndSchedule}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CalendarClock className="w-4 h-4" />
              Save &amp; Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium capitalize">{value.toLowerCase()}</div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function CustomReportBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { data: editReport, isError: editReportError } = useQuery({
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
    setVisualization,
    fetchPreview,
    saveReport,
    saveAndRunReport,
    isSaving,
  } = useReportBuilder(editReport);

  // Step 5: Schedule state
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [scheduleDay, setScheduleDay] = useState('MON');
  const [schedule, setSchedule] = useState<import('../api/reportBuilderApi').ScheduleType>('MANUAL');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [exportFormats, setExportFormats] = useState<string[]>(['PDF']);
  const [onlyIfChanged, setOnlyIfChanged] = useState(false);

  const step = currentStep as Step;

  function canProceed(): boolean {
    if (step === 1) return config.dataSources.length > 0;
    if (step === 2) return config.columns.length > 0;
    return true;
  }

  function handleNext() {
    if (step < 6 && canProceed()) {
      setStep((step + 1) as Step);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      navigate('/reports/custom');
    }
  }

  async function handleSave(name: string, description: string, category: string, accessLevel: string) {
    await saveReport({
      name,
      description,
      schedule,
      savedTo: accessLevel === 'PRIVATE' ? 'MY_REPORTS' : accessLevel === 'MY_TEAM' ? 'SHARED' : 'DEPARTMENT',
      deliveryEmails: recipients.length > 0 ? recipients : undefined,
      exportFormat: exportFormats[0] as 'PDF' | 'EXCEL' | 'CSV' | undefined,
      scheduleTime,
      scheduleDay,
    });
    navigate('/reports/custom');
  }

  async function handleSaveAndRun(name: string, description: string, category: string, accessLevel: string) {
    const saved = await saveAndRunReport({
      name,
      description,
      schedule,
      savedTo: accessLevel === 'PRIVATE' ? 'MY_REPORTS' : accessLevel === 'MY_TEAM' ? 'SHARED' : 'DEPARTMENT',
      deliveryEmails: recipients.length > 0 ? recipients : undefined,
      exportFormat: exportFormats[0] as 'PDF' | 'EXCEL' | 'CSV' | undefined,
      scheduleTime,
      scheduleDay,
    });
    if (saved) navigate(`/reports/custom/${saved.id}/view`);
  }

  async function handleSaveAndSchedule(name: string, description: string, category: string, accessLevel: string) {
    await saveReport({
      name,
      description,
      schedule,
      savedTo: accessLevel === 'PRIVATE' ? 'MY_REPORTS' : accessLevel === 'MY_TEAM' ? 'SHARED' : 'DEPARTMENT',
      deliveryEmails: recipients.length > 0 ? recipients : undefined,
      exportFormat: exportFormats[0] as 'PDF' | 'EXCEL' | 'CSV' | undefined,
      scheduleTime,
      scheduleDay,
    });
    navigate('/reports/custom');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header with step indicator ── */}
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

          {/* Step tabs */}
          <div className="flex items-center gap-0 pb-0 overflow-x-auto">
            {STEPS.map((s, idx) => (
              <div key={s.number} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => {
                    if (s.number <= step || (s.number === step + 1 && canProceed())) {
                      setStep(s.number as Step);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    step === s.number
                      ? 'border-primary text-primary'
                      : s.number < step
                        ? 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                        : 'border-transparent text-muted-foreground/50 cursor-not-allowed',
                  )}
                >
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    step === s.number
                      ? 'bg-primary text-primary-foreground'
                      : s.number < step
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground',
                  )}>
                    {s.number < step ? <Check className="w-3.5 h-3.5" /> : s.number}
                  </span>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-1 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(editReportError || dataSourcesError || previewError) && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {previewError ??
              (editReportError
                ? 'The selected saved report could not be loaded.'
                : 'Report-builder data sources could not be loaded.')}
          </div>
        )}

        {/* STEP 1 — Data Source */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Select Data Sources</h2>
              <p className="text-sm text-muted-foreground">
                Choose one or more data sources to include in your report. Multi-source joins are supported.
              </p>
            </div>
            <DataSourceSelector
              selected={config.dataSources}
              onChange={(ids) => updateConfig({ dataSources: ids, columns: [], filters: [] })}
              sources={dataSources}
            />
            {config.dataSources.length > 1 && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                Multi-source join enabled. Fields from all selected sources will be available on the next step.
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Fields */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Select Fields</h2>
              <p className="text-sm text-muted-foreground">
                Drag or use arrows to reorder. Edit display names inline. Set aggregation and format per column.
              </p>
            </div>
            <FieldDragDrop
              sources={selectedSources}
              selectedColumns={config.columns}
              onAdd={addColumn}
              onRemove={removeColumn}
              onUpdate={updateColumn}
              onMove={moveColumn}
            />
          </div>
        )}

        {/* STEP 3 — Filters */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Filters</h2>
              <p className="text-sm text-muted-foreground">
                Add conditions to narrow down your data. Combine with AND / OR logic.
              </p>
            </div>
            <FormSection title="Filter Conditions" description="Only rows matching all conditions will appear in the report">
              <FilterRuleBuilder
                filters={config.filters}
                availableFields={availableFields}
                andOr={andOr}
                onFiltersChange={(filters) => updateConfig({ filters })}
                onAndOrChange={setAndOr}
              />
            </FormSection>
          </div>
        )}

        {/* STEP 4 — Visualization */}
        {step === 4 && (
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

        {/* STEP 5 — Schedule */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Schedule & Delivery</h2>
              <p className="text-sm text-muted-foreground">
                Configure how often this report runs and where results are delivered
              </p>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-6">
                <FormSection title="Schedule Settings">
                  <ScheduleForm
                    schedule={schedule}
                    scheduleTime={scheduleTime}
                    scheduleDay={scheduleDay}
                    onScheduleChange={setSchedule}
                    onTimeChange={setScheduleTime}
                    onDayChange={setScheduleDay}
                    recipients={recipients}
                    onRecipientsChange={setRecipients}
                    exportFormats={exportFormats}
                    onExportFormatsChange={setExportFormats}
                    onlyIfChanged={onlyIfChanged}
                    onOnlyIfChangedChange={setOnlyIfChanged}
                  />
                </FormSection>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold">Schedule Preview</h3>
                  {schedule === 'MANUAL' ? (
                    <p className="text-sm text-muted-foreground">This report will only run when manually triggered.</p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency</span>
                        <span className="font-medium capitalize">{schedule.toLowerCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{scheduleTime} (Africa/Lagos)</span>
                      </div>
                      {(schedule === 'WEEKLY' || schedule === 'MONTHLY') && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{schedule === 'WEEKLY' ? 'Day of week' : 'Day of month'}</span>
                          <span className="font-medium">{scheduleDay}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Formats</span>
                        <span className="font-medium">{exportFormats.length > 0 ? exportFormats.join(' + ') : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recipients</span>
                        <span className="font-medium">{recipients.length > 0 ? `${recipients.length} email(s)` : 'None'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6 — Review & Save */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Review &amp; Save</h2>
              <p className="text-sm text-muted-foreground">Name your report, set access permissions, and save</p>
            </div>
            <ReviewStep
              config={config}
              schedule={schedule}
              scheduleTime={scheduleTime}
              scheduleDay={scheduleDay}
              recipients={recipients}
              exportFormats={exportFormats}
              onlyIfChanged={onlyIfChanged}
              onSave={handleSave}
              onSaveAndRun={handleSaveAndRun}
              onSaveAndSchedule={handleSaveAndSchedule}
              isSaving={isSaving}
            />
          </div>
        )}
      </div>

      {/* ── Fixed bottom navigation (steps 1–5 only) ── */}
      {step < 6 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-card py-4 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Step {step} of {STEPS.length}: {STEPS[step - 1]?.label}
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
                {step === 5 ? 'Review' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step < 6 && <div className="h-20" />}
    </div>
  );
}
