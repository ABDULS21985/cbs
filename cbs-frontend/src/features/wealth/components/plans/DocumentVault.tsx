import { useRef } from 'react';
import { Upload, Download, FileText, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { usePlanDocuments, useUploadPlanDocument } from '../../hooks/useWealthData';

interface DocumentVaultProps {
  planCode: string;
}

export function DocumentVault({ planCode }: DocumentVaultProps) {
  const { data: docs = [], isLoading } = usePlanDocuments(planCode);
  const uploadMutation = useUploadPlanDocument();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ code: planCode, file });
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploadMutation.isPending ? 'Uploading…' : 'Upload Document'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
          <FileText className="w-8 h-8 opacity-40" />
          <p className="text-sm">No documents uploaded</p>
          <p className="text-xs">Upload financial statements, tax returns, or trust deeds</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Uploaded By</th>
                <th className="text-left px-4 py-3 font-medium">Upload Date</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, idx) => (
                <tr key={String(doc.id ?? idx)} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    {String(doc.name ?? 'Document')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{String(doc.type ?? '—')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{String(doc.uploadedBy ?? '—')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.uploadDate ? formatDate(String(doc.uploadDate)) : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {doc.url ? (
                      <a href={String(doc.url)} download className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-muted transition-colors text-primary">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
