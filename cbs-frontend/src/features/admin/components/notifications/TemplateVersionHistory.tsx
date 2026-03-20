import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Clock, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemplateVersions, type NotificationTemplate } from '../../api/notificationAdminApi';
import { TemplateDiffViewer } from './TemplateDiffViewer';
import { format, parseISO } from 'date-fns';

interface TemplateVersionHistoryProps {
  template: NotificationTemplate;
  onClose: () => void;
  onRestore: (bodyTemplate: string) => void;
}

interface TemplateVersion {
  version: number;
  bodyTemplate: string;
  subject?: string;
  updatedAt: string;
  updatedBy?: string;
}

export function TemplateVersionHistory({ template, onClose, onRestore }: TemplateVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['admin', 'notification-templates', template.id, 'versions'],
    queryFn: () => getTemplateVersions(template.id) as Promise<TemplateVersion[]>,
  });

  const handleRestore = (version: TemplateVersion) => {
    onRestore(version.bodyTemplate);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-card border-l shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">Version History</h3>
              <p className="text-xs text-muted-foreground">{template.templateName} · v{template.version}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              No version history available for this template.
            </div>
          ) : (
            versions.map((v) => (
              <div
                key={v.version}
                className={cn(
                  'rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                  selectedVersion?.version === v.version && 'border-primary bg-primary/5',
                  v.version === template.version && 'ring-1 ring-primary/30',
                )}
                onClick={() => setSelectedVersion(v)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Version {v.version}</span>
                    {v.version === template.version && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(() => { try { return format(parseISO(v.updatedAt), 'dd MMM yyyy HH:mm'); } catch { return v.updatedAt; } })()}
                  </span>
                </div>
                {v.updatedBy && (
                  <p className="text-xs text-muted-foreground mb-2">by {v.updatedBy}</p>
                )}
                <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-20 overflow-hidden line-clamp-3 font-mono">
                  {v.bodyTemplate}
                </pre>

                {selectedVersion?.version === v.version && v.version !== template.version && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDiff(true); }}
                      className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      Compare with Current
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRestore(v); }}
                      className="flex items-center justify-center gap-1.5 flex-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Diff Viewer */}
      {showDiff && selectedVersion && (
        <TemplateDiffViewer
          leftLabel={`Version ${selectedVersion.version}`}
          leftContent={selectedVersion.bodyTemplate}
          rightLabel={`Version ${template.version} (Current)`}
          rightContent={template.bodyTemplate}
          onClose={() => setShowDiff(false)}
        />
      )}
    </>
  );
}
