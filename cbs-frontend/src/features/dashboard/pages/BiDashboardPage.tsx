import { useDeferredValue, useEffect, useMemo, useState, type ElementType } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Filter,
  LayoutDashboard,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DataTable, EmptyState, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';
import { dashboardApi, type BiDashboardDefinition, type BiDashboardWidget } from '../api/dashboardApi';
import { useBiDashboard, useBiDashboards } from '../hooks/useDashboardData';

const WIDGET_TYPES = [
  'STAT_CARD',
  'LINE_CHART',
  'BAR_CHART',
  'PIE_CHART',
  'DONUT_CHART',
  'AREA_CHART',
  'TABLE',
  'HEATMAP',
  'GAUGE',
  'KPI',
  'MAP',
  'TREEMAP',
  'FUNNEL',
];

const DASHBOARD_TYPES = ['EXECUTIVE', 'OPERATIONS', 'TREASURY', 'COMPLIANCE', 'RISK', 'CUSTOM'];

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRole(value: string): string {
  return formatLabel(value.replace(/^CBS_/, ''));
}

function formatCadence(seconds: number): string {
  if (seconds <= 0) {
    return 'On demand';
  }

  if (seconds % 3600 === 0) {
    return `${seconds / 3600}h`;
  }

  if (seconds % 60 === 0) {
    return `${seconds / 60}m`;
  }

  return `${seconds}s`;
}

