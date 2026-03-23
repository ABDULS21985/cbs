import { FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { useGenerateCommitteePack } from '../../hooks/useCreditRisk';

const PACK_SECTIONS = [
  'Portfolio summary (key metrics)',
  'Large exposure report (top 20)',
  'Rating migration summary',
  'New approvals summary',
  'Watch list changes',
  'NPL movement',
  'Sector concentration',
];

function formatCurrency(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function formatPct(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return `${(num * 100).toFixed(2)}%`;
}

const METRIC_LABELS: { key: string; label: string; format?: 'currency' | 'pct' | 'number' }[] = [
  { key: 'reportDate', label: 'Report Date' },
  { key: 'totalActiveLoans', label: 'Total Active Loans', format: 'number' },
  { key: 'totalExposure', label: 'Total Exposure', format: 'currency' },
  { key: 'nplCount', label: 'NPL Count', format: 'number' },
  { key: 'nplAmount', label: 'NPL Amount', format: 'currency' },
  { key: 'nplRatio', label: 'NPL Ratio', format: 'pct' },
  { key: 'totalProvisions', label: 'Total Provisions', format: 'currency' },
  { key: 'coverageRatio', label: 'Coverage Ratio', format: 'pct' },
  { key: 'watchListCount', label: 'Watch List Count', format: 'number' },
  { key: 'totalEcl', label: 'Total ECL', format: 'currency' },
  { key: 'activeScoringModels', label: 'Active Scoring Models', format: 'number' },
];

function formatMetric(value: unknown, format?: 'currency' | 'pct' | 'number'): string {
  if (value == null) return '-';
  if (format === 'currency') return formatCurrency(value);
  if (format === 'pct') return formatPct(value);
  if (format === 'number') return Number(value).toLocaleString();
  return String(value);
}

export function CreditCommitteePackGenerator() {
  const { mutate: generate, isPending, data: result, isSuccess, isError } = useGenerateCommitteePack();

  return (
    <div className="surface-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold">Credit Committee Pack</h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate a comprehensive credit committee report pack with all portfolio data and analysis.
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Included Sections</p>
        <ul className="space-y-1.5">
          {PACK_SECTIONS.map((section) => (
            <li key={section} className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{section}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Error state */}
      {isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
          <p className="text-sm text-red-700 dark:text-red-400">
            Failed to generate committee pack. Please try again.
          </p>
        </div>
      )}

      {/* Success state - show key metrics */}
      {isSuccess && result && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Committee pack generated successfully!
          </p>
          <div className="grid grid-cols-2 gap-3">
            {METRIC_LABELS.map(({ key, label, format }) => {
              const value = (result as Record<string, unknown>)[key];
              if (value == null) return null;
              return (
                <div key={key} className="text-sm">
                  <span className="text-muted-foreground">{label}:</span>{' '}
                  <span className="font-medium">{formatMetric(value, format)}</span>
                </div>
              );
            })}
          </div>

          {/* Stage distribution */}
          {(result as Record<string, unknown>).stageDistribution && (
            <div className="text-sm">
              <span className="text-muted-foreground">Stage Distribution:</span>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {Object.entries(
                  (result as Record<string, unknown>).stageDistribution as Record<string, number>
                ).map(([stage, count]) => (
                  <div key={stage}>
                    <span className="font-medium">{stage}:</span> {count.toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate button */}
      {!isSuccess && (
        <button
          onClick={() => generate()}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate Committee Pack
            </>
          )}
        </button>
      )}

      {isSuccess && (
        <button
          onClick={() => generate()}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-medium text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Regenerate Pack
            </>
          )}
        </button>
      )}
    </div>
  );
}
