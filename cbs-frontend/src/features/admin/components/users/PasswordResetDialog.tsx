import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Copy, Check, Key, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { userAdminApi, type CbsUser } from '../../api/userAdminApi';

interface PasswordResetDialogProps {
  user: CbsUser | null;
  open: boolean;
  onClose: () => void;
}

export function PasswordResetDialog({ user, open, onClose }: PasswordResetDialogProps) {
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetMutation = useMutation({
    mutationFn: () => userAdminApi.resetPassword(user!.id),
    onSuccess: (data) => {
      setGeneratedPassword(data.temporaryPassword);
      toast.success('Password reset successfully');
    },
    onError: () => toast.error('Failed to reset password'),
  });

  const handleClose = () => {
    setGeneratedPassword(null);
    setCopied(false);
    onClose();
  };

  const handleCopy = async () => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open || !user) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Key className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Reset Password</h3>
                <p className="text-sm text-muted-foreground">for {user.fullName}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!generatedPassword ? (
            <>
              {/* Confirmation */}
              <div className="rounded-lg bg-muted/50 border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-mono font-medium">{user.username}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{user.email}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                A temporary password will be generated and sent to{' '}
                <strong className="text-foreground">{user.email}</strong>. The user will be required to change it on next login.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={handleClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {resetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reset Password
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Generated password */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Password reset successful</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  An email with login instructions has been sent to <strong className="text-foreground">{user.email}</strong>. The temporary password is shown below for reference:
                </p>
                <div className="relative rounded-lg border bg-muted p-3">
                  <code className="text-sm font-mono tracking-wider pr-10 break-all">{generatedPassword}</code>
                  <button
                    onClick={handleCopy}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-background transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Store this securely. This password will not be shown again once you close this dialog.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
