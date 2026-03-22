import { X } from 'lucide-react';
import type { TemplatePreview as PreviewData } from '../../api/notificationAdminApi';

interface TemplatePreviewProps {
  preview: PreviewData | null;
  open: boolean;
  onClose: () => void;
}

export function TemplatePreview({ preview, open, onClose }: TemplatePreviewProps) {
  if (!open || !preview) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">Template Preview — {preview.channel}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {preview.subject && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <p className="text-sm font-medium mt-1">{preview.subject}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Body</label>
            {preview.isHtml ? (
              <div className="mt-2 rounded-lg border p-4 text-sm prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: preview.body }} />
            ) : (
              <pre className="mt-2 rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap font-mono">{preview.body}</pre>
            )}
          </div>
          {preview.channel === 'SMS' && (
            <p className="text-xs text-muted-foreground">{preview.body.length} characters · {Math.ceil(preview.body.length / 160)} SMS segment(s)</p>
          )}
        </div>
      </div>
    </div>
  );
}
