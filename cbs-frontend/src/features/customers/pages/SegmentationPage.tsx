import { Layers3, Palette, Tag } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { useCustomerSegments } from '../hooks/useCustomers';

export default function SegmentationPage() {
  const { data: segments, isLoading } = useCustomerSegments();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((index) => (
          <div key={index} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (!segments?.length) {
    return (
      <EmptyState
        icon={Layers3}
        title="No active segments"
        description="The backend did not return any active customer segments."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
        This screen is connected to the live segment catalog. Aggregate customer counts and profitability analytics are not exposed by the current backend contract.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Tag className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Priority {segment.priority}
              </span>
            </div>

            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{segment.name}</div>
            <div className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">{segment.code}</div>

            <p className="mt-3 min-h-12 text-sm text-gray-600 dark:text-gray-300">
              {segment.description || 'No segment description provided by the backend.'}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                <div className="mb-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Layers3 className="h-3.5 w-3.5" />
                  Type
                </div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{segment.segmentType}</div>
              </div>

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                <div className="mb-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Palette className="h-3.5 w-3.5" />
                  Color
                </div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{segment.colorCode || 'Default'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
