import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared';
import { useAdvisorCertifications } from '../../hooks/useWealth';
import type { AdvisorCertification } from '../../api/wealthApi';
import { Loader2, ShieldCheck, AlertTriangle, BookOpen } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComplianceTrackerProps {
  advisorId: string;
}

// ─── Training Data ────────────────────────────────────────────────────────────

interface TrainingItem {
  name: string;
  completed: number;
  total: number;
  dueDate: string;
}

const TRAINING_ITEMS: TrainingItem[] = [
  { name: 'AML Training', completed: 8, total: 10, dueDate: '2026-06-30' },
  { name: 'Suitability Training', completed: 5, total: 5, dueDate: '2026-03-31' },
  { name: 'Ethics & Professional Conduct', completed: 3, total: 6, dueDate: '2026-09-30' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRowHighlight(cert: AdvisorCertification): string {
  if (cert.status === 'EXPIRED') {
    return 'bg-red-50/50 dark:bg-red-900/10';
  }
  if (cert.status === 'EXPIRING_SOON') {
    return 'bg-amber-50/50 dark:bg-amber-900/10';
  }
  return '';
}

function getTrainingBarColor(completed: number, total: number): string {
  const pct = (completed / total) * 100;
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getTrainingStatus(item: TrainingItem): { label: string; color: string } {
  const pct = (item.completed / item.total) * 100;
  const now = new Date();
  const due = new Date(item.dueDate);

  if (pct >= 100) return { label: 'Completed', color: 'text-green-600 dark:text-green-400' };
  if (due < now) return { label: 'Overdue', color: 'text-red-600 dark:text-red-400' };
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue <= 30) return { label: 'Due Soon', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'In Progress', color: 'text-blue-600 dark:text-blue-400' };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComplianceTracker({ advisorId }: ComplianceTrackerProps) {
  const { data: certifications = [], isLoading } = useAdvisorCertifications(advisorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const expiredCount = certifications.filter((c) => c.status === 'EXPIRED').length;
  const expiringSoonCount = certifications.filter((c) => c.status === 'EXPIRING_SOON').length;
  const activeCount = certifications.filter((c) => c.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Certifications</p>
            <p className="text-xl font-bold font-mono">{activeCount}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
            <p className="text-xl font-bold font-mono">{expiringSoonCount}</p>
          </div>
        </div>

        <div
          className={cn(
            'rounded-xl border bg-card p-4 flex items-center gap-3',
            expiredCount > 0 && 'border-red-200 dark:border-red-800',
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expired</p>
            <p className={cn('text-xl font-bold font-mono', expiredCount > 0 && 'text-red-600 dark:text-red-400')}>
              {expiredCount}
            </p>
          </div>
        </div>
      </div>

      {/* Certification Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Certification Expiry Tracker</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Certification Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Issuing Body
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Expiry Date
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {certifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No certifications on record
                  </td>
                </tr>
              ) : (
                certifications.map((cert) => (
                  <tr
                    key={cert.id}
                    className={cn('border-b last:border-0 transition-colors', getRowHighlight(cert))}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-sm">{cert.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">{cert.issuingBody}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-sm font-mono',
                          cert.status === 'EXPIRED' && 'text-red-600 dark:text-red-400',
                          cert.status === 'EXPIRING_SOON' && 'text-amber-600 dark:text-amber-400',
                        )}
                      >
                        {formatDate(cert.expiryDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={cert.status} dot />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Training Completion */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Training Completion</h3>
        </div>

        <div className="space-y-4">
          {TRAINING_ITEMS.map((item) => {
            const pct = Math.round((item.completed / item.total) * 100);
            const barColor = getTrainingBarColor(item.completed, item.total);
            const status = getTrainingStatus(item);

            return (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className={cn('text-xs font-medium', status.color)}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {item.completed}/{item.total} modules
                    </span>
                    <span className="font-mono font-semibold">{pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Due: {formatDate(item.dueDate)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
