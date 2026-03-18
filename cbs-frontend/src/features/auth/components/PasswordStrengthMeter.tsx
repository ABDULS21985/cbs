import { cn } from '@/lib/utils';
import type { PasswordStrength } from '@/types/auth';
import { Check, X } from 'lucide-react';

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const labels: PasswordStrength['label'][] = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return { score: Math.min(passed, 4), label: labels[Math.min(passed, 4)], checks };
}

const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

interface Props {
  password: string;
}

export function PasswordStrengthMeter({ password }: Props) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= strength.score ? strengthColors[strength.score] : 'bg-muted')}
          />
        ))}
      </div>
      <p className={cn('text-xs font-medium', strength.score <= 1 ? 'text-red-500' : strength.score <= 2 ? 'text-yellow-600' : 'text-green-600')}>
        {strength.label}
      </p>
      <div className="space-y-1">
        {[
          { key: 'minLength', label: 'At least 12 characters' },
          { key: 'hasUppercase', label: 'Uppercase letter (A-Z)' },
          { key: 'hasLowercase', label: 'Lowercase letter (a-z)' },
          { key: 'hasDigit', label: 'Number (0-9)' },
          { key: 'hasSpecial', label: 'Special character (!@#$...)' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            {strength.checks[key as keyof typeof strength.checks] ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={strength.checks[key as keyof typeof strength.checks] ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
