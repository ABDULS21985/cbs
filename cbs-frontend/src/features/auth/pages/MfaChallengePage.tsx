import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { MfaOtpInput } from '../components/MfaOtpInput';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

export function MfaChallengePage() {
  const { verifyMfa, isLoading, mfaRequired } = useAuthStore();
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mfaRequired) navigate('/login', { replace: true });
  }, [mfaRequired, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleComplete = async (otp: string) => {
    setError('');
    try {
      await verifyMfa(otp);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B1A56] via-[#1E40AF] to-[#15308A] p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit code sent to your registered device</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <MfaOtpInput onComplete={handleComplete} disabled={isLoading} />

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
          </div>
        )}

        <div className="text-center text-sm">
          {countdown > 0 ? (
            <p className="text-muted-foreground">Resend code in <span className="font-mono font-medium">{countdown}s</span></p>
          ) : (
            <button onClick={() => setCountdown(60)} className="text-primary hover:underline">Resend code</button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">Demo OTP: <code className="bg-muted px-1 rounded">123456</code></p>
      </div>
    </div>
  );
}
