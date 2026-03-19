import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SavedReportsTable } from '../components/builder/SavedReportsTable';
import { ReportExecutionView } from '../components/builder/ReportExecutionView';
import { reportBuilderApi, type SavedReport, type ReportResult } from '../api/reportBuilderApi';

export function SavedReportsPage() {
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState<SavedReport | null>(null);
  const [activeResult, setActiveResult] = useState<ReportResult | null>(null);

  const runMutation = useMutation({
    mutationFn: (report: SavedReport) => reportBuilderApi.runReport(report.id),
    onSuccess: (result) => {
      setActiveResult(result);
    },
    onError: () => toast.error('Failed to run report'),
  });

  function handleRun(report: SavedReport) {
    setActiveReport(report);
    setActiveResult(null);
    runMutation.mutate(report);
  }

  function handleEdit(report: SavedReport) {
    navigate(`/reports/custom/new?edit=${report.id}`);
  }

  function handleCloseViewer() {
    setActiveReport(null);
    setActiveResult(null);
  }

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Report Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create, schedule, and manage custom reports from any data source
          </p>
        </div>
        <button
          onClick={() => navigate('/reports/custom/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {activeReport ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b">
            <h2 className="text-base font-semibold text-muted-foreground">Running:</h2>
            <span className="font-semibold">{activeReport.name}</span>
            <button
              onClick={handleCloseViewer}
              className={cn(
                'ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors',
              )}
            >
              <X className="w-3.5 h-3.5" />
              Close
            </button>
          </div>
          <ReportExecutionView
            report={activeReport}
            result={activeResult}
            onRefresh={() => runMutation.mutate(activeReport)}
            isLoading={runMutation.isPending}
          />
          <div className="pt-4 border-t">
            <h2 className="text-base font-semibold mb-4">All Reports</h2>
            <SavedReportsTable onRun={handleRun} onEdit={handleEdit} />
          </div>
        </div>
      ) : (
        <SavedReportsTable onRun={handleRun} onEdit={handleEdit} />
      )}
    </div>
  );
}
