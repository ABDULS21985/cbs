import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard, EmptyState, ConfirmDialog } from '@/components/shared';
import { formatDate, formatMoney, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  CheckCircle,
  Loader2,
  BarChart3,
  Eye,
  XCircle,
  Info,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useAllForecasts,
  useGenerateForecast,
  useApproveForecast,
  type CashflowForecast,
} from '../hooks/useIntelligence';

// ---- Constants ------------------------------------------------------------------

const ENTITY_TYPES = ['BANK', 'BRANCH', 'CUSTOMER', 'PRODUCT', 'CURRENCY'] as const;
const MODEL_TYPES = ['ARIMA', 'EXPONENTIAL_SMOOTHING', 'PROPHET', 'LSTM', 'ENSEMBLE', 'RULE_BASED', 'MONTE_CARLO'] as const;

/** Human-readable description + confidence range per entity type shown in the Generate dialog. */
const ENTITY_TYPE_INFO: Record<string, { label: string; confidence: string; description: string; entityIdHint: string }> = {
  CUSTOMER: {
    label: 'Customer',
    confidence: '50–85%',
    description: 'Forecast uses actual transaction history from all accounts owned by the customer. Confidence scales with available history (up to 85% at 6+ months).',
    entityIdHint: 'Numeric customer ID (e.g. 42)',
  },
  BRANCH: {
    label: 'Branch',
    confidence: '50–85%',
    description: 'Aggregates transaction history across all accounts belonging to the specified branch code. Confidence scales with available history.',
    entityIdHint: 'Branch code (e.g. LAG001)',
  },
  CURRENCY: {
    label: 'Currency',
    confidence: '50–85%',
    description: 'Aggregates transaction history across all accounts denominated in the specified currency. Useful for FX exposure forecasting.',
    entityIdHint: '3-letter ISO currency code (e.g. USD)',
  },
  BANK: {
    label: 'Bank-Wide',
    confidence: '50–85%',
    description: 'Aggregates transaction history across ALL accounts in the institution. Highest coverage; branch-level variation is obscured.',
    entityIdHint: 'Institution identifier (e.g. HEAD_OFFICE)',
  },
  PRODUCT: {
    label: 'Product',
    confidence: '50%',
    description: 'Product-level forecasts do not map to individual accounts. The forecast uses a book-balance baseline with the minimum confidence tier (50%). Use CUSTOMER or BRANCH for richer results.',
    entityIdHint: 'Product code (e.g. SAVINGS_CLASSIC)',
  },
};

// ---- Generate Dialog ------------------------------------------------------------

function GenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const generate = useGenerateForecast();
  const [entityType, setEntityType] = useState<string>('BANK');
  const [entityId, setEntityId] = useState('HEAD_OFFICE');
  const [currency, setCurrency] = useState('USD');
  const [horizonDays, setHorizonDays] = useState(30);
  const [modelType, setModelType] = useState<string>('ARIMA');

  const entityInfo = ENTITY_TYPE_INFO[entityType];
  const isLowConfidence = entityType === 'PRODUCT';

  const handleEntityTypeChange = (newType: string) => {
    setEntityType(newType);
    // Reset entityId to a sensible default for the selected type
    const defaults: Record<string, string> = {
      BANK: 'HEAD_OFFICE',
      BRANCH: 'LAG001',
      CUSTOMER: '1',
      PRODUCT: 'SAVINGS_CLASSIC',
      CURRENCY: 'USD',
    };
    setEntityId(defaults[newType] ?? '');
  };

  const handleSubmit = () => {
    generate.mutate(
      { entityType, entityId, currency, horizonDays, modelType },
      { onSuccess: () => { onClose(); } },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold">Generate Cash Flow Forecast</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => handleEntityTypeChange(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{ENTITY_TYPE_INFO[t]?.label ?? t}</option>
              ))}
            </select>
          </div>

          {/* Entity-type advisory */}
          {entityInfo && (
            <div className={cn(
              'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs',
              isLowConfidence
                ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'
                : 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800',
            )}>
              <Info className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', isLowConfidence ? 'text-amber-600' : 'text-blue-500')} />
              <div>
                <span className={cn('font-semibold', isLowConfidence ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300')}>
                  Max confidence: {entityInfo.confidence}
                </span>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">{entityInfo.description}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Entity ID
              {entityInfo && (
                <span className="ml-1.5 text-muted-foreground/60 font-normal">— {entityInfo.entityIdHint}</span>
              )}
            </label>
            <input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={entityInfo?.entityIdHint ?? 'Entity identifier'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Currency</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Horizon (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">ML Model</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {MODEL_TYPES.map((m) => (
                <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={generate.isPending || !entityId.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {generate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingDown className="w-3.5 h-3.5" />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Forecast Detail Drawer -----------------------------------------------------

function ForecastDetailDrawer({
  forecast,
  onClose,
}: {
  forecast: CashflowForecast | null;
  onClose: () => void;
}) {
  const approve = useApproveForecast();

  if (!forecast) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="bg-background w-full max-w-lg h-full overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Forecast Detail</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Forecast ID</p>
              <p className="text-sm font-mono">{forecast.forecastId}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <StatusBadge status={forecast.status} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Entity</p>
              <p className="text-sm">{forecast.entityType} / {forecast.entityId}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Forecast Date</p>
              <p className="text-sm">{formatDate(forecast.forecastDate)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Horizon</p>
              <p className="text-sm">{forecast.horizonDays} days</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Currency</p>
              <p className="text-sm">{forecast.currency}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Model</p>
              <p className="text-sm">{forecast.modelType?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Version</p>
              <p className="text-sm">{forecast.modelVersion || '—'}</p>
            </div>
          </div>

          {/* Financial projections */}
          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-sm font-medium">Projections</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Inflows</p>
                <p className="text-lg font-semibold text-green-600 tabular-nums">
                  {formatMoney(Number(forecast.projectedInflows), forecast.currency)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Outflows</p>
                <p className="text-lg font-semibold text-red-600 tabular-nums">
                  {formatMoney(Number(forecast.projectedOutflows), forecast.currency)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Net Position</p>
                <p className={cn('text-lg font-semibold tabular-nums', Number(forecast.netPosition) >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatMoney(Number(forecast.netPosition), forecast.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Confidence interval */}
          <div className="rounded-xl border p-4 space-y-2">
            <p className="text-sm font-medium">Confidence Interval</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Lower Bound</p>
                <p className="text-sm tabular-nums">{forecast.lowerBound != null ? formatMoney(Number(forecast.lowerBound), forecast.currency) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="text-sm font-semibold tabular-nums">{Number(forecast.confidenceLevel).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Upper Bound</p>
                <p className="text-sm tabular-nums">{forecast.upperBound != null ? formatMoney(Number(forecast.upperBound), forecast.currency) : '—'}</p>
              </div>
            </div>
            {/* Entity-scope confidence advisory */}
            {ENTITY_TYPE_INFO[forecast.entityType] && (
              <div className="flex items-start gap-2 pt-2 border-t mt-2">
                <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium">{ENTITY_TYPE_INFO[forecast.entityType].label} scope:</span>{' '}
                  {ENTITY_TYPE_INFO[forecast.entityType].description}
                </p>
              </div>
            )}
          </div>

          {/* Feature importance */}
          {forecast.featureImportance && Object.keys(forecast.featureImportance).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Feature Importance</p>
              <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-32">
                {JSON.stringify(forecast.featureImportance, null, 2)}
              </pre>
            </div>
          )}

          {/* Breakdowns */}
          {forecast.inflowBreakdown && Object.keys(forecast.inflowBreakdown).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Inflow Breakdown</p>
              <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-32">
                {JSON.stringify(forecast.inflowBreakdown, null, 2)}
              </pre>
            </div>
          )}

          {forecast.outflowBreakdown && Object.keys(forecast.outflowBreakdown).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Outflow Breakdown</p>
              <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-32">
                {JSON.stringify(forecast.outflowBreakdown, null, 2)}
              </pre>
            </div>
          )}

          {/* Approve action */}
          {forecast.status === 'GENERATED' && (
            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => approve.mutate(forecast.forecastId, { onSuccess: onClose })}
                disabled={approve.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approve.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Approve Forecast
              </button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">Created: {formatDateTime(forecast.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function CashFlowForecastPage() {
  const { data: forecasts = [], isLoading } = useAllForecasts();
  const approve = useApproveForecast();
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<CashflowForecast | null>(null);

  const generated = forecasts.filter((f) => f.status === 'GENERATED').length;
  const approved = forecasts.filter((f) => f.status === 'APPROVED').length;

  const columns: ColumnDef<CashflowForecast>[] = [
    {
      accessorKey: 'forecastId',
      header: 'Forecast ID',
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedForecast(row.original)}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.original.forecastId}
        </button>
      ),
    },
    {
      accessorKey: 'entityType',
      header: 'Entity',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.entityType} / {row.original.entityId}</span>
      ),
    },
    {
      accessorKey: 'modelType',
      header: 'Model',
      cell: ({ getValue }) => <span className="text-xs">{String(getValue()).replace(/_/g, ' ')}</span>,
    },
    {
      accessorKey: 'currency',
      header: 'Ccy',
      cell: ({ getValue }) => <span className="text-xs font-mono">{String(getValue())}</span>,
    },
    {
      accessorKey: 'projectedInflows',
      header: 'Inflows',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-green-600">
          {formatMoney(Number(row.original.projectedInflows), row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'projectedOutflows',
      header: 'Outflows',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-red-600">
          {formatMoney(Number(row.original.projectedOutflows), row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'netPosition',
      header: 'Net',
      cell: ({ row }) => {
        const net = Number(row.original.netPosition);
        return (
          <span className={cn('text-sm tabular-nums font-medium', net >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatMoney(net, row.original.currency)}
          </span>
        );
      },
    },
    {
      accessorKey: 'confidenceLevel',
      header: 'Conf.',
      cell: ({ getValue }) => <span className="text-xs tabular-nums">{Number(getValue()).toFixed(0)}%</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    {
      accessorKey: 'forecastDate',
      header: 'Date',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{formatDate(String(getValue()))}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const f = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedForecast(f)}
              className="text-muted-foreground hover:text-primary p-1"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            {f.status === 'GENERATED' && (
              <button
                onClick={() => approve.mutate(f.forecastId)}
                disabled={approve.isPending}
                className="text-muted-foreground hover:text-green-600 p-1 disabled:opacity-50"
                title="Approve"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Cash Flow Forecasting"
        subtitle="ML-powered cash flow projections with confidence intervals and category breakdown"
        backTo="/intelligence"
        actions={
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" /> Generate Forecast
          </button>
        }
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Forecasts" value={forecasts.length} format="number" icon={BarChart3} />
          <StatCard label="Pending Approval" value={generated} format="number" icon={TrendingDown} />
          <StatCard label="Approved" value={approved} format="number" icon={CheckCircle} />
          <StatCard label="Models Available" value={MODEL_TYPES.length} format="number" icon={TrendingUp} />
        </div>

        <DataTable
          columns={columns}
          data={forecasts}
          isLoading={isLoading}
          enableGlobalFilter
        />
      </div>

      <GenerateDialog open={showGenerate} onClose={() => setShowGenerate(false)} />
      <ForecastDetailDrawer forecast={selectedForecast} onClose={() => setSelectedForecast(null)} />
    </>
  );
}
