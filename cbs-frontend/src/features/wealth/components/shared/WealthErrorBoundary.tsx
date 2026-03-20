import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Error Display Component ─────────────────────────────────────────────────

interface WealthErrorStateProps {
  onRetry?: () => void;
  message?: string;
}

export function WealthErrorState({
  onRetry,
  message = 'Something went wrong while loading this section.',
}: WealthErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      aria-live="assertive"
      role="alert"
    >
      <div className="p-3 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Error loading data
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'border hover:bg-muted transition-colors',
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      )}
    </div>
  );
}

// ─── Error Boundary Class Component ──────────────────────────────────────────

interface WealthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface WealthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class WealthErrorBoundary extends Component<
  WealthErrorBoundaryProps,
  WealthErrorBoundaryState
> {
  constructor(props: WealthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WealthErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[WealthErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <WealthErrorState
          message={this.state.error?.message}
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// ─── HOC Wrapper ─────────────────────────────────────────────────────────────

export function withWealthErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function WithErrorBoundary(props: P) {
    return (
      <WealthErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </WealthErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withWealthErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}
