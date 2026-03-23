import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Paperclip, FileText, Image, FileArchive, ExternalLink, GitBranch } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSection } from '@/components/shared/FormSection';
import { CaseActivityFeed } from '../components/CaseActivityFeed';
import { CaseInfoPanel } from '../components/CaseInfoPanel';
import { CaseNoteForm } from '../components/CaseNoteForm';
import { CasePriorityBadge } from '../components/CasePriorityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { caseApi, type CaseAttachment } from '../api/caseApi';
import { formatDateTime } from '@/lib/formatters';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className="w-4 h-4 text-amber-500" />;
  return <Paperclip className="w-4 h-4 text-muted-foreground" />;
}

function AttachmentCard({ attachment }: { attachment: CaseAttachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors group"
    >
      <AttachmentIcon mimeType={attachment.mimeType} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.fileSize)} · {attachment.uploadedBy} · {formatDateTime(attachment.uploadedAt)}
        </p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

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

  const attachments = caseData.attachments ?? [];

  return (
    <>
      <PageHeader
        title={`Case ${caseData.caseNumber}`}
        subtitle={caseData.subject}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={`/cases/${caseData.caseNumber}/rca`}
              className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted"
            >
              <GitBranch className="w-4 h-4" /> RCA
            </Link>
            <button onClick={() => navigate('/cases')} className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        }
      />
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left panel */}
          <div className="space-y-6">
            <div className="surface-card p-5">
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

            {/* Attachments */}
            <FormSection title={`Attachments${attachments.length > 0 ? ` (${attachments.length})` : ''}`}>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No attachments yet</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <AttachmentCard key={att.id} attachment={att} />
                  ))}
                </div>
              )}
            </FormSection>

            <FormSection title="Activity">
              <CaseActivityFeed activities={caseData.activities || []} />
              <CaseNoteForm caseNumber={caseData.caseNumber} />
            </FormSection>
          </div>

          {/* Right panel */}
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-4">Case Details</h3>
            <CaseInfoPanel caseData={caseData} />
          </div>
        </div>
      </div>
    </>
  );
}
