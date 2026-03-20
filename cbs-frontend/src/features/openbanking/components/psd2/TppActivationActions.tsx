import { useState } from 'react';
import { CheckCircle2, Ban } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useActivatePsd2Tpp, useSuspendPsd2Tpp } from '../../hooks/usePsd2';
import { toast } from 'sonner';
import type { Psd2TppRegistration } from '../../api/psd2Api';

interface TppActivationActionsProps {
  tpp: Psd2TppRegistration;
}

export function TppActivationActions({ tpp }: TppActivationActionsProps) {
  const [showActivate, setShowActivate] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const { mutate: activate, isPending: activating } = useActivatePsd2Tpp();
  const { mutate: suspend, isPending: suspending } = useSuspendPsd2Tpp();

  const handleActivate = () => {
    activate(tpp.tppId, {
      onSuccess: () => {
        toast.success(`${tpp.tppName} activated successfully`);
        setShowActivate(false);
      },
      onError: () => {
        toast.error('Failed to activate TPP');
      },
    });
  };

  const handleSuspend = () => {
    suspend(tpp.tppId, {
      onSuccess: () => {
        toast.success(`${tpp.tppName} suspended`);
        setShowSuspend(false);
      },
      onError: () => {
        toast.error('Failed to suspend TPP');
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      {(tpp.status === 'PENDING' || tpp.status === 'SUSPENDED') && (
        <button
          onClick={() => setShowActivate(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-green-300 text-green-600 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
        >
          <CheckCircle2 className="w-3 h-3" />
          Activate
        </button>
      )}

      {tpp.status === 'ACTIVE' && (
        <button
          onClick={() => setShowSuspend(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <Ban className="w-3 h-3" />
          Suspend
        </button>
      )}

      <ConfirmDialog
        open={showActivate}
        onClose={() => setShowActivate(false)}
        onConfirm={handleActivate}
        title="Activate TPP"
        description={`Are you sure you want to activate ${tpp.tppName}? This will allow the TPP to access APIs and initiate SCA flows.`}
        confirmLabel="Activate"
        isLoading={activating}
      />

      <ConfirmDialog
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
        onConfirm={handleSuspend}
        title="Suspend TPP"
        description={`Are you sure you want to suspend ${tpp.tppName}? All active sessions will be terminated and API access will be revoked.`}
        confirmLabel="Suspend"
        variant="destructive"
        isLoading={suspending}
      />
    </div>
  );
}
