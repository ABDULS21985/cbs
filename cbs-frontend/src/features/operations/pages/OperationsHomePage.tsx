import { Link } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  GitBranch,
  CheckCircle,
  Globe,
  CreditCard,
  FileText,
  Headphones,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useWorkflowTasks } from '../hooks/useWorkflowTasks';

// ─── Quick Link cards ──────────────────────────────────────────────────────────

interface QuickLink {
  icon: React.ElementType;
  name: string;
  description: string;
  href: string;
  accent?: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    icon: Clock,
    name: 'EOD Processing',
    description: 'End-of-day batch runs, scheduling, and rollback',
    href: '/operations/eod',
    accent: 'text-blue-500',
  },
  {
    icon: BookOpen,
    name: 'General Ledger',
    description: 'Journal entries, trial balance, chart of accounts',
    href: '/operations/gl',
    accent: 'text-violet-500',
  },
  {
    icon: GitBranch,
    name: 'Branch Operations',
    description: 'Branch management, queue, staff scheduling',
    href: '/operations/branches',
    accent: 'text-green-500',
  },
  {
    icon: CheckCircle,
    name: 'Approval Queue',
    description: 'Review and action workflow approval requests',
    href: '/operations/approvals',
    accent: 'text-amber-500',
  },
  {
    icon: Globe,
    name: 'Gateway Console',
    description: 'Payment gateway health, routing, and diagnostics',
    href: '/operations/gateway',
    accent: 'text-cyan-500',
  },
  {
    icon: CreditCard,
    name: 'ACH Operations',
    description: 'Automated clearing house batch processing',
    href: '/operations/ach',
    accent: 'text-pink-500',
  },
  {
    icon: FileText,
    name: 'Document Management',
    description: 'Document library, OCR review, retention policies',
    href: '/operations/documents',
    accent: 'text-orange-500',
  },
  {
    icon: Headphones,
    name: 'Contact Center',
    description: 'Agent console, case routing, customer support',
    href: '/operations/contact-center',
    accent: 'text-teal-500',
  },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function OperationsHomePage() {
  const { data: pendingTasks } = useWorkflowTasks({ status: 'PENDING', size: 1 });
  const pendingApprovals = pendingTasks?.totalElements ?? 0;

  return (
    <>
      <PageHeader
        title="Operations"
        subtitle="Core banking operations hub"
      />
      <div className="page-container space-y-6">
        {/* Alert section */}
        {pendingApprovals > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {pendingApprovals} approval{pendingApprovals !== 1 ? 's' : ''} pending review
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Workflow tasks are awaiting decision. SLA timers are running.
              </p>
            </div>
            <Link
              to="/operations/approvals"
              className="text-xs text-amber-700 dark:text-amber-300 font-medium hover:underline whitespace-nowrap"
            >
              Review now <ChevronRight className="inline w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Quick Links */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="group flex flex-col gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${link.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{link.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{link.description}</p>
                  </div>
                  <div className="flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6">
          <p className="text-sm font-medium">Recent activity feed unavailable</p>
          <p className="text-sm text-muted-foreground mt-1">
            This page no longer shows placeholder operational events. Wire a backend activity endpoint before restoring this panel.
          </p>
        </div>
      </div>
    </>
  );
}
