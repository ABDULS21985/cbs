import { formatMoney } from '@/lib/formatters';

interface AmountToleranceSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function AmountToleranceSlider({
  value,
  onChange,
  min = 0,
  max = 10_000,
  step = 100,
}: AmountToleranceSliderProps) {
  return (
    <div className="flex items-center gap-3 min-w-[240px]">
      <label className="text-xs text-muted-foreground whitespace-nowrap">
        Tolerance:
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none bg-muted cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-blue-600
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:shadow-sm
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <span className="text-xs font-mono font-medium tabular-nums min-w-[72px] text-right">
        {value === 0 ? 'Exact' : `\u20A6${formatMoney(value)}`}
      </span>
    </div>
  );
}
