import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared';
import { ReportExecutionView } from '../components/builder/ReportExecutionView';
import { reportBuilderApi, type ReportResult } from '../api/reportBuilderApi';

export function ReportViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading: isLoadingReport, error } = useQuery({
    queryKey: ['saved-report', id],
    queryFn: () => reportBuilderApi.getReport(id!),
    enabled: !!id,
  });

  const runMutation = useMutation({
    mutationFn: () => reportBuilderApi.runReport(id!),
    onError: () => toast.error('Failed to run report'),
  });

  useEffect(() => {
    if (report && !runMutation.data && !runMutation.isPending) {
      runMutation.mutate();
    }
  }, [report]);

  function handleRefresh() {
    runMutation.mutate();
  }

  if (isLoadingReport) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <EmptyState
          title="Report not found"
          description="This report does not exist or you don't have permission to view it."
          action={{ label: 'Back to Reports', onClick: () => navigate('/reports/custom') }}
        />
      </div>
    );
  }

  const result: ReportResult | null = runMutation.data ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate('/reports/custom')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium truncate">{report.name}</span>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <ReportExecutionView
          report={report}
          result={result}
          onRefresh={handleRefresh}
          isLoading={runMutation.isPending}
        />
      </div>
    </div>
  );
}
