import type { VisualizationType, ReportColumn, ReportConfig } from '../../api/reportBuilderApi';

interface ChartConfiguratorProps {
  vizType: VisualizationType;
  columns: ReportColumn[];
  config: ReportConfig['chartConfig'];
  onChange: (c: ReportConfig['chartConfig']) => void;
}

export function ChartConfigurator({ vizType, columns, config, onChange }: ChartConfiguratorProps) {
  const numericCols = columns.filter((c) => c.type === 'NUMBER' || c.type === 'MONEY' || c.aggregation === 'SUM' || c.aggregation === 'COUNT' || c.aggregation === 'AVG');
  const categoryCols = columns.filter((c) => c.type === 'TEXT' || c.type === 'DATE');

  if (vizType === 'TABLE' || vizType === 'SUMMARY_CARDS') return null;

  function update(key: keyof NonNullable<ReportConfig['chartConfig']>, value: string) {
    onChange({ ...(config ?? {}), [key]: value });
  }

  return (
    <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-4">
      <h4 className="text-sm font-semibold">Chart Configuration</h4>
      <div className="grid grid-cols-2 gap-4">
        {vizType !== 'PIE_CHART' && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">X Axis</label>
            <select
              value={config?.xAxis ?? ''}
              onChange={(e) => update('xAxis', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select column...</option>
              {categoryCols.map((c) => (
                <option key={c.fieldId} value={c.fieldId}>{c.displayName}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            {vizType === 'PIE_CHART' ? 'Value' : 'Y Axis'}
          </label>
          <select
            value={config?.yAxis ?? ''}
            onChange={(e) => update('yAxis', e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select column...</option>
            {numericCols.map((c) => (
              <option key={c.fieldId} value={c.fieldId}>{c.displayName}</option>
            ))}
          </select>
        </div>

        {vizType !== 'PIE_CHART' && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Group By (optional)</label>
            <select
              value={config?.groupBy ?? ''}
              onChange={(e) => update('groupBy', e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">None</option>
              {categoryCols.map((c) => (
                <option key={c.fieldId} value={c.fieldId}>{c.displayName}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Chart Title</label>
          <input
            type="text"
            value={config?.title ?? ''}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Enter chart title..."
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
    </div>
  );
}
