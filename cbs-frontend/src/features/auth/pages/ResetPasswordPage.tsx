import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Waypoints } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';

export function ResetPasswordPage() {
  useEffect(() => {
    document.title = 'Password Reset | CBS';
  }, []);

  return (
    <AuthShell
      badge="Hosted Reset"
      title="Password reset is handled off-platform"
      description="DigiCore CBS does not reset credentials locally. Continue to the hosted identity journey to recover access safely."
      icon={ShieldCheck}
      backHref="/login"
      backLabel="Back to sign-in"
      heroTitle="Keep credential recovery outside the banking application."
      heroDescription="That separation protects sensitive flows such as password reset, MFA enrollment, and device trust with a single centralized identity policy."
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Need help locating the recovery page?
          </p>
          <Link to="/forgot-password" className="auth-inline-link">
            Open recovery flow
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="gloss-pill rounded-[24px] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Waypoints className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">What happens next</p>
              <p className="text-sm leading-6 text-muted-foreground">
                You will leave the app shell, complete the hosted recovery journey, and return with a clean authenticated session.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Identity lookup', 'Confirm the account on the hosted page.'],
            ['Credential update', 'Change password under the identity provider policy.'],
            ['Return to CBS', 'Sign back in with a fresh secure session.'],
          ].map(([title, description]) => (
            <div key={title} className="gloss-pill rounded-2xl p-4">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/forgot-password" className="auth-primary-button w-full sm:flex-1">
            Continue to password recovery
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/login" className="auth-secondary-button w-full sm:flex-1">
            Return to sign-in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
