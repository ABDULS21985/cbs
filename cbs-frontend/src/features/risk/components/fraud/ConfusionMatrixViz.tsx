import { formatPercent } from '@/lib/formatters';
import type { ModelPerformance } from '../../types/fraud';

interface Props {
  model: ModelPerformance;
}

export function ConfusionMatrixViz({ model }: Props) {
  const { truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn } = model;
  const total = tp + fp + fn + tn;

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%';

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Confusion Matrix
      </h4>
      <div className="overflow-hidden rounded-lg border text-sm">
        {/* Header row */}
        <div className="grid grid-cols-[auto_1fr_1fr] divide-x">
          <div className="w-28 px-3 py-2 bg-muted/30" />
          <div className="px-3 py-2 text-center font-semibold bg-muted/30 text-xs">
            Predicted Positive
          </div>
          <div className="px-3 py-2 text-center font-semibold bg-muted/30 text-xs">
            Predicted Negative
          </div>
        </div>

        {/* Actual Positive row */}
        <div className="grid grid-cols-[auto_1fr_1fr] divide-x border-t">
          <div className="w-28 px-3 py-4 bg-muted/10 flex items-center text-xs font-semibold text-muted-foreground">
            Actual Positive
          </div>
          {/* TP */}
          <div className="px-4 py-4 bg-green-50 dark:bg-green-900/10 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{tp.toLocaleString()}</div>
            <div className="text-xs text-green-600 dark:text-green-500 font-medium mt-0.5">True Positive</div>
            <div className="text-xs text-muted-foreground mt-0.5">{pct(tp)}</div>
          </div>
          {/* FN */}
          <div className="px-4 py-4 bg-red-50 dark:bg-red-900/10 text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{fn.toLocaleString()}</div>
            <div className="text-xs text-red-600 dark:text-red-500 font-medium mt-0.5">False Negative</div>
            <div className="text-xs text-muted-foreground mt-0.5">{pct(fn)}</div>
          </div>
        </div>

        {/* Actual Negative row */}
        <div className="grid grid-cols-[auto_1fr_1fr] divide-x border-t">
          <div className="w-28 px-3 py-4 bg-muted/10 flex items-center text-xs font-semibold text-muted-foreground">
            Actual Negative
          </div>
          {/* FP */}
          <div className="px-4 py-4 bg-amber-50 dark:bg-amber-900/10 text-center">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{fp.toLocaleString()}</div>
            <div className="text-xs text-amber-600 dark:text-amber-500 font-medium mt-0.5">False Positive</div>
            <div className="text-xs text-muted-foreground mt-0.5">{pct(fp)}</div>
          </div>
          {/* TN */}
          <div className="px-4 py-4 bg-green-50 dark:bg-green-900/10 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{tn.toLocaleString()}</div>
            <div className="text-xs text-green-600 dark:text-green-500 font-medium mt-0.5">True Negative</div>
            <div className="text-xs text-muted-foreground mt-0.5">{pct(tn)}</div>
          </div>
        </div>
      </div>

      {/* Derived metrics */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">Precision</div>
          <div className="text-base font-bold mt-0.5">{formatPercent(precision * 100)}</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">Recall</div>
          <div className="text-base font-bold mt-0.5">{formatPercent(recall * 100)}</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">F1 Score</div>
          <div className="text-base font-bold mt-0.5">{formatPercent(f1 * 100)}</div>
        </div>
      </div>
    </div>
  );
}
