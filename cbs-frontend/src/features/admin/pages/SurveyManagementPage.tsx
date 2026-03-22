import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ClipboardList, Rocket, XCircle, BarChart3, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { surveysApi } from '../api/surveyApi';
import type { CustomerSurvey, SurveyResponse } from '../types/survey';
import type { ColumnDef } from '@tanstack/react-table';

const surveySchema = z.object({
  surveyName: z.string().min(3),
  surveyType: z.enum(['NPS', 'CSAT', 'CES', 'GENERAL', 'PRODUCT']),
  targetSegment: z.string().min(1),
  deliveryChannel: z.enum(['EMAIL', 'SMS', 'IN_APP', 'MULTI']),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});
type SurveyFormData = z.infer<typeof surveySchema>;

const SURVEY_TYPES = ['NPS', 'CSAT', 'CES', 'GENERAL', 'PRODUCT'];

export function SurveyManagementPage() {
  useEffect(() => { document.title = 'Surveys | CBS Admin'; }, []);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<CustomerSurvey | null>(null);

  // Fetch surveys by all types and merge
  const surveyQueries = SURVEY_TYPES.map(type =>
    useQuery({ queryKey: ['surveys', 'byType', type], queryFn: () => surveysApi.getByType(type), staleTime: 60_000 })
  );
  const isLoading = surveyQueries.some(q => q.isLoading);
  const allSurveys = useMemo(() => surveyQueries.flatMap(q => q.data || []), [surveyQueries.map(q => q.data)]);

  const { data: responses = [] } = useQuery({
    queryKey: ['surveys', 'responses', selectedSurvey?.surveyCode],
    queryFn: () => surveysApi.getResponses(selectedSurvey!.surveyCode),
    enabled: !!selectedSurvey,
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<CustomerSurvey>) => surveysApi.createSurvey(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['surveys'] }); setShowCreate(false); toast.success('Survey created'); },
    onError: () => toast.error('Failed to create survey'),
  });
  const launchMut = useMutation({
    mutationFn: (code: string) => surveysApi.launchSurvey(code, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['surveys'] }); toast.success('Survey launched'); },
    onError: () => toast.error('Failed to launch'),
  });
  const closeMut = useMutation({
    mutationFn: (code: string) => surveysApi.closeSurvey(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['surveys'] }); toast.success('Survey closed'); },
    onError: () => toast.error('Failed to close'),
  });

  const activeSurveys = allSurveys.filter(s => s.status === 'ACTIVE');
  const totalResponses = allSurveys.reduce((s, sv) => s + sv.totalResponses, 0);
  const avgScore = allSurveys.length > 0 ? allSurveys.reduce((s, sv) => s + sv.avgScore, 0) / allSurveys.length : 0;

  const columns = useMemo<ColumnDef<CustomerSurvey, unknown>[]>(() => [
    { accessorKey: 'surveyName', header: 'Survey', cell: ({ row }) => <button onClick={() => setSelectedSurvey(row.original)} className="text-sm font-medium text-primary hover:underline">{row.original.surveyName}</button> },
    { accessorKey: 'surveyType', header: 'Type', cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{row.original.surveyType}</span> },
    { accessorKey: 'targetSegment', header: 'Target', cell: ({ row }) => <span className="text-sm">{row.original.targetSegment}</span> },
    { accessorKey: 'totalResponses', header: 'Responses', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.totalResponses}</span> },
    { accessorKey: 'avgScore', header: 'Avg Score', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.avgScore?.toFixed(1) || '—'}</span> },
    { accessorKey: 'responseRatePct', header: 'Response Rate', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.responseRatePct?.toFixed(0) || 0}%</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.status === 'DRAFT' && <button onClick={() => launchMut.mutate(row.original.surveyCode)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Launch"><Rocket className="w-4 h-4" /></button>}
        {row.original.status === 'ACTIVE' && <button onClick={() => closeMut.mutate(row.original.surveyCode)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Close"><XCircle className="w-4 h-4" /></button>}
      </div>
    )},
  ], [launchMut, closeMut]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SurveyFormData>({ resolver: zodResolver(surveySchema) });

  return (
    <>
      <PageHeader title="Survey Management" subtitle="Create, launch, and analyze customer surveys" actions={
        <button onClick={() => { reset(); setShowCreate(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Survey</button>
      } />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Surveys" value={allSurveys.length} format="number" icon={ClipboardList} loading={isLoading} />
          <StatCard label="Active" value={activeSurveys.length} format="number" icon={Rocket} loading={isLoading} />
          <StatCard label="Responses MTD" value={totalResponses} format="number" icon={MessageSquare} loading={isLoading} />
          <StatCard label="Avg Score" value={avgScore.toFixed(1)} icon={BarChart3} loading={isLoading} />
        </div>

        {isLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={columns} data={allSurveys} enableGlobalFilter emptyMessage="No surveys found" pageSize={15} />}
      </div>

      {/* Survey Results Slide-over */}
      {selectedSurvey && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedSurvey(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-background border-l shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div><h3 className="text-base font-semibold">{selectedSurvey.surveyName}</h3><p className="text-xs text-muted-foreground">{selectedSurvey.surveyType} &middot; {selectedSurvey.status}</p></div>
              <button onClick={() => setSelectedSurvey(null)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-muted/50 p-3"><div className="text-xs text-muted-foreground">Responses</div><div className="text-lg font-semibold">{selectedSurvey.totalResponses}</div></div>
                <div className="rounded-lg bg-muted/50 p-3"><div className="text-xs text-muted-foreground">Avg Score</div><div className="text-lg font-semibold">{selectedSurvey.avgScore?.toFixed(1) || '—'}</div></div>
                <div className="rounded-lg bg-muted/50 p-3"><div className="text-xs text-muted-foreground">NPS</div><div className="text-lg font-semibold">{selectedSurvey.npsScore ?? '—'}</div></div>
              </div>
              {selectedSurvey.keyThemes && selectedSurvey.keyThemes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Key Themes</h4>
                  <div className="flex flex-wrap gap-2">{selectedSurvey.keyThemes.map((t, i) => <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted">{t}</span>)}</div>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold mb-2">Individual Responses ({(responses as SurveyResponse[]).length})</h4>
                {(responses as SurveyResponse[]).length > 0 ? (
                  <div className="space-y-2">
                    {(responses as SurveyResponse[]).slice(0, 20).map(r => (
                      <div key={r.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Customer {r.customerId}</span>
                          <div className="flex gap-2">
                            <span className="text-xs font-medium">Score: {r.overallScore}</span>
                            {r.sentiment && <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', r.sentiment === 'POSITIVE' ? 'bg-green-50 text-green-700' : r.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600')}>{r.sentiment}</span>}
                          </div>
                        </div>
                        {r.verbatimFeedback && <p className="text-sm text-muted-foreground mt-1 italic">"{r.verbatimFeedback}"</p>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No responses yet</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-base font-semibold">New Survey</h2><button onClick={() => setShowCreate(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5"><label className="text-sm font-medium">Survey Name *</label><input {...register('surveyName')} className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', errors.surveyName && 'border-red-500')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Type *</label><select {...register('surveyType')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="NPS">NPS</option><option value="CSAT">CSAT</option><option value="CES">CES</option><option value="GENERAL">General</option><option value="PRODUCT">Product</option></select></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Channel *</label><select {...register('deliveryChannel')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="IN_APP">In-App</option><option value="MULTI">Multi-channel</option></select></div>
              </div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Target Segment *</label><input {...register('targetSegment')} placeholder="e.g. All Retail" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Description</label><textarea {...register('description')} rows={2} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Start *</label><input type="date" {...register('startDate')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">End *</label><input type="date" {...register('endDate')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMut.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">{createMut.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus className="w-4 h-4" />}Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
