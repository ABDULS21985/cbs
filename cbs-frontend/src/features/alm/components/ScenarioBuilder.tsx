import { useState, useRef, useCallback, useEffect } from 'react';
import { Save, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateScenario } from '../hooks/useAlm';

const TENOR_NODES = ['O/N', '1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y', '20Y', '30Y'] as const;

const PRESETS: Record<string, Record<string, number>> = {
  'Parallel +200': Object.fromEntries(TENOR_NODES.map(t => [t, 200])),
  'Parallel -200': Object.fromEntries(TENOR_NODES.map(t => [t, -200])),
  'Steepening': { 'O/N': -50, '1M': -25, '3M': 0, '6M': 25, '1Y': 50, '2Y': 100, '3Y': 150, '5Y': 200, '10Y': 250, '20Y': 275, '30Y': 300 },
  'Flattening': { 'O/N': 200, '1M': 175, '3M': 150, '6M': 125, '1Y': 100, '2Y': 75, '3Y': 50, '5Y': 25, '10Y': 0, '20Y': -25, '30Y': -50 },
  'Inversion': { 'O/N': 300, '1M': 275, '3M': 250, '6M': 200, '1Y': 150, '2Y': 50, '3Y': -25, '5Y': -75, '10Y': -100, '20Y': -75, '30Y': -50 },
  'Short-end Shock': { 'O/N': 300, '1M': 250, '3M': 200, '6M': 150, '1Y': 100, '2Y': 50, '3Y': 25, '5Y': 0, '10Y': 0, '20Y': 0, '30Y': 0 },
  'Long-end Shock': { 'O/N': 0, '1M': 0, '3M': 0, '6M': 0, '1Y': 25, '2Y': 50, '3Y': 100, '5Y': 150, '10Y': 200, '20Y': 250, '30Y': 300 },
};

interface ScenarioBuilderProps {
  onCreated?: () => void;
}

export function ScenarioBuilder({ onCreated }: ScenarioBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fxShock, setFxShock] = useState(0);
  const [shifts, setShifts] = useState<Record<string, number>>(
    Object.fromEntries(TENOR_NODES.map(t => [t, 0])),
  );
  const createScenario = useCreateScenario();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const setPreset = (presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) setShifts({ ...preset });
  };

  const resetShifts = () => setShifts(Object.fromEntries(TENOR_NODES.map(t => [t, 0])));

  // SVG curve editor dimensions
  const SVG_W = 700;
  const SVG_H = 280;
  const PAD = { top: 30, right: 30, bottom: 40, left: 50 };
  const plotW = SVG_W - PAD.left - PAD.right;
  const plotH = SVG_H - PAD.top - PAD.bottom;

  const maxBps = 400;
  const yScale = (bps: number) => PAD.top + plotH / 2 - (bps / maxBps) * (plotH / 2);
  const xScale = (idx: number) => PAD.left + (idx / (TENOR_NODES.length - 1)) * plotW;
  const yInverse = (py: number) => Math.round(((PAD.top + plotH / 2 - py) / (plotH / 2)) * maxBps);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const py = e.clientY - rect.top;
    const bps = Math.max(-maxBps, Math.min(maxBps, yInverse(py)));
    setShifts(prev => ({ ...prev, [dragging]: bps }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      const up = () => setDragging(null);
      window.addEventListener('mouseup', up);
      return () => window.removeEventListener('mouseup', up);
    }
  }, [dragging]);

  // Build path
  const points = TENOR_NODES.map((t, i) => ({ x: xScale(i), y: yScale(shifts[t]) }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const avgShock = Math.round(Object.values(shifts).reduce((s, v) => s + v, 0) / TENOR_NODES.length);

  const handleSave = () => {
    if (!name) return;
    createScenario.mutate(
      { name, type: 'CUSTOM', shockBps: avgShock, description: `${description}${fxShock ? ` | FX shock: ${fxShock}%` : ''}` },
      { onSuccess: () => { setName(''); setDescription(''); resetShifts(); onCreated?.(); } },
    );
  };

  return (
    <div className="space-y-5">
      {/* Name / Description */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Scenario Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Custom Steepening +300bps" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description for ALCO reporting" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
      </div>

      {/* Preset buttons */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Preset Templates</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESETS).map(p => (
            <button key={p} onClick={() => setPreset(p)}
              className="px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
              {p}
            </button>
          ))}
          <button onClick={resetShifts}
            className="px-3 py-1.5 rounded-md border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Draggable yield curve editor */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Yield Curve Shift Editor <span className="text-muted-foreground font-normal">(drag points to adjust)</span></h3>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid */}
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="none" className="stroke-border" strokeWidth={1} />
          {/* Zero line */}
          <line x1={PAD.left} y1={yScale(0)} x2={PAD.left + plotW} y2={yScale(0)} className="stroke-border" strokeDasharray="4 2" />
          {/* Y axis labels */}
          {[-400, -200, 0, 200, 400].map(bps => (
            <text key={bps} x={PAD.left - 8} y={yScale(bps)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={10}>
              {bps > 0 ? `+${bps}` : bps}
            </text>
          ))}
          {/* X axis labels */}
          {TENOR_NODES.map((t, i) => (
            <text key={t} x={xScale(i)} y={SVG_H - 10} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>{t}</text>
          ))}
          {/* Curve line */}
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2.5} />
          {/* Area fill */}
          <path d={`${pathD} L ${points[points.length - 1].x} ${yScale(0)} L ${points[0].x} ${yScale(0)} Z`}
            fill="#3b82f6" fillOpacity={0.08} />
          {/* Draggable points */}
          {TENOR_NODES.map((t, i) => (
            <g key={t}>
              <circle
                cx={xScale(i)} cy={yScale(shifts[t])} r={7}
                fill={dragging === t ? '#2563eb' : '#3b82f6'}
                stroke="white" strokeWidth={2}
                className="cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => { e.preventDefault(); setDragging(t); }}
              />
              <text x={xScale(i)} y={yScale(shifts[t]) - 14} textAnchor="middle" className="fill-foreground" fontSize={9} fontWeight={600}>
                {shifts[t] > 0 ? `+${shifts[t]}` : shifts[t]}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Numeric inputs */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Basis Point Shifts by Tenor</label>
        <div className="grid grid-cols-6 lg:grid-cols-11 gap-2">
          {TENOR_NODES.map(t => (
            <div key={t} className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground block text-center">{t}</label>
              <input
                type="number"
                value={shifts[t]}
                onChange={e => setShifts(prev => ({ ...prev, [t]: Number(e.target.value) }))}
                className="w-full px-1.5 py-1 rounded border bg-background text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* FX Shock overlay */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">FX Shock Overlay (%)</label>
          <input type="number" step="0.1" value={fxShock} onChange={e => setFxShock(Number(e.target.value))}
            placeholder="e.g. -20 for 20% depreciation" className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <p className="text-xs text-muted-foreground">Concurrent FX rate shock (negative = depreciation)</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Average Shock</label>
          <div className={cn('px-3 py-2 rounded-md border text-sm font-mono font-semibold',
            avgShock > 0 ? 'text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' :
            avgShock < 0 ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' :
            'bg-muted')}>
            {avgShock > 0 ? '+' : ''}{avgShock} bps
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex gap-2 pt-3 border-t">
        <button onClick={handleSave} disabled={!name || createScenario.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {createScenario.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Scenario
        </button>
      </div>
    </div>
  );
}
