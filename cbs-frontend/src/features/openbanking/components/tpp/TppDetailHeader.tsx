import { StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { ArrowLeft, RotateCw, Pause, Play, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TppClient, TppClientType } from '../../api/openBankingApi';

const CLIENT_TYPE_STYLES: Record<TppClientType, string> = {
  TPP_AISP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TPP_PISP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TPP_BOTH: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const CLIENT_TYPE_LABEL: Record<TppClientType, string> = {
  TPP_AISP: 'AISP',
  TPP_PISP: 'PISP',
  TPP_BOTH: 'BOTH',
};

interface TppDetailHeaderProps {
  client: TppClient;
  onSuspend?: () => void;
  onReactivate?: () => void;
  onRotateSecret?: () => void;
  onDelete?: () => void;
}

export function TppDetailHeader({
  client,
  onSuspend,
  onReactivate,
  onRotateSecret,
  onDelete,
}: TppDetailHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="px-6 pt-4 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/open-banking')}
            className="mt-1 p-1 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  CLIENT_TYPE_STYLES[client.clientType],
                )}
              >
                {CLIENT_TYPE_LABEL[client.clientType]}
              </span>
              <StatusBadge status={client.status} dot />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              <code className="font-mono">{client.clientId}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onRotateSecret && (
            <button
              onClick={onRotateSecret}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rotate Secret
            </button>
          )}
          {client.status === 'ACTIVE' && onSuspend && (
            <button
              onClick={onSuspend}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              Suspend
            </button>
          )}
          {client.status === 'SUSPENDED' && onReactivate && (
            <button
              onClick={onReactivate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-300 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Reactivate
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
