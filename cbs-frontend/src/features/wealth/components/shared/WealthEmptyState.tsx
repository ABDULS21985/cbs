import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ─── Type Configurations ─────────────────────────────────────────────────────

type EmptyStateType = 'plans' | 'advisors' | 'trusts' | 'distributions' | 'clients' | 'generic';

interface EmptyStateConfig {
  title: string;
  description: string;
  icon: 'document' | 'folder' | 'users' | 'distribution';
}

const TYPE_CONFIG: Record<EmptyStateType, EmptyStateConfig> = {
  plans: {
    title: 'No wealth plans yet',
    description: 'Create your first plan to get started with wealth management.',
    icon: 'document',
  },
  advisors: {
    title: 'No advisors found',
    description: 'Add financial advisors to manage client portfolios.',
    icon: 'users',
  },
  trusts: {
    title: 'No trust accounts',
    description: 'Set up a trust account to manage fiduciary assets.',
    icon: 'folder',
  },
  distributions: {
    title: 'No distributions scheduled',
    description: 'Create a distribution schedule to manage trust payouts.',
    icon: 'distribution',
  },
  clients: {
    title: 'No clients assigned',
    description: 'Assign clients to begin managing their wealth portfolios.',
    icon: 'users',
  },
  generic: {
    title: 'No data available',
    description: 'There are no records to display at this time.',
    icon: 'document',
  },
};

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

function DocumentIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground/40"
      aria-hidden="true"
    >
      <rect x="10" y="6" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="16" x2="32" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="22" x2="32" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="28" x2="26" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground/40"
      aria-hidden="true"
    >
      <path
        d="M6 14C6 12.3431 7.34315 11 9 11H18L22 15H39C40.6569 15 42 16.3431 42 18V36C42 37.6569 40.6569 39 39 39H9C7.34315 39 6 37.6569 6 36V14Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground/40"
      aria-hidden="true"
    >
      <circle cx="18" cy="16" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 36C8 30.4772 12.4772 26 18 26C23.5228 26 28 30.4772 28 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="18" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M30 36C30 31.5817 33.5817 28 38 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DistributionIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground/40"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" />
      <path d="M24 14V24L30 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICON_COMPONENTS: Record<EmptyStateConfig['icon'], React.FC> = {
  document: DocumentIcon,
  folder: FolderIcon,
  users: UsersIcon,
  distribution: DistributionIcon,
};

// ─── Empty State Component ───────────────────────────────────────────────────

interface WealthEmptyStateProps {
  type: EmptyStateType;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function WealthEmptyState({
  type,
  actionLabel,
  onAction,
  actionHref,
}: WealthEmptyStateProps) {
  const config = TYPE_CONFIG[type];
  const IconComponent = ICON_COMPONENTS[config.icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4">
        <IconComponent />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{config.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {config.description}
      </p>
      {actionLabel && actionHref && (
        <Link
          to={actionHref}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
          )}
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          onClick={onAction}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
