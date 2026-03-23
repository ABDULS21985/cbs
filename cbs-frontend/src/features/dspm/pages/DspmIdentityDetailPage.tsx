import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { User, Shield, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import { useDspmIdentity, useDspmIdentityAuditPaged } from '../hooks/useDspm';
import type { DspmAccessAudit } from '../types/dspm';
import { toRiskScore } from '../types/dspm';

// ─── Audit Trail Table ───────────────────────────────────────────────────────

function AuditTrailTab({ identityCode }: { identityCode: string }) {
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: pagedResult, isLoading } = useDspmIdentityAuditPaged(identityCode, {
    page,
    size: pageSize,
  });

  const auditRecords = pagedResult?.data ?? [];
  const pageMeta = pagedResult?.page;
  // totalPages comes from the backend; fall back gracefully if PageMeta is absent
  const totalPages = pageMeta?.totalPages ?? (auditRecords.length === pageSize ? page + 2 : page + 1);
  const totalElements = pageMeta?.totalElements;
  const hasMore = page < totalPages - 1;

  const columns: ColumnDef<DspmAccessAudit, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'occurredAt',
        header: 'Occurred At',
        cell: ({ row }) =>
          row.original.occurredAt ? formatDateTime(row.original.occurredAt) : '—',
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <span className="font-medium text-xs">{row.original.action?.replace(/_/g, ' ')}</span>
        ),
      },
      {
        accessorKey: 'resourcePath',
        header: 'Resource Path',
        cell: ({ row }) => (
          <span className="font-mono text-xs truncate max-w-[200px] block">
            {row.original.resourcePath ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'recordsAffected',
        header: 'Records Affected',
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.recordsAffected?.toLocaleString() ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'sensitiveFields',
        header: 'Sensitive Fields',
        cell: ({ row }) => {
          const fields = row.original.sensitiveFields ?? [];
          return (
            <span className={cn('text-xs', fields.length > 0 && 'text-amber-600 font-semibold')}>
              {fields.length}
            </span>
          );
        },
      },
      {
        accessorKey: 'outcome',
        header: 'Outcome',
        cell: ({ row }) => <StatusBadge status={row.original.outcome} dot />,
      },
      {
        accessorKey: 'riskFlag',
        header: 'Risk Flag',
        cell: ({ row }) =>
          row.original.riskFlag ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="w-3 h-3" />
              RISK
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP Address',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ipAddress ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="p-6 space-y-4">
      <DataTable
        columns={columns}
        data={auditRecords}
        isLoading={isLoading}
        enableGlobalFilter
        searchPlaceholder="Search audit records..."
        emptyMessage="No audit records found for this identity."
        pageSize={pageSize}
      />
      {/* Server-side pagination controls — driven by real PageMeta from backend */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page + 1} of {totalPages}
          {totalElements != null && (
            <span className="ml-2 text-xs">({totalElements.toLocaleString()} total)</span>
          )}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
            className="px-3 py-1.5 rounded-md border text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore || isLoading}
            className="px-3 py-1.5 rounded-md border text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
  identity,
}: {
  identity: {
    identityCode: string;
    identityType: string;
    email: string;
    department: string;
    role: string;
    accessLevel: string;
    riskScore: number | string;
    dataSourcesCount: number;
    lastAccessAt: string;
    status: string;
  };
}) {
  const rs = toRiskScore(identity.riskScore);
  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Identity Code', value: <span className="font-mono text-xs">{identity.identityCode}</span> },
    { label: 'Type', value: identity.identityType?.replace(/_/g, ' ') },
    { label: 'Email', value: identity.email ?? '—' },
    { label: 'Department', value: identity.department ?? '—' },
    { label: 'Role', value: identity.role ?? '—' },
    { label: 'Access Level', value: identity.accessLevel ?? '—' },
    {
      label: 'Risk Score',
      value: (
        <span
          className={cn(
            'font-semibold',
            rs >= 80 ? 'text-red-600' : rs >= 50 ? 'text-amber-600' : 'text-green-600',
          )}
        >
          {rs.toFixed(1)}
        </span>
      ),
    },
    { label: 'Data Sources', value: identity.dataSourcesCount?.toLocaleString() ?? '—' },
    {
      label: 'Last Access',
      value: identity.lastAccessAt ? formatRelative(identity.lastAccessAt) : '—',
    },
    { label: 'Status', value: <StatusBadge status={identity.status} dot /> },
  ];

  return (
    <div className="p-6">
      <div className="surface-card p-6">
        <h3 className="text-sm font-semibold mb-4">Identity Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">{f.label}</p>
              <div className="text-sm">{f.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function DspmIdentityDetailPage() {
  const { identityCode } = useParams<{ identityCode: string }>();
  const { data: identity, isLoading } = useDspmIdentity(identityCode ?? '');
  // Coerce once so all JSX below can use the safe numeric value
  const riskScoreNum = toRiskScore(identity?.riskScore);

  useEffect(() => {
    document.title = identity
      ? `${identity.identityName} | Identities | DSPM | CBS`
      : 'Identity Detail | DSPM | CBS';
  }, [identity]);

  if (isLoading || !identity) {
    return (
      <>
        <PageHeader title="Identity Detail" backTo="/dspm/identities" icon={User} />
        <div className="page-container">
          <div className="animate-pulse h-96 bg-muted rounded-lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={identity.identityName}
        subtitle={`${identity.identityType?.replace(/_/g, ' ')} · ${identity.department ?? 'N/A'}`}
        backTo="/dspm/identities"
        icon={User}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={identity.status} dot />
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                riskScoreNum >= 80
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : riskScoreNum >= 50
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              )}
            >
              <Shield className="w-3 h-3" />
              Risk: {riskScoreNum.toFixed(1)}
            </span>
          </div>
        }
      />

      <div className="page-container">
        <TabsPage
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              icon: User,
              content: <OverviewTab identity={identity} />,
            },
            {
              id: 'audit-trail',
              label: 'Audit Trail',
              icon: Clock,
              content: <AuditTrailTab identityCode={identityCode!} />,
            },
          ]}
          defaultTab="overview"
          syncWithUrl
        />
      </div>
    </>
  );
}
