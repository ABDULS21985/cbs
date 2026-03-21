import { useState } from 'react';
import { Upload, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSendBulk, useNotificationTemplates } from '../hooks/useCommunications';

interface BulkSendDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BulkSendDialog({ open, onClose }: BulkSendDialogProps) {
  const { data: templates = [] } = useNotificationTemplates();
  const bulkSend = useSendBulk();
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<{ name: string; email: string }[]>([]);
  const [csvText, setCsvText] = useState('');

  if (!open) return null;

  const parseCsv = () => {
    const lines = csvText.trim().split('\n').filter(Boolean);
    const parsed = lines.map((line) => {
      const [name, email] = line.split(',').map((s) => s.trim());
      return { name: name || '', email: email || '' };
    }).filter((r) => r.email);
    setRecipients(parsed);
    if (parsed.length > 0) toast.success(`Parsed ${parsed.length} recipients`);
    else toast.error('No valid recipients found');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string ?? '');
    };
    reader.readAsText(file);
  };

  const handleSend = () => {
    if (!templateId || recipients.length === 0) {
      toast.error('Select a template and add recipients');
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    bulkSend.mutate(
      {
        channel: template.channel,
        subject: template.subject ?? template.templateName,
        body: template.bodyTemplate,
        eventType: template.eventType,
        recipients: recipients.map((r) => ({ address: r.email, name: r.name })),
      },
      {
        onSuccess: (data) => {
          toast.success(`Sent ${data.sent} of ${data.total} messages`);
          onClose();
        },
        onError: () => toast.error('Bulk send failed'),
      },
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-base font-semibold">Bulk Send</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Template *</label>
              <select value={templateId ?? ''} onChange={(e) => setTemplateId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select template…</option>
                {templates.filter((t) => t.isActive).map((t) => (
                  <option key={t.id} value={t.id}>{t.templateName} ({t.channel})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Recipients (CSV: name, email)</label>
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={4} placeholder="John Doe, john@example.com&#10;Jane Smith, jane@example.com"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              <div className="flex gap-2">
                <button type="button" onClick={parseCsv} className="text-xs text-primary hover:underline">Parse CSV</button>
                <label className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                  <Upload className="w-3 h-3" /> Upload CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>

            {recipients.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium">{recipients.length} recipients ready</p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5 max-h-20 overflow-y-auto">
                  {recipients.slice(0, 3).map((r, i) => <p key={i}>{r.name} — {r.email}</p>)}
                  {recipients.length > 3 && <p>…and {recipients.length - 3} more</p>}
                </div>
              </div>
            )}

            {bulkSend.isPending && (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all animate-pulse" style={{ width: '100%' }} />
                </div>
                <p className="text-xs text-muted-foreground text-center">Sending…</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleSend} disabled={bulkSend.isPending || !templateId || recipients.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              <Send className="w-4 h-4" /> Send to {recipients.length} recipients
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
