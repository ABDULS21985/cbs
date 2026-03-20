import { useState } from 'react';
import { X, Loader2, Plus, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TppScopeSelector } from './TppScopeSelector';
import type { TppClientType, TppClient } from '../../api/openBankingApi';

interface RegisterTppSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    payload: { name: string; redirectUri: string; scopes: string[]; clientType: TppClientType },
    callbacks: { onSuccess: (data: TppClient) => void; onError: () => void },
  ) => void;
  isPending: boolean;
}

const CLIENT_TYPES: { value: TppClientType; label: string; description: string }[] = [
  { value: 'TPP_AISP', label: 'AISP', description: 'Account Information Service Provider' },
  { value: 'TPP_PISP', label: 'PISP', description: 'Payment Initiation Service Provider' },
  { value: 'TPP_BOTH', label: 'Both', description: 'AISP + PISP combined access' },
];

export function RegisterTppSheet({ open, onClose, onSubmit, isPending }: RegisterTppSheetProps) {
  const [form, setForm] = useState({
    name: '',
    redirectUri: '',
    clientType: 'TPP_AISP' as TppClientType,
    scopes: [] as string[],
  });
  const [credentials, setCredentials] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!open) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form, {
      onSuccess: (data) => {
        toast.success('TPP client registered successfully');
        if (data.clientId && data.clientSecret) {
          setCredentials({ clientId: data.clientId, clientSecret: data.clientSecret });
        } else {
          handleClose();
        }
      },
      onError: () => toast.error('Failed to register TPP client'),
    });
  };

  const handleClose = () => {
    setForm({ name: '', redirectUri: '', clientType: 'TPP_AISP', scopes: [] });
    setCredentials(null);
    onClose();
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />
      <div className="fixed inset-0 flex justify-end z-50">
        <div
          className="w-full max-w-lg bg-card shadow-2xl border-l flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold">Register TPP Client</h2>
            <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {credentials ? (
              /* Credentials display */
              <div className="space-y-6">
                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-4">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    TPP Client registered successfully
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Save these credentials now. The client secret will not be shown again.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Client ID</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg border bg-muted text-sm font-mono break-all">
                        {credentials.clientId}
                      </code>
                      <button
                        onClick={() => handleCopy(credentials.clientId, 'clientId')}
                        className="p-2 rounded-lg border hover:bg-muted transition-colors"
                      >
                        {copiedField === 'clientId' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Secret</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg border bg-muted text-sm font-mono break-all">
                        {credentials.clientSecret}
                      </code>
                      <button
                        onClick={() => handleCopy(credentials.clientSecret, 'clientSecret')}
                        className="p-2 rounded-lg border hover:bg-muted transition-colors"
                      >
                        {copiedField === 'clientSecret' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Registration form */
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Name</label>
                  <input
                    required
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. FinTech Payments Ltd"
                  />
                </div>

                {/* Redirect URI */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Redirect URI</label>
                  <input
                    required
                    type="url"
                    className={inputCls}
                    value={form.redirectUri}
                    onChange={(e) => setForm((f) => ({ ...f, redirectUri: e.target.value }))}
                    placeholder="https://app.example.com/callback"
                  />
                </div>

                {/* Client Type - Radio Cards */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Client Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {CLIENT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, clientType: type.value }))}
                        className={cn(
                          'rounded-lg border p-3 text-left transition-all',
                          form.clientType === type.value
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-muted',
                        )}
                      >
                        <div className="text-sm font-semibold">{type.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scopes */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Scopes</label>
                  <TppScopeSelector
                    selectedScopes={form.scopes}
                    onChange={(scopes) => setForm((f) => ({ ...f, scopes }))}
                    clientType={form.clientType}
                    autoSelect
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || form.scopes.length === 0 || !form.name || !form.redirectUri}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Register
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
