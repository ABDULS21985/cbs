import { useEffect, useState } from 'react';
import { ArrowRight, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/authApi';
import { AuthShell } from '../components/AuthShell';

const recoveryMetrics = [
  { value: '3', label: 'Recovery steps' },
  { value: 'Hosted', label: 'Reset flow' },
  { value: 'Audited', label: 'Security path' },
];

const recoveryFeatures = [
  {
    icon: Mail,
    title: 'Email-guided recovery',
    description: 'Start with the user email so Keycloak can guide the right recovery path.',
  },
  {
    icon: ShieldCheck,
    title: 'No local password reset',
    description: 'The banking app never handles raw password reset or MFA recovery directly.',
  },
  {
    icon: ShieldAlert,
    title: 'Consistent security policy',
    description: 'Password rotation, MFA enrollment, and verification stay under the same identity controls.',
  },
];

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'Password Recovery | CBS';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Account Recovery"
      title="Reset your password securely"
      description="Start the hosted password recovery flow. DigiCore CBS will redirect you to the identity provider to complete the reset."
      icon={Mail}
      backHref="/login"
      backLabel="Back to sign-in"
      heroTitle="Guide locked-out users back in without weakening the trust boundary."
      heroDescription="Recovery stays inside the identity perimeter, not in application code. That keeps reset, MFA, and verification policies consistent across banking roles."
      metrics={recoveryMetrics}
      features={recoveryFeatures}
      footer={(
        <p className="text-sm leading-6 text-muted-foreground">
          If the account is staff-managed, continue through the hosted identity flow and follow your organization&apos;s recovery policy.
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="recovery-email" className="auth-field-label">
            Email address
          </label>
          <input
            id="recovery-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@digicorebank.com"
            autoFocus
            required
            disabled={isLoading}
            className="auth-field-input"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            We use this as a login hint before handing off to the hosted identity provider.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['1', 'Enter your email'],
            ['2', 'Continue to Keycloak'],
            ['3', 'Complete the secure reset'],
          ].map(([step, label]) => (
            <div key={step} className="gloss-pill rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Step {step}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="auth-primary-button w-full"
        >
          {isLoading ? 'Redirecting to password recovery' : (
            <>
              Continue to password reset
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
