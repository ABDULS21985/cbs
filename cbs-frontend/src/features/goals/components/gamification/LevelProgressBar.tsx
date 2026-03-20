import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';

const LEVELS = [
  { name: 'Starter', min: 0, max: 100000, emoji: '⭐' },
  { name: 'Saver', min: 100000, max: 500000, emoji: '⭐⭐' },
  { name: 'Achiever', min: 500000, max: 2000000, emoji: '⭐⭐⭐' },
  { name: 'Champion', min: 2000000, max: 10000000, emoji: '⭐⭐⭐⭐' },
  { name: 'Legend', min: 10000000, max: Infinity, emoji: '⭐⭐⭐⭐⭐' },
];

interface Props {
  totalSaved: number;
}

export function LevelProgressBar({ totalSaved }: Props) {
  const currentLevel = LEVELS.find((l) => totalSaved >= l.min && totalSaved < l.max) ?? LEVELS[LEVELS.length - 1];
  const levelIndex = LEVELS.indexOf(currentLevel);
  const nextLevel = LEVELS[levelIndex + 1];

  const progress = nextLevel
    ? Math.min(100, ((totalSaved - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100)
    : 100;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Savings Level</p>
          <p className="text-lg font-bold">{currentLevel.emoji} {currentLevel.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Saved</p>
          <p className="text-lg font-bold tabular-nums">{formatMoneyCompact(totalSaved)}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatMoneyCompact(currentLevel.min)}</span>
          {nextLevel ? <span>Next: {nextLevel.name} ({formatMoneyCompact(currentLevel.max)})</span> : <span>Max level!</span>}
        </div>
      </div>

      {/* Level chips */}
      <div className="flex gap-1.5">
        {LEVELS.map((l, i) => (
          <div key={l.name} className={cn(
            'flex-1 rounded-full h-1.5 transition-colors',
            i <= levelIndex ? 'bg-primary' : 'bg-muted',
          )} title={l.name} />
        ))}
      </div>
    </div>
  );
}

export { LEVELS };
