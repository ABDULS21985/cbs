import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Check, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { testSendTemplate } from '../../../admin/api/notificationAdminApi';

interface TemplateTestSendDialogProps {
  templateId: number;
  channel: string;
  onClose: () => void;
}

export function TemplateTestSendDialog({ templateId, channel, onClose }: TemplateTestSendDialogProps) {
  const [recipient, setRecipient] = useState('');
  const [result, setResult] = useState<{ success: boolean; subject: string; body: string } | null>(null);

  const sendMut = useMutation({
    mutationFn: () => testSendTemplate(templateId, recipient),
    onSuccess: (data) => {
      toast.success(`Test sent to ${recipient}`);
      setResult(data);
    },
    onError: () => toast.error('Failed to send test'),
  });

  const placeholder = channel === 'SMS' || channel === 'PUSH' ? '+234XXXXXXXXXX' : 'test@example.com';
  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Send Test</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Recipient</label>
                <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={placeholder} className={inputCls} />
                <p className="text-xs text-muted-foreground mt-1">Template will be rendered with sample data and sent to this address.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => sendMut.mutate()} disabled={!recipient || sendMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  <Send className="w-4 h-4" /> {sendMut.isPending ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Test sent to {recipient}</span>
              </div>
              {result.subject && (
                <div>
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium">{result.subject}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Body (rendered)</p>
                <div className="mt-1 rounded-lg border p-3 text-sm bg-muted/20 max-h-48 overflow-y-auto whitespace-pre-wrap">{result.body}</div>
              </div>
              <button onClick={onClose} className="w-full px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
