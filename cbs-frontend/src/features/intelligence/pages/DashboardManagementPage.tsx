import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard, EmptyState } from '@/components/shared';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import {
  LayoutDashboard,
  Plus,
  Eye,
  Loader2,
  Settings2,
  Activity,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useAllDashboards,
  useCreateDashboard,
  type DashboardDefinition,
} from '../hooks/useIntelligence';

// ---- Constants ------------------------------------------------------------------

const DASHBOARD_TYPES = [
  'EXECUTIVE', 'OPERATIONS', 'RISK', 'COMPLIANCE', 'BRANCH',
  'PRODUCT', 'CUSTOMER', 'TREASURY', 'IT', 'CUSTOM',
] as const;

// ---- Create Dialog --------------------------------------------------------------

function CreateDashboardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateDashboard();
  const [dashboardCode, setDashboardCode] = useState('');
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardType, setDashboardType] = useState<string>('EXECUTIVE');
  const [refreshInterval, setRefreshInterval] = useState(300);

  const handleSubmit = () => {
    create.mutate(
      {
        dashboardCode,
        dashboardName,
        dashboardType: dashboardType as DashboardDefinition['dashboardType'],
        refreshIntervalSec: refreshInterval,
        isActive: true,
        isDefault: false,
      },
      {
        onSuccess: () => {
          onClose();
          setDashboardCode('');
          setDashboardName('');
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold">Create Dashboard</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Dashboard Code</label>
            <input
              value={dashboardCode}
              onChange={(e) => setDashboardCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. EXEC_OVERVIEW"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Dashboard Name</label>
            <input
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Executive Overview"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <select
              value={dashboardType}
              onChange={(e) => setDashboardType(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {DASHBOARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Refresh Interval (seconds)</label>
            <input
              type="number"
              min={10}
              max={3600}
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={create.isPending || !dashboardCode.trim() || !dashboardName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function DashboardManagementPage() {
  const navigate = useNavigate();
  const { data: dashboards = [], isLoading } = useAllDashboards();
  const [showCreate, setShowCreate] = useState(false);

  const activeCount = dashboards.filter((d) => d.isActive).length;
  const defaultCount = dashboards.filter((d) => d.isDefault).length;

  const columns: ColumnDef<DashboardDefinition>[] = [
    {
      accessorKey: 'dashboardCode',
      header: 'Code',
      cell: ({ row }) => (
        <button
          onClick={() => navigate(`/intelligence/dashboards/${row.original.dashboardCode}`)}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.original.dashboardCode}
        </button>
      ),
    },
    {
      accessorKey: 'dashboardName',
      header: 'Name',
      cell: ({ getValue }) => <span className="text-sm font-medium">{String(getValue())}</span>,
    },
    {
      accessorKey: 'dashboardType',
      header: 'Type',
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    {
      accessorKey: 'refreshIntervalSec',
      header: 'Refresh',
      cell: ({ getValue }) => <span className="text-xs tabular-nums">{String(getValue())}s</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Active',
      cell: ({ getValue }) => (
        <StatusBadge status={getValue() ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      accessorKey: 'isDefault',
      header: 'Default',
      cell: ({ getValue }) => (
        getValue() ? <span className="text-xs text-primary font-medium">Yes</span> : <span className="text-xs text-muted-foreground">No</span>
      ),
    },
    {
      accessorKey: 'createdBy',
      header: 'Created By',
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{String(getValue() || '—')}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{formatRelative(String(getValue()))}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => navigate(`/intelligence/dashboards/${row.original.dashboardCode}`)}
          className="text-muted-foreground hover:text-primary p-1"
          title="View Dashboard"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard Management"
        subtitle="Create and configure real-time BI dashboards with 13 widget types and role-based access"
        backTo="/intelligence"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" /> Create Dashboard
          </button>
        }
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Dashboards" value={dashboards.length} format="number" icon={LayoutDashboard} />
          <StatCard label="Active" value={activeCount} format="number" icon={Activity} />
          <StatCard label="Defaults" value={defaultCount} format="number" icon={Settings2} />
          <StatCard label="Widget Types" value={13} format="number" icon={LayoutDashboard} />
        </div>

        <DataTable
          columns={columns}
          data={dashboards}
          isLoading={isLoading}
          enableGlobalFilter
        />
      </div>

      <CreateDashboardDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
