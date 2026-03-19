import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSection } from '@/components/shared/FormSection';
import { CaseActivityFeed } from '../components/CaseActivityFeed';
import { CaseInfoPanel } from '../components/CaseInfoPanel';
import { CaseNoteForm } from '../components/CaseNoteForm';
import { CasePriorityBadge } from '../components/CasePriorityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { caseApi } from '../api/caseApi';

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['cases', 'detail', id],
    queryFn: () => caseApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading || !caseData) {
    return (
      <>
        <PageHeader title="Case Detail" />
        <div className="page-container"><div className="animate-pulse h-96 bg-muted rounded-lg" /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Case ${caseData.caseNumber}`}
        subtitle={caseData.subject}
        actions={
          <button onClick={() => navigate('/cases')} className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left panel */}
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <StatusBadge status={caseData.status} dot />
                <CasePriorityBadge priority={caseData.priority} />
                <span className="text-sm text-muted-foreground">{caseData.caseType.replace(/_/g, ' ')}</span>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground">Customer</h4>
                <p className="text-sm">{caseData.customerName}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                <p className="text-sm mt-1 whitespace-pre-wrap">{caseData.description}</p>
              </div>
            </div>

            <FormSection title="Activity">
              <CaseActivityFeed activities={caseData.activities || []} />
              <CaseNoteForm caseNumber={caseData.caseNumber} />
            </FormSection>
          </div>

          {/* Right panel */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Case Details</h3>
            <CaseInfoPanel caseData={caseData} />
          </div>
        </div>
      </div>
    </>
  );
}
