export const CHART_PALETTE = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
] as const;

export const CHART_PALETTE_EXTENDED = [
  ...CHART_PALETTE,
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))',
  'hsl(var(--chart-10))',
] as const;

export const PIE_PALETTE = CHART_PALETTE_EXTENDED;

export const SEMANTIC_CHART_COLORS = {
  info: 'hsl(var(--chart-info))',
  success: 'hsl(var(--chart-positive))',
  warning: 'hsl(var(--chart-warning))',
  danger: 'hsl(var(--chart-negative))',
  neutral: 'hsl(var(--chart-neutral))',
  accent: 'hsl(var(--chart-5))',
  teal: 'hsl(var(--chart-6))',
  orange: 'hsl(var(--chart-7))',
  pink: 'hsl(var(--chart-8))',
  lime: 'hsl(var(--chart-9))',
} as const;

export const REFERENCE_CHART_COLORS = {
  success: SEMANTIC_CHART_COLORS.success,
  warning: SEMANTIC_CHART_COLORS.warning,
  danger: SEMANTIC_CHART_COLORS.danger,
  info: SEMANTIC_CHART_COLORS.info,
  neutral: SEMANTIC_CHART_COLORS.neutral,
} as const;

export function getChartColor(index: number, palette = CHART_PALETTE_EXTENDED): string {
  return palette[index % palette.length] ?? palette[0];
}
