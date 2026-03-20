import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const callbackExchangeCache = new Map<string, Promise<string>>();

export function AuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const completeLogin = useAuthStore((state) => state.completeLogin);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authError = params.get('error');
    const authErrorDescription = params.get('error_description');
    const code = params.get('code');
    const state = params.get('state');

    if (authError) {
      setError(authErrorDescription || authError);
      return;
    }

    if (!code || !state) {
      setError('Missing authorization response. Start sign-in again.');
      return;
    }

    let cancelled = false;
    const callbackKey = `${state}:${code}`;

    void (async () => {
      try {
        const loginPromise = callbackExchangeCache.get(callbackKey) ?? completeLogin({ code, state });
        callbackExchangeCache.set(callbackKey, loginPromise);
        const returnTo = await loginPromise;
        if (!cancelled) {
          navigate(returnTo, { replace: true });
        }
      } catch (err) {
        callbackExchangeCache.delete(callbackKey);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Secure sign-in failed. Start again.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [completeLogin, location.search, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        {error ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Sign-in failed</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Link
              to="/login"
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to sign-in
            </Link>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Completing secure sign-in</h1>
              <p className="text-sm text-muted-foreground">
                Finalizing your session with the identity provider.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
