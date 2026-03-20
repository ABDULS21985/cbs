import { CheckCircle2, Ban, X, Loader2 } from 'lucide-react';

interface BulkConsentActionsProps {
  selectedCount: number;
  onAuthoriseAll: () => void;
  onRevokeAll: () => void;
  onClear: () => void;
  isAuthorising?: boolean;
  isRevoking?: boolean;
}

export function BulkConsentActions({
  selectedCount,
  onAuthoriseAll,
  onRevokeAll,
  onClear,
  isAuthorising,
  isRevoking,
}: BulkConsentActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-muted/50">
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>

      <div className="h-4 w-px bg-border" />

      <button
        onClick={onAuthoriseAll}
        disabled={isAuthorising || isRevoking}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {isAuthorising ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        Authorise All
      </button>

      <button
        onClick={onRevokeAll}
        disabled={isAuthorising || isRevoking}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {isRevoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
        Revoke All
      </button>

      <button
        onClick={onClear}
        className="ml-auto p-1 rounded-md hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
