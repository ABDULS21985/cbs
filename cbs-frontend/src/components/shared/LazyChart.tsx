import { Suspense, lazy, ComponentType } from 'react';
import { ChartSkeleton } from './ChartSkeleton';

type LazyChartProps<P extends object> = {
  loader: () => Promise<{ default: ComponentType<P> }>;
  height?: number;
} & P;

export function LazyChart<P extends object>({
  loader,
  height = 300,
  ...props
}: LazyChartProps<P>) {
  const Chart = lazy(loader);
  return (
    <Suspense fallback={<ChartSkeleton height={height} />}>
      <Chart {...(props as P)} />
    </Suspense>
  );
}
