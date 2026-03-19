import { useState } from 'react';
import { FlaskConical, RefreshCw } from 'lucide-react';
import { formatDate, formatPercent } from '@/lib/formatters';
import { useModelPerformance } from '../../hooks/useFraud';
import { ConfusionMatrixViz } from './ConfusionMatrixViz';
import { ScoreDistributionChart } from './ScoreDistributionChart';

export function ModelPerformancePanel() {
  const { data: model, isLoading } = useModelPerformance();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 animate-pulse space-y-4">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!model) return null;

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-foreground text-background px-4 py-2.5 text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">{model.modelName}</h3>
          <div className="text-xs text-muted-foreground mt-0.5">
            Version {model.version} · Last trained {formatDate(model.lastTrained)}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => showToast('Model retraining pipeline coming soon')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retrain Model
          </button>
          <button
            onClick={() => showToast('A/B testing framework coming soon')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-muted transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            A/B Test New Model
          </button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
          <div className="text-xs text-muted-foreground">AUC-ROC</div>
          <div className="text-xl font-bold mt-1">{model.aucRoc.toFixed(3)}</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
          <div className="text-xs text-muted-foreground">Precision</div>
          <div className="text-xl font-bold mt-1">{formatPercent(model.precision * 100)}</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
          <div className="text-xs text-muted-foreground">Recall</div>
          <div className="text-xl font-bold mt-1">{formatPercent(model.recall * 100)}</div>
        </div>
      </div>

      <ConfusionMatrixViz model={model} />
      <ScoreDistributionChart />
    </div>
  );
}
