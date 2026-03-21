import { useEffect, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, EmptyState, DataTable } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { LayoutDashboard, Plus, Eye, Loader2, Settings, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';
import { useBiDashboards, useBiDashboard } from '../hooks/useDashboardData';
import { dashboardApi, type BiDashboardDefinition, type BiDashboardWidget } from '../api/dashboardApi';
import { formatDateTime } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';

const WIDGET_TYPES = [
  'STAT_CARD', 'LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'DONUT_CHART',
  'AREA_CHART', 'TABLE', 'HEATMAP', 'GAUGE', 'KPI', 'MAP', 'TREEMAP', 'FUNNEL',
];

const DASHBOARD_TYPES = ['EXECUTIVE', 'OPERATIONS', 'TREASURY', 'COMPLIANCE', 'RISK', 'CUSTOM'];

export function BiDashboardPage() {
  useEffect(() => { document.title = 'BI Dashboards | CBS'; }, []);
  const queryClient = useQueryClient();
  const { data: dashboards = [], isLoading, isError, refetch } = useBiDashboards();

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [showAddWidget, setShowAddWidget] = useState<number | null>(null);

  // Create dashboard mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<BiDashboardDefinition>) => dashboardApi.createBiDashboard(data),
    onSuccess: () => {
      toast.success('Dashboard created');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'bi-dashboards'] });
      setShowCreate(false);
    },
    onError: () => toast.error('Failed to create dashboard'),
  });

  // Add widget mutation
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

  const columns: ColumnDef<BiDashboardDefinition>[] = [
    { accessorKey: 'dashboardCode', header: 'Code', cell: ({ row }) => (
      <button onClick={() => setShowDetail(row.original.dashboardCode)} className="font-mono text-primary hover:underline">
        {row.original.dashboardCode}
      </button>
    )},
    { accessorKey: 'dashboardName', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.dashboardName}</span> },
    { accessorKey: 'dashboardType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.dashboardType} /> },
    { accessorKey: 'refreshIntervalSec', header: 'Refresh (s)' },
    { accessorKey: 'allowedRoles', header: 'Roles', cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {(row.original.allowedRoles ?? []).map((r) => (
          <span key={r} className="text-xs px-1.5 py-0.5 rounded bg-muted">{r}</span>
        ))}
      </div>
    )},
    { accessorKey: 'isDefault', header: 'Default', cell: ({ row }) => row.original.isDefault ? '✓' : '' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => (
      <span className={row.original.isActive ? 'text-green-600' : 'text-red-600'}>{row.original.isActive ? 'Yes' : 'No'}</span>
    )},
    { accessorKey: 'createdBy', header: 'Created By' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => formatDateTime(row.original.createdAt) },
  ];

  const activeDashboards = dashboards.filter((d) => d.isActive).length;

  return (
    <>
      <PageHeader
        title="BI Dashboards"
        subtitle="Configurable dashboards with role-based access and 13 widget types"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Dashboard
          </Button>
        }
      />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Dashboards" value={dashboards.length} format="number" icon={LayoutDashboard} loading={isLoading} />
          <StatCard label="Active" value={activeDashboards} format="number" icon={Eye} loading={isLoading} />
          <StatCard label="Widget Types" value={13} format="number" icon={Grid3x3} />
          <StatCard label="Dashboard Types" value={DASHBOARD_TYPES.length} format="number" icon={Settings} />
        </div>

        {isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 flex items-center justify-between">
            <p className="text-sm text-red-600">Failed to load dashboards</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <DataTable columns={columns} data={dashboards} isLoading={isLoading} searchColumn="dashboardName" searchPlaceholder="Search dashboards..." />
        )}
      </div>

      {/* Create Dashboard Dialog */}
      <CreateDashboardDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />

      {/* Dashboard Detail */}
      {showDetail && (
        <DashboardDetailDialog
          code={showDetail}
          onClose={() => setShowDetail(null)}
          onAddWidget={(dashboardId) => { setShowDetail(null); setShowAddWidget(dashboardId); }}
        />
      )}

      {/* Add Widget Dialog */}
      {showAddWidget !== null && (
        <AddWidgetDialog
          dashboardId={showAddWidget}
          open
          onClose={() => setShowAddWidget(null)}
          onSubmit={(widget) => addWidgetMutation.mutate({ dashboardId: showAddWidget, widget })}
          isSubmitting={addWidgetMutation.isPending}
        />
      )}
    </>
  );
}

