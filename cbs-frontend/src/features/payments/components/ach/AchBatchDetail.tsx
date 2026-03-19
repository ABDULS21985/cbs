import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfoGrid } from '@/components/shared';
import { toast } from 'sonner';
import { achApi, type AchBatch } from '../../api/achApi';
import { AchItemsTable } from './AchItemsTable';
import { NachaFileViewer } from './NachaFileViewer';

interface AchBatchDetailProps {
  batchId: string | null;
  open: boolean;
  onClose: () => void;
  mode?: 'outbound' | 'inbound';
}

const STATUS_STEPS: AchBatch['status'][] = ['CREATED', 'VALIDATED', 'SUBMITTED', 'ACCEPTED', 'SETTLED'];

const STATUS_STEP_COLORS: Record<string, string> = {
  CREATED: 'bg-gray-400',
  VALIDATED: 'bg-blue-500',
  SUBMITTED: 'bg-yellow-500',
  ACCEPTED: 'bg-purple-500',
  SETTLED: 'bg-green-500',
  RETURNED: 'bg-red-500',
  FAILED: 'bg-red-500',
};

function StatusStepper({ status }: { status: AchBatch['status'] }) {
  const isTerminalError = status === 'RETURNED' || status === 'FAILED';
  const currentIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {STATUS_STEPS.map((step, idx) => {
        const isPast = currentIndex > idx;
        const isCurrent = currentIndex === idx && !isTerminalError;
        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  isPast || isCurrent
                    ? cn('text-white border-transparent', STATUS_STEP_COLORS[step])
                    : 'text-gray-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900',
                )}
              >
                {isPast ? '✓' : idx + 1}
              </div>
              <span
                className={cn(
                  'mt-1 text-xs font-medium whitespace-nowrap',
                  (isPast || isCurrent) ? 'text-gray-900 dark:text-white' : 'text-gray-400',
                )}
              >
                {step.charAt(0) + step.slice(1).toLowerCase()}
              </span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-10 mx-1 rounded',
                  isPast ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700',
                )}
              />
            )}
          </div>
        );
      })}
      {isTerminalError && (
        <div className="ml-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">!</div>
          <span className="text-xs font-medium text-red-600 dark:text-red-400">{status}</span>
        </div>
      )}
    </div>
  );
}

export function AchBatchDetail({ batchId, open, onClose, mode = 'outbound' }: AchBatchDetailProps) {
  const [nachaViewerOpen, setNachaViewerOpen] = useState(false);
  const [nachaContent, setNachaContent] = useState<string | null>(null);
  const [fetchingNacha, setFetchingNacha] = useState(false);

  const { data: batch, isLoading } = useQuery({
    queryKey: ['ach-batch-detail', batchId, mode],
    queryFn: () =>
      mode === 'outbound'
        ? achApi.getOutboundBatch(batchId!)
        : achApi.getInboundBatch(batchId!),
    enabled: open && !!batchId,
  });

  const handleViewNacha = async () => {
    if (!batchId) return;
    setFetchingNacha(true);
    try {
      const content = await achApi.getRawNachaFile(batchId);
      setNachaContent(content);
      setNachaViewerOpen(true);
    } catch {
      toast.error('Failed to fetch NACHA file');
    } finally {
      setFetchingNacha(false);
    }
  };

  const handlePostItem = async (itemId: string) => {
    if (!batchId) return;
    try {
      await achApi.postInboundItem(batchId, itemId);
      toast.success('Item posted successfully');
    } catch {
      toast.error('Failed to post item');
    }
  };

  const handleReturnItem = async (itemId: string, code: string) => {
    if (!batchId) return;
    try {
      await achApi.returnInboundItem(batchId, itemId, code);
      toast.success('Item returned successfully');
    } catch {
      toast.error('Failed to return item');
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed inset-4 md:inset-8 z-40 bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div>
                <Dialog.Title className="text-lg font-semibold">
                  {batch ? `Batch ${batch.batchNumber}` : 'Batch Detail'}
                </Dialog.Title>
                {batch && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {batch.originatorName} · {batch.itemCount} items
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {mode === 'outbound' && (
                  <button
                    onClick={handleViewNacha}
                    disabled={fetchingNacha || !batch}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {fetchingNacha ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    View NACHA File
                  </button>
                )}
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}

              {batch && (
                <>
                  {/* Info Grid */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Batch Information</h3>
                    <InfoGrid
                      columns={4}
                      items={[
                        { label: 'Batch Number', value: batch.batchNumber, mono: true },
                        { label: 'Type', value: batch.type },
                        { label: 'Originator', value: batch.originatorName },
                        { label: 'Company ID', value: batch.companyId, mono: true },
                        { label: 'Effective Date', value: batch.effectiveDate, format: 'date' },
                        { label: 'Settlement Date', value: batch.settlementDate, format: 'date' },
                        { label: 'Submitted At', value: batch.submittedAt, format: 'datetime' },
                        { label: 'Status', value: batch.status },
                        { label: 'Item Count', value: String(batch.itemCount) },
                        { label: 'Total Amount', value: batch.totalAmount, format: 'money', currency: batch.currency },
                        { label: 'Currency', value: batch.currency },
                      ]}
                    />
                  </section>

                  {/* Status Stepper */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Processing Status</h3>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <StatusStepper status={batch.status} />
                    </div>
                  </section>

                  {/* Items Table */}
                  {batch.items && batch.items.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Entry Items ({batch.items.length})
                      </h3>
                      <AchItemsTable
                        items={batch.items}
                        mode={mode === 'inbound' ? 'inbound-action' : 'view'}
                        onPost={handlePostItem}
                        onReturn={handleReturnItem}
                      />
                    </section>
                  )}
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <NachaFileViewer
        content={nachaContent}
        open={nachaViewerOpen}
        onClose={() => setNachaViewerOpen(false)}
      />
    </>
  );
}
