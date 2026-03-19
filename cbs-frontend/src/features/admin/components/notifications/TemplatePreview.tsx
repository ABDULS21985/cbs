import { X, Smartphone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationTemplate } from '../../api/notificationAdminApi';

const SAMPLE_DATA: Record<string, string> = {
  customerName: 'Adeola Johnson',
  accountNumber: '0123456789',
  email: 'adeola.johnson@email.com',
  amount: '50,000',
  currency: '₦',
  transactionRef: 'TXN-2024-001',
  transactionDate: '18 Mar 2026',
  balance: '₦1,250,000',
  narration: 'Salary Credit',
  branchName: 'Victoria Island Branch',
  supportPhone: '0700-BELL-BANK',
  bankName: 'BellBank',
};

function substituteMergeFields(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_DATA[key] ?? `{{${key}}}`);
}

interface TemplatePreviewProps {
  template: Partial<NotificationTemplate>;
  onClose: () => void;
}

export function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const body = substituteMergeFields(template.body ?? '');
  const subject = template.subject ? substituteMergeFields(template.subject) : undefined;
  const channel = template.channel ?? 'EMAIL';

  const smsLength = (template.body ?? '').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {channel === 'EMAIL' ? (
              <Mail className="w-4 h-4 text-blue-500" />
            ) : (
              <Smartphone className="w-4 h-4 text-green-500" />
            )}
            <h2 className="font-semibold text-sm">Preview with Sample Data</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {channel === 'EMAIL' && (
            <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-gray-950">
              {/* Email header */}
              <div className="bg-muted/40 px-4 py-3 border-b border-border space-y-1.5">
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="font-medium text-muted-foreground w-10 shrink-0">From:</span>
                  <span className="text-foreground">BellBank Notifications &lt;noreply@bellbank.ng&gt;</span>
                </div>
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="font-medium text-muted-foreground w-10 shrink-0">To:</span>
                  <span className="text-foreground">{SAMPLE_DATA.email}</span>
                </div>
                {subject && (
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="font-medium text-muted-foreground w-10 shrink-0">Subject:</span>
                    <span className="font-medium text-foreground">{subject}</span>
                  </div>
                )}
              </div>
              {/* Email body */}
              <div className="px-5 py-4">
                <pre className="font-sans text-sm leading-6 whitespace-pre-wrap text-foreground">
                  {body}
                </pre>
              </div>
            </div>
          )}

          {channel === 'SMS' && (
            <div className="flex flex-col items-center gap-4">
              {/* Phone chrome */}
              <div className="w-64 bg-gray-900 rounded-3xl p-3 shadow-xl">
                <div className="bg-gray-800 rounded-2xl overflow-hidden">
                  {/* Status bar */}
                  <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                    <span className="text-white text-xs font-medium">BellBank</span>
                    <span className="text-gray-400 text-xs">now</span>
                  </div>
                  {/* SMS bubble */}
                  <div className="px-3 pb-4">
                    <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-full">
                      <p className="text-white text-xs leading-5 whitespace-pre-wrap">{body}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className={cn(
                  'text-xs font-medium tabular-nums',
                  smsLength > 160 ? 'text-destructive' : smsLength > 140 ? 'text-amber-500' : 'text-muted-foreground',
                )}>
                  {smsLength} / 160 characters
                  {smsLength > 160 && ` (${Math.ceil(smsLength / 160)} parts)`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Character count based on template (before merge substitution)</p>
              </div>
            </div>
          )}

          {channel === 'PUSH' && (
            <div className="space-y-3">
              {/* Push notification mock */}
              <div className="border border-border rounded-xl p-4 bg-muted/20 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-lg">🔔</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">BellBank</p>
                  <p className="text-sm text-foreground mt-0.5 leading-5 line-clamp-4">{body}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">now</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">Push notification preview on lock screen</p>
            </div>
          )}

          {channel === 'IN_APP' && (
            <div className="space-y-3">
              <div className="border border-border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <span className="text-sm">ℹ️</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">BellBank Notification</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-5">{body}</p>
                    <p className="text-xs text-muted-foreground mt-2">Just now</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">In-app notification preview</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
