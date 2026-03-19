import { Table2, BarChart2, LineChart, PieChart, LayoutGrid, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartConfigurator } from './ChartConfigurator';
import type { VisualizationType, ReportColumn, ReportConfig } from '../../api/reportBuilderApi';

interface VisualizationPickerProps {
  vizType: VisualizationType;
  onChange: (t: VisualizationType) => void;
  columns: ReportColumn[];
  chartConfig: ReportConfig['chartConfig'];
  onChartConfigChange: (c: ReportConfig['chartConfig']) => void;
}

const VIZ_OPTIONS: {
  type: VisualizationType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { type: 'TABLE', label: 'Table', description: 'Rows and columns grid view', icon: Table2 },
  { type: 'BAR_CHART', label: 'Bar Chart', description: 'Compare values across categories', icon: BarChart2 },
  { type: 'LINE_CHART', label: 'Line Chart', description: 'Trends over time', icon: LineChart },
  { type: 'PIE_CHART', label: 'Pie Chart', description: 'Part-to-whole proportions', icon: PieChart },
  { type: 'SUMMARY_CARDS', label: 'Summary Cards', description: 'Key metrics at a glance', icon: LayoutGrid },
  { type: 'COMBINED', label: 'Combined', description: 'Table + chart stacked view', icon: Layers },
];

export function VisualizationPicker({ vizType, onChange, columns, chartConfig, onChartConfigChange }: VisualizationPickerProps) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {VIZ_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = vizType === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => onChange(opt.type)}
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <ChartConfigurator
        vizType={vizType}
        columns={columns}
        config={chartConfig}
        onChange={onChartConfigChange}
      />
    </div>
  );
}
