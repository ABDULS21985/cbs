import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { ConfirmDialog } from '@/components/shared';
import { parameterApi } from '../../api/parameterApi';
import type { FeatureFlag } from '../../api/parameterApi';

const TAG_STYLES: Record<string, string> = {
  Beta: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Coming Soon': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'Not Approved': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface FlagCardProps {
  flag: FeatureFlag;
  onToggle: (flag: FeatureFlag) => void;
  isLoading: boolean;
}

function FlagCard({ flag, onToggle, isLoading }: FlagCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold truncate">{flag.name}</h3>
            {flag.tag && (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                  TAG_STYLES[flag.tag] ?? 'bg-gray-100 text-gray-600',
                )}
              >
                {flag.tag}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{flag.description}</p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onToggle(flag)}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
            flag.enabled ? 'bg-primary' : 'bg-muted-foreground/30',
          )}
          aria-label={flag.enabled ? 'Disable feature' : 'Enable feature'}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              flag.enabled ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>
      {(flag.lastChangedAt || flag.lastChangedBy) && (
        <p className="text-xs text-muted-foreground">
          Last changed{flag.lastChangedAt ? `: ${formatDateTime(flag.lastChangedAt)}` : ''}{' '}
          {flag.lastChangedBy ? `by ${flag.lastChangedBy}` : ''}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            flag.enabled ? 'bg-green-500' : 'bg-gray-300',
          )}
        />
        <span className="text-xs font-medium">
          {flag.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </div>
  );
}

interface ReasonDialogProps {
  open: boolean;
  flag: FeatureFlag | null;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}

function ReasonDialog({ open, flag, reason, onReasonChange, onConfirm, onClose, isLoading }: ReasonDialogProps) {
  if (!open || !flag) return null;

  const isDisabling = flag.enabled;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3">
            {isDisabling && (
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-lg">⚠</span>
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold">
                {isDisabling ? 'Disable' : 'Enable'} {flag.name}?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isDisabling
                  ? 'Disabling this feature will immediately affect all users. Please provide a reason.'
                  : 'Please provide a reason for enabling this feature.'}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              placeholder="Describe the reason for this change"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading || reason.trim().length < 5}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
                isDisabling
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {isLoading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Confirm
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function FeatureFlagToggles() {
  const [targetFlag, setTargetFlag] = useState<FeatureFlag | null>(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => parameterApi.getFeatureFlags(),
  });

  const mutation = useMutation({
    mutationFn: ({ code, enabled, reason }: { code: string; enabled: boolean; reason: string }) =>
      parameterApi.toggleFeatureFlag(code, enabled, reason),
    onSuccess: (updated) => {
      toast.success(`"${updated.name}" has been ${updated.enabled ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      setTargetFlag(null);
      setReason('');
    },
    onError: () => {
      toast.error('Failed to toggle feature flag');
    },
  });

  const handleToggleClick = (flag: FeatureFlag) => {
    setTargetFlag(flag);
    setReason('');
  };

  const handleConfirm = () => {
    if (!targetFlag) return;
    mutation.mutate({
      code: targetFlag.code,
      enabled: !targetFlag.enabled,
      reason,
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Feature Flags</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {flags.filter((f) => f.enabled).length} of {flags.length} features enabled
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {flags.map((flag) => (
            <FlagCard
              key={flag.code}
              flag={flag}
              onToggle={handleToggleClick}
              isLoading={mutation.isPending && targetFlag?.code === flag.code}
            />
          ))}
        </div>
      </div>

      <ReasonDialog
        open={!!targetFlag}
        flag={targetFlag}
        reason={reason}
        onReasonChange={setReason}
        onConfirm={handleConfirm}
        onClose={() => {
          setTargetFlag(null);
          setReason('');
        }}
        isLoading={mutation.isPending}
      />
    </>
  );
}
