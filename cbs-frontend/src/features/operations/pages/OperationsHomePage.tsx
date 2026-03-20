import { Link } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  GitBranch,
  CheckCircle,
  Globe,
  CreditCard,
  FileText,
  AlertTriangle,
  ChevronRight,
  MonitorCheck,
  Landmark,
  Users,
  FileCheck,
  Archive,
  RefreshCw,
  Inbox,
  Smartphone,
  BarChart3,
  ClipboardList,
  Network,
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
    icon: Network,
    name: 'Branch Network',
    description: 'Branch hierarchy, regions, and network map',
    href: '/operations/branch-network',
    accent: 'text-emerald-500',
  },
  {
    icon: BarChart3,
    name: 'Branch Performance',
    description: 'KPI rankings, targets, and trend analysis',
    href: '/operations/branch-performance',
    accent: 'text-lime-500',
  },
  {
    icon: CheckCircle,
    name: 'Approval Queue',
    description: 'Review and action workflow approval requests',
    href: '/operations/approvals',
    accent: 'text-amber-500',
  },
  {
    icon: ClipboardList,
    name: 'Approval Workbench',
    description: 'Multi-step approvals with SLA tracking and history',
    href: '/operations/approval-workbench',
    accent: 'text-yellow-500',
  },
  {
    icon: MonitorCheck,
    name: 'ATM Fleet',
    description: 'Terminal health, low cash alerts, replenishment',
    href: '/operations/atm',
    accent: 'text-sky-500',
  },
  {
    icon: Landmark,
    name: 'Vault & Cash',
    description: 'Vault balances, cash movements, denominations',
    href: '/operations/vaults',
    accent: 'text-indigo-500',
  },
  {
    icon: Users,
    name: 'Agent Banking',
    description: 'Agent network, transactions, float management',
    href: '/operations/agent-banking',
    accent: 'text-purple-500',
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
    icon: FileCheck,
    name: 'Bank Drafts',
    description: 'Issue, stop, pay, and reissue bank drafts',
    href: '/operations/bank-drafts',
    accent: 'text-rose-500',
  },
  {
    icon: Archive,
    name: 'Lockbox',
    description: 'Lockbox receipts, item processing, exceptions',
    href: '/operations/lockbox',
    accent: 'text-fuchsia-500',
  },
  {
    icon: RefreshCw,
    name: 'Reconciliation',
    description: 'Nostro/vostro matching, break resolution',
    href: '/operations/reconciliation',
    accent: 'text-teal-500',
  },
  {
    icon: Inbox,
    name: 'Open Items',
    description: 'Aging suspense items, assignment and escalation',
    href: '/operations/open-items',
    accent: 'text-orange-500',
  },
  {
    icon: Smartphone,
    name: 'Issued Devices',
    description: 'POS terminals, tokens, device lifecycle tracking',
    href: '/operations/devices',
    accent: 'text-red-500',
  },
  {
    icon: FileText,
    name: 'Document Management',
    description: 'Document library, OCR review, retention policies',
    href: '/operations/documents',
    accent: 'text-slate-500',
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
