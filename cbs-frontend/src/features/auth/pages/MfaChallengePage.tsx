import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ShieldCheck } from 'lucide-react';

export function MfaChallengePage() {
  const { login, mfaRequired } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!mfaRequired) navigate('/login', { replace: true });
  }, [mfaRequired, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B1A56] via-[#1E40AF] to-[#15308A] p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-factor authentication is handled by the hosted identity-provider sign-in flow.</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This route no longer accepts demo OTP codes. Restart sign-in and complete MFA in the hosted login experience.
        </div>

        <button
          type="button"
          onClick={() => login(undefined, undefined, '/dashboard')}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Restart secure sign-in
        </button>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Return to login</Link>
        </p>
      </div>
    </div>
  );
}
