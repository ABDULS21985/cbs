import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { Clock, LogOut } from 'lucide-react';

export function SessionTimeoutModal() {
  const { showWarning, remainingSeconds, continueSession, logout } = useSessionTimeout();

  if (!showWarning) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100]" />
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Session Expiring</h2>
              <p className="text-sm text-muted-foreground">Your session will expire soon due to inactivity.</p>
            </div>
          </div>

          <div className="text-center py-4">
            <div className="text-4xl font-mono font-bold text-amber-600">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <p className="text-sm text-muted-foreground mt-1">remaining</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
            <button
              onClick={continueSession}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Continue Session
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
