import { Suspense, lazy, ComponentType, JSX } from 'react';
import { ChartSkeleton } from './ChartSkeleton';

type LazyChartProps<P extends Record<string, unknown>> = {
  loader: () => Promise<{ default: ComponentType<P> }>;
  height?: number;
} & P;

export function LazyChart<P extends Record<string, unknown>>({
  loader,
  height = 300,
  ...props
}: LazyChartProps<P>): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Chart = lazy(loader) as ComponentType<any>;
  return (
    <Suspense fallback={<ChartSkeleton height={height} />}>
      <Chart {...props} />
    </Suspense>
  );
}
