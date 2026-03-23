import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { parameterApi } from '../../api/parameterApi';
import type { SystemParameter } from '../../api/parameterApi';

interface FlagCardProps {
  flag: SystemParameter;
  onToggle: (flag: SystemParameter) => void;
  isLoading: boolean;
}

function FlagCard({ flag, onToggle, isLoading }: FlagCardProps) {
  const enabled = flag.paramValue === 'true';
  const isExperimental = flag.paramKey.toLowerCase().includes('experimental');

  return (
    <div
      className={cn(
        'surface-card p-5 space-y-3 hover:border-primary/30 transition-colors',
        isExperimental && 'border-amber-300 dark:border-amber-700',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isExperimental && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            <h3 className="text-sm font-semibold truncate">{flag.paramKey}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {flag.description ?? 'No description'}
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onToggle(flag)}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
            enabled ? 'bg-primary' : 'bg-muted-foreground/30',
          )}
          aria-label={enabled ? 'Disable feature' : 'Enable feature'}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>
      {flag.lastModifiedBy && (
        <p className="text-xs text-muted-foreground">
          Last changed{flag.updatedAt ? `: ${formatDateTime(flag.updatedAt)}` : ''}{' '}
          by {flag.lastModifiedBy}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <span className={cn('w-2 h-2 rounded-full', enabled ? 'bg-green-500' : 'bg-gray-300')} />
        <span className="text-xs font-medium">{enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
    </div>
  );
}

interface ReasonDialogProps {
  open: boolean;
  flag: SystemParameter | null;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}

function ReasonDialog({ open, flag, reason, onReasonChange, onConfirm, onClose, isLoading }: ReasonDialogProps) {
  if (!open || !flag) return null;
  const isDisabling = flag.paramValue === 'true';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3">
            {isDisabling && (
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold">
                {isDisabling ? 'Disable' : 'Enable'} {flag.paramKey}?
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
  const [targetFlag, setTargetFlag] = useState<SystemParameter | null>(null);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: flags = [], isLoading, isError } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => parameterApi.getFeatureFlags(),
  });

  const mutation = useMutation({
    mutationFn: ({ code, enabled, reason }: { code: string; enabled: boolean; reason: string }) =>
      parameterApi.toggleFeatureFlag(code, enabled, reason),
    onMutate: async ({ code, enabled }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['feature-flags'] });
      const previous = queryClient.getQueryData<SystemParameter[]>(['feature-flags']);
      queryClient.setQueryData<SystemParameter[]>(['feature-flags'], (old) =>
        old?.map((f) => (f.paramKey === code ? { ...f, paramValue: String(enabled) } : f)) ?? [],
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success('Feature flag updated');
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      setTargetFlag(null);
      setReason('');
    },
    onError: (_err, _vars, context) => {
      toast.error('Failed to toggle feature flag');
      if (context?.previous) {
        queryClient.setQueryData(['feature-flags'], context.previous);
      }
    },
  });

  const handleToggleClick = (flag: SystemParameter) => {
    setTargetFlag(flag);
    setReason('');
  };

  const handleConfirm = () => {
    if (!targetFlag) return;
    mutation.mutate({
      code: targetFlag.paramKey,
      enabled: targetFlag.paramValue !== 'true',
      reason,
    });
  };

  const filtered = flags.filter((f) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return f.paramKey.toLowerCase().includes(lower) || (f.description?.toLowerCase().includes(lower) ?? false);
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="surface-card p-5 space-y-3 animate-pulse">
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
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Feature flags could not be loaded from the backend.
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Feature Flags</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {flags.filter((f) => f.paramValue === 'true').length} of {flags.length} features enabled
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search flags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-52"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No feature flags found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((flag) => (
              <FlagCard
                key={flag.id}
                flag={flag}
                onToggle={handleToggleClick}
                isLoading={mutation.isPending && targetFlag?.paramKey === flag.paramKey}
              />
            ))}
          </div>
        )}
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
