import type { DigitalAdoption } from '../../api/channelAnalyticsApi';

interface AdoptionFunnelChartProps {
  funnel: DigitalAdoption['funnel'];
}

interface Stage {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  conversionLabel?: string;
  conversionPct?: number;
}

export function AdoptionFunnelChart({ funnel }: AdoptionFunnelChartProps) {
  const stages: Stage[] = [
    {
      label: 'Registered',
      count: funnel.registered,
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-500',
    },
    {
      label: 'First Login',
      count: funnel.firstLogin,
      color: 'text-violet-700 dark:text-violet-300',
      bgColor: 'bg-violet-500',
      conversionLabel: 'Activation rate',
      conversionPct: Math.round((funnel.firstLogin / funnel.registered) * 100),
    },
    {
      label: 'First Transaction',
      count: funnel.firstTransaction,
      color: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-500',
      conversionLabel: 'Transacted',
      conversionPct: Math.round((funnel.firstTransaction / funnel.firstLogin) * 100),
    },
    {
      label: 'Regular User (30-day)',
      count: funnel.regularUser,
      color: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-500',
      conversionLabel: 'Became regular',
      conversionPct: Math.round((funnel.regularUser / funnel.firstTransaction) * 100),
    },
  ];

  const maxCount = funnel.registered;

  return (
    <div className="space-y-1">
      {stages.map((stage, idx) => {
        const widthPct = (stage.count / maxCount) * 100;
        return (
          <div key={stage.label}>
            {stage.conversionPct !== undefined && (
              <div className="flex items-center gap-2 py-1 pl-2">
                <div className="w-px h-4 bg-border ml-4" />
                <span className="text-xs text-muted-foreground">
                  {stage.conversionLabel}:{' '}
                  <span className="font-semibold text-foreground">{stage.conversionPct}%</span>
                </span>
              </div>
            )}
            <div className="relative">
              {/* Funnel bar — narrows via padding based on stage */}
              <div
                className="relative h-10 rounded-lg overflow-hidden"
                style={{ marginLeft: `${idx * 4}%`, marginRight: `${idx * 4}%` }}
              >
                <div className="absolute inset-0 bg-muted/30 rounded-lg" />
                <div
                  className={`absolute inset-y-0 left-0 ${stage.bgColor} rounded-lg transition-all duration-500`}
                  style={{ width: `${widthPct}%`, opacity: 0.85 }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3">
                  <span className="text-xs font-semibold text-white drop-shadow-sm">{stage.label}</span>
                  <span className="text-xs font-bold text-white drop-shadow-sm tabular-nums">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
