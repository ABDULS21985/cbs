import { useState } from 'react';
import { X, Send, CheckCircle, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { testSendTemplate, type NotificationTemplate } from '../../api/notificationAdminApi';

interface TemplateTestPanelProps {
  template: NotificationTemplate;
  onClose: () => void;
}

interface TestResult {
  success: boolean;
  recipient: string;
  timestamp: string;
  message: string;
}

export function TemplateTestPanel({ template, onClose }: TemplateTestPanelProps) {
  const [recipient, setRecipient] = useState('');
  const [mergeData, setMergeData] = useState<{ key: string; value: string }[]>([
    { key: 'customerName', value: 'John Doe' },
    { key: 'accountNumber', value: '0123456789' },
    { key: 'amount', value: '₦50,000.00' },
  ]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addMergeField = () => {
    setMergeData(prev => [...prev, { key: '', value: '' }]);
  };

  const removeMergeField = (index: number) => {
    setMergeData(prev => prev.filter((_, i) => i !== index));
  };

  const updateMergeField = (index: number, field: 'key' | 'value', val: string) => {
    setMergeData(prev => prev.map((m, i) => i === index ? { ...m, [field]: val } : m));
  };

  const getPlaceholder = () => {
    switch (template.channel) {
      case 'EMAIL': return 'test@example.com';
      case 'SMS': return '+234801234567';
      case 'PUSH': return 'device-token-xxx';
      default: return 'user-id or email';
    }
  };

  const handleSend = async () => {
    if (!recipient.trim()) return;
    setSending(true);
    try {
      const result = await testSendTemplate(template.id, recipient);
      setResults(prev => [{
        success: result.success,
        recipient,
        timestamp: new Date().toLocaleTimeString(),
        message: result.success ? 'Sent successfully' : 'Send failed',
      }, ...prev]);
    } catch {
      setResults(prev => [{
        success: false,
        recipient,
        timestamp: new Date().toLocaleTimeString(),
        message: 'Request failed — check network or backend logs',
      }, ...prev]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h3 className="font-semibold text-sm">Test Send</h3>
            <p className="text-xs text-muted-foreground">{template.templateName} · {template.channel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Recipient */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipient</label>
            <input
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Merge Data Override */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Merge Data (sample values)</label>
              <button onClick={addMergeField} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3 h-3" /> Add Field
              </button>
            </div>
            <div className="space-y-2">
              {mergeData.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={m.key}
                    onChange={e => updateMergeField(i, 'key', e.target.value)}
                    placeholder="field"
                    className="flex-1 px-2 py-1.5 rounded border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <input
                    value={m.value}
                    onChange={e => updateMergeField(i, 'value', e.target.value)}
                    placeholder="value"
                    className="flex-1 px-2 py-1.5 rounded border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <button onClick={() => removeMergeField(i)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!recipient.trim() || sending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test
          </button>

          {/* Results history */}
          {results.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Recent Test Sends</h4>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2.5 p-3 rounded-lg border text-xs',
                      r.success
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
                    )}
                  >
                    {r.success ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={cn('font-medium', r.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                        {r.message}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        To: {r.recipient} · {r.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
