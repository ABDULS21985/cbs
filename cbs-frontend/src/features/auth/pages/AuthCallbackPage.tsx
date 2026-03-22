import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { AuthShell } from '../components/AuthShell';

const callbackExchangeCache = new Map<string, Promise<string>>();

export function AuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const completeLogin = useAuthStore((state) => state.completeLogin);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Completing Sign-In | CBS';
  }, []);

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
    <AuthShell
      badge="Secure Callback"
      title={error ? 'Sign-in could not be completed' : 'Finalizing your secure session'}
      description={error
        ? 'The hosted sign-in flow returned an error before the CBS session could be established.'
        : 'We are validating the hosted authorization response, exchanging the code securely, and restoring your banking session.'}
      icon={error ? AlertCircle : ShieldCheck}
      heroTitle="Complete the identity hand-off before entering the banking workspace."
      heroDescription="The callback step validates state, exchanges the authorization code, and restores the intended destination without replaying credentials."
      footer={error ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            If the problem persists, restart the sign-in flow to generate a fresh callback transaction.
          </p>
          <Link to="/login" className="auth-inline-link">
            Back to sign-in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Do not close the browser while the identity callback is being finalized.
        </p>
      )}
    >
      {error ? (
        <div className="space-y-4">
          <div className="auth-status-banner border-red-500/20 bg-red-500/10 text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
            <div>
              <p className="font-medium text-red-100">Callback validation failed</p>
              <p className="mt-1 text-red-100/75">{error}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/login" className="auth-primary-button w-full">
              Restart sign-in
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/forgot-password" className="auth-secondary-button w-full">
              Recovery options
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="gloss-pill rounded-[24px] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Session in progress</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Your browser is exchanging the hosted authorization code for a CBS session and will redirect automatically when done.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              'Validate the authorization response and anti-forgery state.',
              'Exchange the authorization code for tokens with PKCE verification.',
              'Restore your intended destination and continue the banking journey.',
            ].map((step) => (
              <div key={step} className="gloss-pill flex items-center gap-3 rounded-2xl px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
