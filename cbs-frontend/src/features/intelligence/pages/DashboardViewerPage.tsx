import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, EmptyState } from '@/components/shared';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Plus,
  Loader2,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Gauge,
  Map,
  Activity,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import {
  useDashboardWithWidgets,
  useAddWidget,
  type DashboardWidget,
  type DashboardDefinition,
} from '../hooks/useIntelligence';

// ---- Constants ------------------------------------------------------------------

const WIDGET_TYPES = [
  'KPI_CARD', 'LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'TABLE',
  'HEATMAP', 'MAP', 'GAUGE', 'FUNNEL', 'TREEMAP',
  'SCATTER', 'ALERT_FEED', 'TICKER',
] as const;

const WIDGET_ICONS: Record<string, React.ElementType> = {
  KPI_CARD: Activity,
  LINE_CHART: LineChart,
  BAR_CHART: BarChart3,
  PIE_CHART: PieChart,
  TABLE: Table,
  HEATMAP: LayoutDashboard,
  MAP: Map,
  GAUGE: Gauge,
  FUNNEL: BarChart3,
  TREEMAP: LayoutDashboard,
  SCATTER: Activity,
  ALERT_FEED: AlertCircle,
  TICKER: Activity,
};

// ---- Add Widget Dialog ----------------------------------------------------------

function AddWidgetDialog({
  open,
  onClose,
  dashboardId,
}: {
  open: boolean;
  onClose: () => void;
  dashboardId: number;
}) {
  const addWidget = useAddWidget();
  const [widgetCode, setWidgetCode] = useState('');
  const [title, setTitle] = useState('');
  const [widgetType, setWidgetType] = useState<string>('KPI_CARD');
  const [dataSource, setDataSource] = useState('');
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(3);

  const handleSubmit = () => {
    addWidget.mutate(
      {
        dashboardId,
        widget: {
          dashboardId,
          widgetCode,
          widgetType: widgetType as DashboardWidget['widgetType'],
          title,
          dataSource,
          positionX: posX,
          positionY: posY,
          width,
          height,
          isActive: true,
        },
      },
      {
        onSuccess: () => {
          onClose();
          setWidgetCode('');
          setTitle('');
          setDataSource('');
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold">Add Widget</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Widget Code</label>
            <input
              value={widgetCode}
              onChange={(e) => setWidgetCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. TOTAL_DEPOSITS_KPI"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Total Deposits"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Widget Type</label>
            <select
              value={widgetType}
              onChange={(e) => setWidgetType(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {WIDGET_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Data Source</label>
            <input
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. /api/v1/accounts/stats"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">X</label>
              <input type="number" min={0} value={posX} onChange={(e) => setPosX(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 text-sm border rounded-lg bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Y</label>
              <input type="number" min={0} value={posY} onChange={(e) => setPosY(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 text-sm border rounded-lg bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">W</label>
              <input type="number" min={1} max={12} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 text-sm border rounded-lg bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">H</label>
              <input type="number" min={1} max={12} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 text-sm border rounded-lg bg-background" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={addWidget.isPending || !widgetCode.trim() || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {addWidget.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Widget Card ----------------------------------------------------------------

function WidgetCard({ widget }: { widget: DashboardWidget }) {
  const Icon = WIDGET_ICONS[widget.widgetType] || LayoutDashboard;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{widget.title}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{widget.widgetCode}</p>
          </div>
        </div>
        <StatusBadge status={widget.isActive ? 'ACTIVE' : 'INACTIVE'} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Type:</span> {widget.widgetType.replace(/_/g, ' ')}
        </div>
        <div>
          <span className="text-muted-foreground">Position:</span> ({widget.positionX}, {widget.positionY})
        </div>
        <div>
          <span className="text-muted-foreground">Size:</span> {widget.width} x {widget.height}
        </div>
        <div>
          <span className="text-muted-foreground">Source:</span>{' '}
          <span className="font-mono truncate">{widget.dataSource || '—'}</span>
        </div>
      </div>
      {widget.refreshOverrideSec && (
        <p className="text-xs text-muted-foreground">Refresh override: {widget.refreshOverrideSec}s</p>
      )}
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function DashboardViewerPage() {
  const { code } = useParams<{ code: string }>();
  const { data: dashboardData, isLoading, isError } = useDashboardWithWidgets(code || '');
  const [showAddWidget, setShowAddWidget] = useState(false);

  if (!code) {
    return (
      <>
        <PageHeader title="Dashboard" backTo="/intelligence/dashboards" />
        <div className="page-container">
          <EmptyState title="No dashboard code" description="No dashboard code provided in the URL." />
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/intelligence/dashboards" />
        <div className="page-container">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </>
    );
  }

  if (isError || !dashboardData) {
    return (
      <>
        <PageHeader title="Dashboard Not Found" backTo="/intelligence/dashboards" />
        <div className="page-container">
          <EmptyState
            title="Dashboard Not Found"
            description={`No dashboard found with code "${code}".`}
            icon={<AlertCircle className="w-10 h-10" />}
          />
        </div>
      </>
    );
  }

  const dashboard = dashboardData.dashboard as DashboardDefinition | undefined;
  const widgets = (dashboardData.widgets as DashboardWidget[] | undefined) || [];

  return (
    <>
      <PageHeader
        title={dashboard?.dashboardName || code}
        subtitle={`${dashboard?.dashboardType || 'CUSTOM'} dashboard — ${widgets.length} widget(s) — Refresh every ${dashboard?.refreshIntervalSec || 300}s`}
        backTo="/intelligence/dashboards"
        actions={
          <button
            onClick={() => setShowAddWidget(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" /> Add Widget
          </button>
        }
      />
      <div className="page-container space-y-6">
        {/* Dashboard metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Code</p>
            <p className="font-mono">{dashboard?.dashboardCode || code}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Type</p>
            <StatusBadge status={dashboard?.dashboardType || 'CUSTOM'} />
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge status={dashboard?.isActive ? 'ACTIVE' : 'INACTIVE'} />
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">Created By</p>
            <p>{dashboard?.createdBy || '—'}</p>
          </div>
        </div>

        {/* Widgets grid */}
        {widgets.length === 0 ? (
          <EmptyState
            title="No Widgets"
            description="This dashboard has no widgets yet. Add widgets to build out the dashboard."
            icon={<LayoutDashboard className="w-10 h-10" />}
          />
        ) : (
          <div>
            <h3 className="text-sm font-semibold mb-3">Widgets ({widgets.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map((w) => (
                <WidgetCard key={w.id} widget={w} />
              ))}
            </div>
          </div>
        )}

        {/* Allowed roles */}
        {dashboard?.allowedRoles && dashboard.allowedRoles.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Allowed Roles</p>
            <div className="flex flex-wrap gap-1">
              {dashboard.allowedRoles.map((role) => (
                <span key={role} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {dashboard && (
        <AddWidgetDialog
          open={showAddWidget}
          onClose={() => setShowAddWidget(false)}
          dashboardId={dashboard.id}
        />
      )}
    </>
  );
}
