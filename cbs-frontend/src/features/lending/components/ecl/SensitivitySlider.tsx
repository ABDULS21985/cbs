interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

export function SensitivitySlider({ label, value, onChange, min = 0, max = 100 }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-primary cursor-pointer"
      />
      <span className="text-xs font-medium tabular-nums w-10 text-right">{value}%</span>
    </div>
  );
}