function getLatestDashboard(dashboards: BiDashboardDefinition[]) {
  return dashboards.reduce<BiDashboardDefinition | null>((latest, dashboard) => {
    if (!latest) {
      return dashboard;
    }

    return new Date(dashboard.updatedAt).getTime() > new Date(latest.updatedAt).getTime()
      ? dashboard
      : latest;
  }, null);
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ElementType;
}) {
  return (
    <div className="bi-dashboard-kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="bi-dashboard-mini-icon">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DashboardCanvasCard({
  dashboard,
  onOpen,
}: {
  dashboard: BiDashboardDefinition;
  onOpen: () => void;
}) {
  const roles = dashboard.allowedRoles ?? [];

  return (
    <article className={cn('bi-dashboard-card', !dashboard.isActive && 'opacity-85')}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bi-dashboard-code-chip">{dashboard.dashboardCode}</span>
            <StatusBadge status={dashboard.dashboardType} />
            {dashboard.isDefault ? <span className="bi-dashboard-role-chip">Default view</span> : null}
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{dashboard.dashboardName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Refresh every {formatCadence(dashboard.refreshIntervalSec)} for role-scoped intelligence views.
            </p>
          </div>
        </div>
        <div className="bi-dashboard-mini-icon">
          <LayoutDashboard className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="bi-dashboard-stat-tile">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">State</p>
          <p className={cn('mt-2 text-sm font-semibold', dashboard.isActive ? 'text-emerald-600' : 'text-amber-600')}>
            {dashboard.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>
        <div className="bi-dashboard-stat-tile">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Roles</p>
          <p className="mt-2 text-sm font-semibold">{roles.length.toLocaleString()}</p>
        </div>
        <div className="bi-dashboard-stat-tile">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Updated</p>
          <p className="mt-2 text-sm font-semibold">{formatDateTime(dashboard.updatedAt)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {roles.length > 0 ? (
          roles.map((role) => (
            <span key={role} className="bi-dashboard-role-chip">
              {formatRole(role)}
            </span>
          ))
        ) : (
          <span className="bi-dashboard-role-chip">No role mapping configured</span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={onOpen} className="gap-2">
          Inspect Canvas
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

export function BiDashboardPage() {
  useEffect(() => {
    document.title = 'BI Dashboards | CBS';
  }, []);

  const queryClient = useQueryClient();
  const { data: dashboards = [], isLoading, isError, refetch } = useBiDashboards();

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [showAddWidget, setShowAddWidget] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState('ALL');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const createMutation = useMutation({
    mutationFn: (data: Partial<BiDashboardDefinition>) => dashboardApi.createBiDashboard(data),
    onSuccess: () => {
      toast.success('Dashboard created');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'bi-dashboards'] });
      setShowCreate(false);
    },
    onError: () => toast.error('Failed to create dashboard'),
  });

  const addWidgetMutation = useMutation({
    mutationFn: ({ dashboardId, widget }: { dashboardId: number; widget: Partial<BiDashboardWidget> }) =>
      dashboardApi.addBiWidget(dashboardId, widget),
    onSuccess: () => {
      toast.success('Widget added');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'bi-dashboard'] });
      setShowAddWidget(null);
    },
    onError: () => toast.error('Failed to add widget'),
  });

  const typeFilters = useMemo(() => {
    const discovered = Array.from(new Set(dashboards.map((dashboard) => dashboard.dashboardType))).sort((left, right) =>
      left.localeCompare(right),
    );
    return ['ALL', ...discovered];
  }, [dashboards]);

  const filteredDashboards = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return dashboards
      .filter((dashboard) => selectedType === 'ALL' || dashboard.dashboardType === selectedType)
      .filter((dashboard) => {
        if (!query) {
          return true;
        }

        const haystack = [
          dashboard.dashboardCode,
          dashboard.dashboardName,
          dashboard.dashboardType,
          ...(dashboard.allowedRoles ?? []),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((left, right) => {
        const activityDiff = Number(right.isActive) - Number(left.isActive);
        if (activityDiff !== 0) {
          return activityDiff;
        }

        const defaultDiff = Number(right.isDefault) - Number(left.isDefault);
        if (defaultDiff !== 0) {
          return defaultDiff;
        }

        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [dashboards, deferredSearch, selectedType]);

  const uniqueRoles = useMemo(
    () => Array.from(new Set(dashboards.flatMap((dashboard) => dashboard.allowedRoles ?? []))).sort((left, right) => left.localeCompare(right)),
    [dashboards],
  );

  const activeDashboards = dashboards.filter((dashboard) => dashboard.isActive).length;
  const defaultDashboards = dashboards.filter((dashboard) => dashboard.isDefault).length;
  const averageRefresh = dashboards.length > 0
    ? Math.round(dashboards.reduce((sum, dashboard) => sum + dashboard.refreshIntervalSec, 0) / dashboards.length)
    : 0;
  const leadingType = useMemo(() => {
    const typeCounts = dashboards.reduce((counts, dashboard) => {
      counts.set(dashboard.dashboardType, (counts.get(dashboard.dashboardType) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());

    return Array.from(typeCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  }, [dashboards]);
  const fastestRefresh = dashboards.length > 0
    ? Math.min(...dashboards.map((dashboard) => dashboard.refreshIntervalSec))
    : null;
  const latestDashboard = useMemo(() => getLatestDashboard(dashboards), [dashboards]);

  const columns: ColumnDef<BiDashboardDefinition>[] = [
    {
      accessorKey: 'dashboardCode',
      header: 'Code',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowDetail(row.original.dashboardCode);
          }}
          className="font-mono text-primary hover:underline"
        >
          {row.original.dashboardCode}
        </button>
      ),
    },
    {
      accessorKey: 'dashboardName',
      header: 'Dashboard',
      cell: ({ row }) => (
        <div className="py-3">
          <p className="font-medium">{row.original.dashboardName}</p>
          <p className="text-xs text-muted-foreground">Updated {formatDateTime(row.original.updatedAt)}</p>
        </div>
      ),
    },
    {
      accessorKey: 'dashboardType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.dashboardType} />,
    },
    {
      accessorKey: 'allowedRoles',
      header: 'Roles',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1 py-3">
          {(row.original.allowedRoles ?? []).map((role) => (
            <span key={role} className="bi-dashboard-role-chip">
              {formatRole(role)}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'refreshIntervalSec',
      header: 'Cadence',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatCadence(row.original.refreshIntervalSec)}</span>
      ),
    },
    {
      accessorKey: 'isDefault',
      header: 'Default',
      cell: ({ row }) => (row.original.isDefault ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : '—'),
    },
    {
      accessorKey: 'isActive',
      header: 'State',
      cell: ({ row }) => (
        <span className={cn('text-sm font-medium', row.original.isActive ? 'text-emerald-600' : 'text-amber-600')}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="page-container space-y-6">
        <section className="bi-dashboard-hero-shell">
          <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_340px] xl:p-7">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="bi-dashboard-chip">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Live intelligence registry
                </div>
                <div className="bi-dashboard-chip">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Role-mapped intelligence canvases
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl space-y-3">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-[2.65rem]">
                      BI Dashboards
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                      Manage live intelligence canvases, role access, and refresh cadence for executive,
                      operational, treasury, and risk views without breaking the backend contract.
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowCreate(true)} className="gap-2 self-start">
                  <Plus className="h-4 w-4" />
                  New Dashboard
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Total Dashboards"
                  value={dashboards.length.toLocaleString()}
                  helper="All live dashboard definitions returned by the intelligence service."
                  icon={LayoutDashboard}
                />
                <MetricCard
                  label="Active Views"
                  value={activeDashboards.toLocaleString()}
                  helper="Dashboards currently available to operators and administrators."
                  icon={Activity}
                />
                <MetricCard
                  label="Default Views"
                  value={defaultDashboards.toLocaleString()}
                  helper="Default canvases assigned as the primary intelligence landing view."
                  icon={CheckCircle2}
                />
                <MetricCard
                  label="Role Coverage"
                  value={uniqueRoles.length.toLocaleString()}
                  helper="Unique roles currently mapped across all BI dashboards."
                  icon={ShieldCheck}
                />
              </div>
            </div>

            <aside className="bi-dashboard-sidebar-shell">
              <div className="space-y-4">
                <div className="bi-dashboard-side-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                    Operational posture
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="bi-dashboard-side-row">
                      <span className="text-sm text-muted-foreground">Average refresh</span>
                      <span className="font-semibold">{averageRefresh > 0 ? formatCadence(averageRefresh) : '—'}</span>
                    </div>
                    <div className="bi-dashboard-side-row">
                      <span className="text-sm text-muted-foreground">Fastest cadence</span>
                      <span className="font-semibold">{fastestRefresh != null ? formatCadence(fastestRefresh) : '—'}</span>
                    </div>
                    <div className="bi-dashboard-side-row">
                      <span className="text-sm text-muted-foreground">Top dashboard type</span>
                      <span className="font-semibold">{leadingType ? formatLabel(leadingType) : '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="bi-dashboard-side-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                    Latest change
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-base font-semibold">
                        {latestDashboard?.dashboardName ?? 'No dashboards yet'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {latestDashboard
                          ? `${formatLabel(latestDashboard.dashboardType)} · ${formatDateTime(latestDashboard.updatedAt)}`
                          : 'Create a dashboard to initialize the BI registry.'}
                      </p>
                    </div>
                    <a href="#bi-dashboard-registry" className="bi-dashboard-inline-action">
                      Review registry
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="bi-dashboard-workspace-shell" id="bi-dashboard-registry">
          <div className="bi-dashboard-banner">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                  Dashboard registry
                </p>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Design, govern, and inspect live canvases</h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    The workspace below is filtered directly from the intelligence dashboard feed. Search and
                    type filters are derived from the returned data, not hardcoded catalog entries.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bi-dashboard-chip">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  {filteredDashboards.length.toLocaleString()} visible
                </span>
                <span className="bi-dashboard-chip">
                  <Clock3 className="h-3.5 w-3.5 text-primary" />
                  {selectedType === 'ALL' ? 'All dashboard types' : formatLabel(selectedType)}
                </span>
              </div>
            </div>
          </div>

          <div className="bi-dashboard-content-shell space-y-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <div className="bi-dashboard-search-shell">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="bi-dashboard-search-input"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by code, name, role, or dashboard type"
                  />
                </div>

                <nav aria-label="Dashboard types" className="flex flex-wrap gap-2">
                  {typeFilters.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={cn(
                        'bi-dashboard-filter-button',
                        selectedType === type && 'bi-dashboard-filter-button-active',
                      )}
                    >
                      <span>{type === 'ALL' ? 'All dashboards' : formatLabel(type)}</span>
                      <span className="bi-dashboard-filter-count">
                        {type === 'ALL'
                          ? dashboards.length.toLocaleString()
                          : dashboards.filter((dashboard) => dashboard.dashboardType === type).length.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="bi-dashboard-note-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Coverage note</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {uniqueRoles.length > 0
                    ? `Currently mapped roles: ${uniqueRoles.map((role) => formatRole(role)).join(', ')}.`
                    : 'No roles are mapped yet. The next dashboard created will establish role coverage.'}
                </p>
              </div>
            </div>

            {isError ? (
              <div className="bi-dashboard-note-card bi-dashboard-note-card-error flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-600">Unable to load BI dashboards</p>
                  <p className="text-sm text-muted-foreground">
                    The intelligence registry could not be loaded from the backend.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : null}

            {!isError && filteredDashboards.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-3">
                {filteredDashboards.slice(0, 3).map((dashboard) => (
                  <DashboardCanvasCard
                    key={dashboard.id}
                    dashboard={dashboard}
                    onOpen={() => setShowDetail(dashboard.dashboardCode)}
                  />
                ))}
              </div>
            ) : null}

            {!isError && !isLoading && filteredDashboards.length === 0 ? (
              <div className="bi-dashboard-section-card">
                <EmptyState
                  title="No dashboards match this workspace"
                  description="Adjust the search term or dashboard-type filter to see the live registry again."
                  action={{ label: 'Create Dashboard', onClick: () => setShowCreate(true), icon: Plus }}
                />
              </div>
            ) : null}

            <div className="bi-dashboard-section-card">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">Registry table</h3>
                  <p className="text-sm text-muted-foreground">
                    Tabular governance view for every live BI dashboard definition.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Dashboard
                </Button>
              </div>

              <div className="bi-dashboard-table-shell">
                <DataTable
                  columns={columns}
                  data={filteredDashboards}
                  isLoading={isLoading}
                  onRowClick={(dashboard) => setShowDetail(dashboard.dashboardCode)}
                  emptyMessage="No dashboards match the current view"
                  pageSize={8}
                  getRowClassName={(dashboard) => cn(dashboard.isDefault && 'bg-primary/5')}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <CreateDashboardDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />

      {showDetail ? (
        <DashboardDetailDialog
          code={showDetail}
          onClose={() => setShowDetail(null)}
          onAddWidget={(dashboardId) => {
            setShowDetail(null);
            setShowAddWidget(dashboardId);
          }}
        />
      ) : null}

      {showAddWidget !== null ? (
        <AddWidgetDialog
          dashboardId={showAddWidget}
          open
          onClose={() => setShowAddWidget(null)}
          onSubmit={(widget) => addWidgetMutation.mutate({ dashboardId: showAddWidget, widget })}
          isSubmitting={addWidgetMutation.isPending}
        />
      ) : null}
    </>
  );
}

function CreateDashboardDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<BiDashboardDefinition>) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    dashboardCode: '',
    dashboardName: '',
    dashboardType: 'CUSTOM',
    refreshIntervalSec: 300,
    createdBy: '',
  });

  const handleSubmit = () => {
    if (!form.dashboardCode || !form.dashboardName) {
      toast.error('Code and name are required');
      return;
    }

    onSubmit({
      ...form,
      layoutConfig: { columns: 12 },
      allowedRoles: ['CBS_ADMIN', 'CBS_OFFICER'],
      isDefault: false,
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-0 bg-transparent p-0 shadow-none">
        <div className="bi-dashboard-modal-shell">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bi-dashboard-chip">
                <Plus className="h-3.5 w-3.5 text-primary" />
                New intelligence canvas
              </span>
            </div>
            <div>
              <DialogTitle>Create BI Dashboard</DialogTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a live dashboard definition and keep the initial layout aligned to the backend entity.
              </p>
            </div>
          </DialogHeader>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Dashboard Code *</Label>
              <Input
                className="bi-dashboard-field-input"
                value={form.dashboardCode}
                onChange={(event) =>
                  setForm({
                    ...form,
                    dashboardCode: event.target.value.toUpperCase().replace(/\s/g, '_'),
                  })
                }
                placeholder="EXEC_SUMMARY"
              />
            </div>
            <div className="space-y-2">
              <Label>Dashboard Name *</Label>
              <Input
                className="bi-dashboard-field-input"
                value={form.dashboardName}
                onChange={(event) => setForm({ ...form, dashboardName: event.target.value })}
                placeholder="Executive Summary"
              />
            </div>
            <div className="space-y-2">
              <Label>Dashboard Type</Label>
              <Select value={form.dashboardType} onValueChange={(value: string) => setForm({ ...form, dashboardType: value })}>
                <SelectTrigger className="bi-dashboard-field-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Refresh Interval (seconds)</Label>
              <Input
                className="bi-dashboard-field-input"
                type="number"
                min={0}
                value={form.refreshIntervalSec}
                onChange={(event) => setForm({ ...form, refreshIntervalSec: Number(event.target.value) })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Created By</Label>
              <Input
                className="bi-dashboard-field-input"
                value={form.createdBy}
                onChange={(event) => setForm({ ...form, createdBy: event.target.value })}
                placeholder="admin"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DashboardDetailDialog({
  code,
  onClose,
  onAddWidget,
}: {
  code: string;
  onClose: () => void;
  onAddWidget: (dashboardId: number) => void;
}) {
  const { data, isLoading, isError } = useBiDashboard(code);

  const widgetColumns: ColumnDef<BiDashboardWidget>[] = [
    {
      accessorKey: 'widgetCode',
      header: 'Widget',
      cell: ({ row }) => (
        <div className="py-3">
          <p className="font-mono text-sm text-primary">{row.original.widgetCode}</p>
          <p className="text-xs text-muted-foreground">{row.original.title}</p>
        </div>
      ),
    },
    {
      accessorKey: 'widgetType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.widgetType} />,
    },
    {
      accessorKey: 'dataSource',
      header: 'Data Source',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.dataSource}</span>,
    },
    {
      accessorKey: 'positionX',
      header: 'Layout',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.positionX},{row.original.positionY} · {row.original.width}x{row.original.height}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'State',
      cell: ({ row }) => (
        <span className={cn('text-sm font-medium', row.original.isActive ? 'text-emerald-600' : 'text-amber-600')}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const widgetCount = data?.widgets.length ?? 0;
  const activeWidgetCount = data?.widgets.filter((widget) => widget.isActive).length ?? 0;
  const uniqueSources = data ? new Set(data.widgets.map((widget) => widget.dataSource)).size : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl border-0 bg-transparent p-0 shadow-none">
        <div className="bi-dashboard-modal-shell">
          <DialogHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bi-dashboard-chip">
                <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                Dashboard detail
              </span>
              <span className="bi-dashboard-chip">{code}</span>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <DialogTitle>{data?.dashboard.dashboardName ?? `Dashboard: ${code}`}</DialogTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Canvas layout, widget registry, and role mappings for the selected dashboard definition.
                </p>
              </div>
              {data ? (
                <Button variant="outline" onClick={() => onAddWidget(data.dashboard.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Widget
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : isError ? (
            <div className="bi-dashboard-note-card bi-dashboard-note-card-error mt-6">
              <p className="text-sm font-semibold text-red-600">Dashboard detail could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The dashboard registry returned an error for this canvas.
              </p>
            </div>
          ) : data ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Widgets"
                  value={widgetCount.toLocaleString()}
                  helper="Total widgets currently attached to this canvas."
                  icon={LayoutDashboard}
                />
                <MetricCard
                  label="Active Widgets"
                  value={activeWidgetCount.toLocaleString()}
                  helper="Widgets currently enabled for rendering."
                  icon={CheckCircle2}
                />
                <MetricCard
                  label="Data Sources"
                  value={uniqueSources.toLocaleString()}
                  helper="Distinct datasource endpoints referenced by this canvas."
                  icon={Activity}
                />
                <MetricCard
                  label="Refresh Cadence"
                  value={formatCadence(data.dashboard.refreshIntervalSec)}
                  helper="Dashboard-level refresh cadence from the live definition."
                  icon={Clock3}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="bi-dashboard-section-card">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold tracking-tight">Canvas layout & widgets</h3>
                    <p className="text-sm text-muted-foreground">
                      Widget registry for the selected dashboard definition.
                    </p>
                  </div>

                  <div className="bi-dashboard-table-shell">
                    {widgetCount > 0 ? (
                      <DataTable columns={widgetColumns} data={data.widgets} pageSize={6} />
                    ) : (
                      <EmptyState title="No widgets configured" description="Add a widget to start rendering this dashboard." />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bi-dashboard-side-card">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                      Definition summary
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="bi-dashboard-side-row">
                        <span className="text-sm text-muted-foreground">Type</span>
                        <StatusBadge status={data.dashboard.dashboardType} />
                      </div>
                      <div className="bi-dashboard-side-row">
                        <span className="text-sm text-muted-foreground">Created by</span>
                        <span className="font-semibold">{data.dashboard.createdBy || '—'}</span>
                      </div>
                      <div className="bi-dashboard-side-row">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="font-semibold">{formatDateTime(data.dashboard.createdAt)}</span>
                      </div>
                      <div className="bi-dashboard-side-row">
                        <span className="text-sm text-muted-foreground">State</span>
                        <span className={cn('font-semibold', data.dashboard.isActive ? 'text-emerald-600' : 'text-amber-600')}>
                          {data.dashboard.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bi-dashboard-side-card">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                      Access roles
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(data.dashboard.allowedRoles ?? []).length > 0 ? (
                        data.dashboard.allowedRoles.map((role) => (
                          <span key={role} className="bi-dashboard-role-chip">
                            {formatRole(role)}
                          </span>
                        ))
                      ) : (
                        <span className="bi-dashboard-role-chip">No access roles configured</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState title="Dashboard not found" description="The requested dashboard code is not available in the registry." />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddWidgetDialog({
  dashboardId,
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  dashboardId: number;
  open: boolean;
  onClose: () => void;
  onSubmit: (widget: Partial<BiDashboardWidget>) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    widgetCode: '',
    widgetType: 'STAT_CARD',
    title: '',
    dataSource: '',
    positionX: 0,
    positionY: 0,
    width: 4,
    height: 3,
  });

  const handleSubmit = () => {
    if (!form.widgetCode || !form.title || !form.dataSource) {
      toast.error('Code, title, and data source are required');
      return;
    }

    onSubmit({
      ...form,
      dashboardId,
      queryConfig: {},
      displayConfig: {},
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-0 bg-transparent p-0 shadow-none">
        <div className="bi-dashboard-modal-shell">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bi-dashboard-chip">
                <Plus className="h-3.5 w-3.5 text-primary" />
                Widget configuration
              </span>
              <span className="bi-dashboard-chip">Dashboard #{dashboardId}</span>
            </div>
            <div>
              <DialogTitle>Configure Widget</DialogTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a widget definition and layout coordinates for the selected BI dashboard.
              </p>
            </div>
          </DialogHeader>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Widget Code *</Label>
              <Input
                className="bi-dashboard-field-input"
                value={form.widgetCode}
                onChange={(event) => setForm({ ...form, widgetCode: event.target.value })}
                placeholder="total_deposits"
              />
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                className="bi-dashboard-field-input"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Total Deposits"
              />
            </div>
            <div className="space-y-2">
              <Label>Widget Type</Label>
              <Select value={form.widgetType} onValueChange={(value: string) => setForm({ ...form, widgetType: value })}>
                <SelectTrigger className="bi-dashboard-field-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Source *</Label>
              <Input
                className="bi-dashboard-field-input"
                value={form.dataSource}
                onChange={(event) => setForm({ ...form, dataSource: event.target.value })}
                placeholder="/api/v1/dashboard/stats"
              />
            </div>
            <div className="grid gap-4 md:col-span-2 md:grid-cols-4">
              <div className="space-y-2">
                <Label>X</Label>
                <Input
                  className="bi-dashboard-field-input"
                  type="number"
                  value={form.positionX}
                  onChange={(event) => setForm({ ...form, positionX: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Y</Label>
                <Input
                  className="bi-dashboard-field-input"
                  type="number"
                  value={form.positionY}
                  onChange={(event) => setForm({ ...form, positionY: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Width</Label>
                <Input
                  className="bi-dashboard-field-input"
                  type="number"
                  value={form.width}
                  onChange={(event) => setForm({ ...form, width: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Height</Label>
                <Input
                  className="bi-dashboard-field-input"
                  type="number"
                  value={form.height}
                  onChange={(event) => setForm({ ...form, height: Number(event.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Widget
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
