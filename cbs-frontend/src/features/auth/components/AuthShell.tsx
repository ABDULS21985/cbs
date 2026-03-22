import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  LockKeyhole,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthMetric = {
  label: string;
  value: string;
};

type AuthFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

interface AuthShellProps {
  theme?: 'dark' | 'light';
  badge?: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
  backHref?: string;
  backLabel?: string;
  heroTitle?: string;
  heroDescription?: string;
  metrics?: AuthMetric[];
  features?: AuthFeature[];
  heroArtworkSrc?: string;
  heroArtworkAlt?: string;
  className?: string;
}

const defaultMetrics: AuthMetric[] = [
  { value: 'OIDC', label: 'Hosted identity' },
  { value: 'PKCE', label: 'Protected hand-off' },
  { value: '24/7', label: 'Session controls' },
];

const defaultFeatures: AuthFeature[] = [
  {
    icon: ShieldCheck,
    title: 'Credential isolation',
    description: 'Passwords, MFA, and recovery steps stay on the trusted identity provider.',
  },
  {
    icon: LockKeyhole,
    title: 'Role-aware access',
    description: 'Banking domains, supervisors, and portal users land in the right security flow.',
  },
  {
    icon: Sparkles,
    title: 'Recovery with traceability',
    description: 'Reset, callback, and session actions remain auditable across the platform.',
  },
];

export function AuthShell({
  theme = 'dark',
  badge = 'Secure Access',
  title,
  description,
  icon: Icon,
  children,
  footer,
  backHref,
  backLabel = 'Back',
  heroTitle = 'Trusted identity perimeter for DigiCore CBS',
  heroDescription = 'A single hardened access layer for staff, operations, treasury, compliance, and customer-facing banking journeys.',
  metrics = defaultMetrics,
  features = defaultFeatures,
  heroArtworkSrc,
  heroArtworkAlt = '',
  className,
}: AuthShellProps) {
  return (
    <div className={cn('auth-stage', theme === 'light' && 'auth-stage-light')}>
      <div className="page-container flex min-h-screen items-center py-8 sm:py-10 lg:py-14">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,520px)] lg:gap-12">
          <section className="auth-hero-panel hidden lg:flex lg:flex-col lg:justify-between lg:gap-8">
            <div className="auth-hero-backdrop" aria-hidden="true" />
            {heroArtworkSrc ? (
              <img
                src={heroArtworkSrc}
                alt={heroArtworkAlt}
                className="auth-hero-artwork"
              />
            ) : null}

            <div className="relative z-10 flex h-full flex-col justify-between gap-8 p-8 xl:p-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-primary/80 via-cyan-400/80 to-accent/90 text-base font-extrabold text-slate-950 shadow-[0_18px_40px_rgba(34,211,238,0.18)]">
                    BB
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                      DigiCore CBS
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      Identity, session, and operator trust boundary
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <span className="auth-shell-kicker">{badge}</span>
                  <div className="space-y-4">
                    <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                      {heroTitle}
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                      {heroDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="auth-shell-metric">
                      <p className="text-2xl font-semibold tracking-tight text-foreground">
                        {metric.value}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid max-w-3xl gap-3">
                  {features.map(({ icon: FeatureIcon, title: featureTitle, description: featureDescription }) => (
                    <div key={featureTitle} className="auth-shell-feature flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <FeatureIcon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{featureTitle}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{featureDescription}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={cn('mx-auto w-full max-w-xl space-y-4', className)}>
            <div className="flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-primary/80 via-cyan-400/80 to-accent/90 text-base font-extrabold text-slate-950">
                  BB
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">DigiCore CBS</p>
                  <p className="text-xs text-muted-foreground">Secure banking access</p>
                </div>
              </div>
              <span className="auth-shell-kicker text-[10px]">{badge}</span>
            </div>

            <div className="auth-shell-card">
              {backHref && (
                <Link to={backHref} className="auth-inline-link mb-6">
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Link>
              )}

              <div className="space-y-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-gradient-to-br from-primary/16 via-cyan-400/14 to-accent/14 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Icon className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                    {title}
                  </h2>
                  <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[15px]">
                    {description}
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-5">{children}</div>

              {footer ? (
                <div className="mt-6 border-t border-white/10 pt-5 text-sm text-muted-foreground">
                  {footer}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
