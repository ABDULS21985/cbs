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
  Activity,
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

// ─── Recent Activity placeholder ───────────────────────────────────────────────

const PLACEHOLDER_ACTIVITY = [
  { id: 1, text: 'EOD batch completed successfully', time: '2 hours ago', type: 'success' },
  { id: 2, text: '3 loan approvals pending review', time: '4 hours ago', type: 'warning' },
  { id: 3, text: 'ACH batch #20260319-02 processed 1,240 items', time: '6 hours ago', type: 'info' },
  { id: 4, text: 'Branch "Ikeja" opened for the day', time: '8 hours ago', type: 'info' },
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

        {/* Recent Activity */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Activity
            </h2>
          </div>
          <div className="rounded-lg border border-border divide-y divide-border">
            {PLACEHOLDER_ACTIVITY.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.type === 'success'
                      ? 'bg-green-500'
                      : item.type === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                />
                <span className="text-sm flex-1">{item.text}</span>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
