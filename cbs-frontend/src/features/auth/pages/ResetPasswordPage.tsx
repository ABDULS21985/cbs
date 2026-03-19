import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { PasswordStrengthMeter, getPasswordStrength } from '../components/PasswordStrengthMeter';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const strength = getPasswordStrength(password);
  const isValid = strength.score >= 3 && password === confirm && token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword: password });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch {
      toast.error('Reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔗</div>
          <h2 className="text-xl font-semibold">Invalid reset link</h2>
          <p className="text-sm text-muted-foreground">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Set new password</h2>
          <p className="text-sm text-muted-foreground mt-1">Your new password must meet the security requirements below.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={password} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {confirm && password !== confirm && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