// ─── Create Dashboard Dialog ────────────────────────────────────────────────

function CreateDashboardDialog({ open, onClose, onSubmit, isSubmitting }: {
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create BI Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Dashboard Code *</Label>
            <Input value={form.dashboardCode} onChange={(e) => setForm({ ...form, dashboardCode: e.target.value.toUpperCase().replace(/\s/g, '_') })} placeholder="EXEC_SUMMARY" />
          </div>
          <div>
            <Label>Dashboard Name *</Label>
            <Input value={form.dashboardName} onChange={(e) => setForm({ ...form, dashboardName: e.target.value })} placeholder="Executive Summary" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.dashboardType} onValueChange={(v) => setForm({ ...form, dashboardType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DASHBOARD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Refresh Interval (seconds)</Label>
            <Input type="number" value={form.refreshIntervalSec} onChange={(e) => setForm({ ...form, refreshIntervalSec: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Created By</Label>
            <Input value={form.createdBy} onChange={(e) => setForm({ ...form, createdBy: e.target.value })} placeholder="admin" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dashboard Detail Dialog ────────────────────────────────────────────────

function DashboardDetailDialog({ code, onClose, onAddWidget }: {
  code: string;
  onClose: () => void;
  onAddWidget: (dashboardId: number) => void;
}) {
  const { data, isLoading } = useBiDashboard(code);

  const widgetColumns: ColumnDef<BiDashboardWidget>[] = [
    { accessorKey: 'widgetCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.widgetCode}</span> },
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'widgetType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.widgetType} /> },
    { accessorKey: 'dataSource', header: 'Data Source', cell: ({ row }) => <span className="font-mono text-xs">{row.original.dataSource}</span> },
    { accessorKey: 'width', header: 'W' },
    { accessorKey: 'height', header: 'H' },
    { accessorKey: 'positionX', header: 'X' },
    { accessorKey: 'positionY', header: 'Y' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => row.original.isActive ? '✓' : '✗' },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Dashboard: {code}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {data.dashboard.dashboardName}</div>
              <div><span className="text-muted-foreground">Type:</span> <StatusBadge status={data.dashboard.dashboardType} /></div>
              <div><span className="text-muted-foreground">Refresh:</span> {data.dashboard.refreshIntervalSec}s</div>
              <div><span className="text-muted-foreground">Active:</span> {data.dashboard.isActive ? 'Yes' : 'No'}</div>
              <div><span className="text-muted-foreground">Roles:</span> {(data.dashboard.allowedRoles ?? []).join(', ')}</div>
              <div><span className="text-muted-foreground">Created:</span> {formatDateTime(data.dashboard.createdAt)}</div>
            </div>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Widgets ({data.widgets?.length ?? 0})</h4>
              <Button size="sm" variant="outline" onClick={() => onAddWidget(data.dashboard.id)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Widget
              </Button>
            </div>
            {data.widgets && data.widgets.length > 0 ? (
              <DataTable columns={widgetColumns} data={data.widgets} />
            ) : (
              <EmptyState title="No widgets" subtitle="Add widgets to populate this dashboard" />
            )}
          </div>
        ) : (
          <EmptyState title="Dashboard not found" />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Widget Dialog ──────────────────────────────────────────────────────

function AddWidgetDialog({ dashboardId, open, onClose, onSubmit, isSubmitting }: {
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Widget Code *</Label>
            <Input value={form.widgetCode} onChange={(e) => setForm({ ...form, widgetCode: e.target.value })} placeholder="total_deposits" />
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Total Deposits" />
          </div>
          <div>
            <Label>Widget Type</Label>
            <Select value={form.widgetType} onValueChange={(v) => setForm({ ...form, widgetType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WIDGET_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data Source *</Label>
            <Input value={form.dataSource} onChange={(e) => setForm({ ...form, dataSource: e.target.value })} placeholder="/api/v1/dashboard/stats" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div><Label>X</Label><Input type="number" value={form.positionX} onChange={(e) => setForm({ ...form, positionX: Number(e.target.value) })} /></div>
            <div><Label>Y</Label><Input type="number" value={form.positionY} onChange={(e) => setForm({ ...form, positionY: Number(e.target.value) })} /></div>
            <div><Label>Width</Label><Input type="number" value={form.width} onChange={(e) => setForm({ ...form, width: Number(e.target.value) })} /></div>
            <div><Label>Height</Label><Input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Add Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
