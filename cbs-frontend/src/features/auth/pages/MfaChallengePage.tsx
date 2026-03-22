import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Smartphone, TimerReset } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { AuthShell } from '../components/AuthShell';

const mfaMetrics = [
  { value: 'TOTP', label: 'Authenticator ready' },
  { value: 'Hosted', label: 'MFA challenge' },
  { value: 'Audited', label: 'Security event' },
];

const mfaFeatures = [
  {
    icon: ShieldCheck,
    title: 'Challenge off the app shell',
    description: 'The MFA prompt remains on the identity provider so the banking UI never receives OTP secrets.',
  },
  {
    icon: Smartphone,
    title: 'Consistent device verification',
    description: 'TOTP, SMS, or hardware token enrollment stays under your Keycloak security policy.',
  },
  {
    icon: TimerReset,
    title: 'Retry without breaking context',
    description: 'Restart the secure sign-in and preserve the same audited identity journey.',
  },
];

export function MfaChallengePage() {
  const { login, mfaRequired } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Multi-Factor Authentication | CBS';
  }, []);

  useEffect(() => {
    if (!mfaRequired) {
      navigate('/login', { replace: true });
    }
  }, [mfaRequired, navigate]);

  return (
    <AuthShell
      badge="MFA Handoff"
      title="Complete multi-factor authentication"
      description="This route does not capture OTP codes directly. Restart the hosted sign-in and complete MFA on the identity provider page."
      icon={ShieldCheck}
      backHref="/login"
      backLabel="Return to sign-in"
      heroTitle="Keep multi-factor verification inside the hosted identity experience."
      heroDescription="That keeps secrets, device trust, and factor enrollment out of the banking UI while preserving a clean operator experience."
      metrics={mfaMetrics}
      features={mfaFeatures}
    >
      <div className="auth-warning-banner">
        <ShieldCheck className="auth-warning-icon mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <p className="auth-warning-title">Hosted MFA only</p>
          <p className="auth-warning-copy">
            DigiCore CBS does not accept OTP entry in-app. Restart the secure sign-in and finish the challenge on the hosted identity page.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['1', 'Restart the secure sign-in flow'],
          ['2', 'Complete MFA on the hosted page'],
          ['3', 'Return with an authenticated session'],
        ].map(([step, label]) => (
          <div key={step} className="gloss-pill rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Step {step}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => login(undefined, undefined, '/dashboard')}
        className="auth-primary-button w-full"
      >
        Restart secure sign-in
        <ArrowRight className="h-4 w-4" />
      </button>

      <p className="text-center text-sm leading-6 text-muted-foreground">
        Need to back out first?{' '}
        <Link to="/login" className="font-medium text-primary transition hover:text-primary/80">
          Return to login
        </Link>
      </p>
    </AuthShell>
  );
}
