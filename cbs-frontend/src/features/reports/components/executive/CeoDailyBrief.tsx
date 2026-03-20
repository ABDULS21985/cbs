import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import { Sparkles } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BriefKpi {
  label: string;
  value: number;
  formatted: string;
  change: number;
  favorable: boolean;
}

export interface PendingApproval {
  type: string;
  count: number;
}

export interface RecentEvent {
  description: string;
  timestamp?: string;
}

interface CeoDailyBriefProps {
  kpis?: BriefKpi[];
  pendingApprovals?: PendingApproval[];
  recentEvents?: RecentEvent[];
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function generateBulletPoints(
  kpis: BriefKpi[],
  pendingApprovals: PendingApproval[],
  recentEvents: RecentEvent[],
): string[] {
  const bullets: string[] = [];

  // KPI highlights
  for (const kpi of kpis.slice(0, 3)) {
    const direction = kpi.change >= 0 ? 'up' : 'down';
    const favorable = kpi.favorable
      ? kpi.change >= 0
        ? '(favorable)'
        : '(unfavorable)'
      : kpi.change >= 0
      ? '(unfavorable)'
      : '(favorable)';
    bullets.push(
      `${kpi.label} stands at ${kpi.formatted}, ${direction} ${Math.abs(kpi.change).toFixed(1)}% ${favorable}.`,
    );
  }

  // Pending approvals
  const totalPending = pendingApprovals.reduce((s, a) => s + a.count, 0);
  if (totalPending > 0) {
    const details = pendingApprovals
      .filter((a) => a.count > 0)
      .map((a) => `${a.count} ${a.type}`)
      .join(', ');
    bullets.push(`${totalPending} items awaiting your approval: ${details}.`);
  }

  // Recent events
  for (const event of recentEvents.slice(0, 2)) {
    bullets.push(event.description);
  }

  return bullets.slice(0, 6);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BriefSkeleton() {
  return (
    <div className="bg-card rounded-lg border-l-4 border-l-primary border border-border p-6 animate-pulse space-y-3">
      <div className="h-5 w-64 bg-muted rounded" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 bg-muted rounded" style={{ width: `${80 - i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CeoDailyBrief({
  kpis = [],
  pendingApprovals = [],
  recentEvents = [],
  isLoading,
}: CeoDailyBriefProps) {
  if (isLoading) {
    return <BriefSkeleton />;
  }

  const bullets = generateBulletPoints(kpis, pendingApprovals, recentEvents);

  if (bullets.length === 0) {
    return null;
  }

  return (
    <div
      className="bg-card rounded-lg border-l-4 border-l-primary border border-border p-6 space-y-3"
      aria-label="CEO Daily Brief"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Daily Executive Brief</h2>
      </div>

      <p className="text-sm text-foreground leading-relaxed">
        {getGreeting()}. Here are today&apos;s highlights:
      </p>

      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground/60 pt-1">
        Auto-generated summary as of {new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
