import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'neutral' | 'cyan' | 'purple' | 'teal';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'ui-chip bg-primary text-primary-foreground',
  secondary: 'ui-chip bg-secondary text-secondary-foreground',
  destructive: 'ui-chip ui-chip-danger',
  outline: 'ui-chip border border-border bg-transparent text-foreground',
  success: 'ui-chip ui-chip-success',
  warning: 'ui-chip ui-chip-warning',
  info: 'ui-chip ui-chip-info',
  neutral: 'ui-chip ui-chip-muted',
  cyan: 'ui-chip ui-chip-cyan',
  purple: 'ui-chip ui-chip-purple',
  teal: 'ui-chip ui-chip-teal',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center transition-colors',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
