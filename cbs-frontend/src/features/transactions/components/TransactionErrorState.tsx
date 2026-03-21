import { useMemo } from 'react';
import { AlertTriangle, LockKeyhole, RefreshCw, SearchX, ServerCrash, WifiOff } from 'lucide-react';
import type { AxiosError } from 'axios';
import { cn } from '@/lib/utils';

type ErrorKind = 'network' | 'server' | 'auth' | 'not-found' | 'unknown';

interface TransactionErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

function getResponseStatus(error: unknown): number | undefined {
  return (error as AxiosError | undefined)?.response?.status;
}

function getHeader(error: unknown, key: string): string | null {
  const headers = (error as AxiosError | undefined)?.response?.headers;
  if (!headers) return null;

  const value = (headers as Record<string, unknown>)[key] ?? (headers as Record<string, unknown>)[key.toLowerCase()];
  return typeof value === 'string' ? value : null;
}

function classifyError(error: unknown): ErrorKind {
  const status = getResponseStatus(error);
  const message = String((error as Error | undefined)?.message ?? '').toLowerCase();

  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not-found';
  if (status !== undefined && status >= 500) return 'server';
  if (message.includes('network') || message.includes('offline') || message.includes('fetch') || message.includes('timeout')) {
    return 'network';
  }
  if ((error as AxiosError | undefined)?.response === undefined && (error as AxiosError | undefined)?.request) {
    return 'network';
  }
  return 'unknown';
}

function createErrorId(error: unknown): string {
  return (
    getHeader(error, 'x-request-id') ||
    getHeader(error, 'x-correlation-id') ||
    `TXN-${Date.now().toString(36).toUpperCase()}`
  );
}

export function TransactionErrorState({
  error,
  onRetry,
  className,
  compact = false,
}: TransactionErrorStateProps) {
  const kind = useMemo(() => classifyError(error), [error]);
  const errorId = useMemo(() => createErrorId(error), [error]);

  const config = {
    network: {
      icon: WifiOff,
      title: 'Network error',
      message: 'We could not reach the transaction service. Check connectivity and try again.',
      tone: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300',
      canRetry: true,
    },
    server: {
      icon: ServerCrash,
      title: 'Server error',
      message: 'The transaction service returned an unexpected error. Contact support with the reference below if this continues.',
      tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300',
      canRetry: false,
    },
    auth: {
      icon: LockKeyhole,
      title: 'Authentication error',
      message: 'Your session is no longer authorized to load transaction data. Sign in again and retry.',
      tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300',
      canRetry: false,
    },
    'not-found': {
      icon: SearchX,
      title: 'Not found',
      message: 'The requested transaction data could not be found.',
      tone: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300',
      canRetry: false,
    },
    unknown: {
      icon: AlertTriangle,
      title: 'Unexpected error',
      message: 'Something went wrong while loading transaction data. Retry the action or contact support if the issue persists.',
      tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300',
      canRetry: Boolean(onRetry),
    },
  }[kind];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-xl border px-4 py-4',
        compact ? 'text-sm' : 'flex flex-col gap-4 md:flex-row md:items-start md:justify-between',
        config.tone,
        className,
      )}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 rounded-full bg-white/60 p-2 dark:bg-black/10">
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{config.title}</p>
          <p className="max-w-2xl text-sm">{config.message}</p>
          <p className="text-xs opacity-80">Error ID: {errorId}</p>
        </div>
      </div>

      <div className={cn('flex flex-wrap items-center gap-2', compact && 'mt-3')}>
        {config.canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg border border-current/20 bg-white/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/80 dark:bg-black/10 dark:hover:bg-black/20"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        )}
        {kind === 'server' && (
          <a
            href={`mailto:support@bellbank.local?subject=Transaction%20Support%20${errorId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-current/20 bg-white/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/80 dark:bg-black/10 dark:hover:bg-black/20"
          >
            Contact Support
          </a>
        )}
      </div>
    </div>
  );
}
