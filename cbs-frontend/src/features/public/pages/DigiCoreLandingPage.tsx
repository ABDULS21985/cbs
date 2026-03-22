import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  BrainCircuit,
  Briefcase,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  Globe2,
  Headphones,
  HelpCircle,
  Home,
  Landmark,
  LockKeyhole,
  Network,
  Phone,
  Scale,
  Settings2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCircle,
  Users,
  WalletCards,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { navigationItems, type NavItem, type NavSection } from '@/components/layout/navigation';
import coreBankingHero from '@/assets/auth/core-banking-hero.svg';
import coreBankingLoginPhoto from '@/assets/auth/core-banking-login-photo.jpg';

type SectionTone = {
  description: string;
  eyebrow: string;
  accentBorder: string;
  accentBadge: string;
  accentIcon: string;
  accentChip: string;
};

type ModuleWithMeta = NavItem & {
  sectionTitle: string;
  sectionId: string;
  capabilityCount: number;
};

type PortalModule = {
  title: string;
  description: string;
  icon: LucideIcon;
  capabilities: string[];
};

const sectionToneMap: Record<string, SectionTone> = {
  BANKING: {
    eyebrow: 'Core Banking',
    description: 'Retail, corporate, lending, deposits, payments, cards, and trade finance operations across the core balance sheet.',
    accentBorder: 'border-sky-400/25',
    accentBadge: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
    accentIcon: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
    accentChip: 'border-sky-300/18 bg-sky-400/10 text-sky-50',
  },
  'CUSTOMER SERVICE': {
    eyebrow: 'Experience Layer',
    description: 'Case management, agreements, communications, and contact center journeys built around customer service resolution.',
    accentBorder: 'border-cyan-400/25',
    accentBadge: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
    accentIcon: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100',
    accentChip: 'border-cyan-300/18 bg-cyan-400/10 text-cyan-50',
  },
  WEALTH: {
    eyebrow: 'Advisory & Wealth',
    description: 'Wealth advisory, trusts, portfolios, funds, and analytics for relationship-led banking and investment services.',
    accentBorder: 'border-emerald-400/25',
    accentBadge: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    accentIcon: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    accentChip: 'border-emerald-300/18 bg-emerald-400/10 text-emerald-50',
  },
  ADVISORY: {
    eyebrow: 'Capital & Corporate Advisory',
    description: 'M&A, tax, corporate finance, project finance, suitability, and advisory wealth offerings in one deal workspace.',
    accentBorder: 'border-lime-400/25',
    accentBadge: 'border-lime-400/30 bg-lime-400/10 text-lime-100',
    accentIcon: 'border-lime-300/25 bg-lime-400/10 text-lime-100',
    accentChip: 'border-lime-300/18 bg-lime-400/10 text-lime-50',
  },
  TREASURY: {
    eyebrow: 'Treasury & Markets',
    description: 'Treasury, fixed income, investments, market data, capital markets, custody, and ALM command surfaces.',
    accentBorder: 'border-violet-400/25',
    accentBadge: 'border-violet-400/30 bg-violet-400/10 text-violet-100',
    accentIcon: 'border-violet-300/25 bg-violet-400/10 text-violet-100',
    accentChip: 'border-violet-300/18 bg-violet-400/10 text-violet-50',
  },
  INTELLIGENCE: {
    eyebrow: 'Intelligence',
    description: 'Behaviour analytics, document intelligence, cash-flow forecasting, and BI orchestration embedded into operations.',
    accentBorder: 'border-fuchsia-400/25',
    accentBadge: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100',
    accentIcon: 'border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100',
    accentChip: 'border-fuchsia-300/18 bg-fuchsia-400/10 text-fuchsia-50',
  },
  'RISK & COMPLIANCE': {
    eyebrow: 'Risk & Governance',
    description: 'Risk, compliance, AML, fraud, sanctions, DSPM, regulatory reporting, and audit visibility for regulated banking.',
    accentBorder: 'border-amber-400/25',
    accentBadge: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
    accentIcon: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
    accentChip: 'border-amber-300/18 bg-amber-400/10 text-amber-50',
  },
  OPERATIONS: {
    eyebrow: 'Operations & Ecosystem',
    description: 'Back-office operations, gateway, channels, open banking, notifications, reporting, and administration.',
    accentBorder: 'border-rose-400/25',
    accentBadge: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
    accentIcon: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
    accentChip: 'border-rose-300/18 bg-rose-400/10 text-rose-50',
  },
};

const portalModules: PortalModule[] = [
  {
    title: 'Digital Customer Portal',
    description: 'Account visibility, transaction access, profile views, and the everyday customer banking cockpit.',
    icon: Home,
    capabilities: ['Dashboard', 'Accounts', 'Profile', 'Help'],
  },
  {
    title: 'Transfers & Payments',
    description: 'Self-service transfers, transfer history, bill payments, airtime, and beneficiary management.',
    icon: ArrowLeftRight,
    capabilities: ['Transfers', 'Transfer History', 'Beneficiaries', 'Pay Bills', 'Airtime'],
  },
  {
    title: 'Cards & Requests',
    description: 'Card controls, card management, service requests, and customer-side service operations.',
    icon: CreditCard,
    capabilities: ['Cards', 'Service Requests', 'Notifications'],
  },
  {
    title: 'Portal Administration',
    description: 'Operational profile-review workflows for customer update approvals from the portal channel.',
    icon: Users,
    capabilities: ['Profile Reviews'],
  },
];

const platformHighlights = [
  {
    icon: Landmark,
    title: 'Unified Core Ledger',
    description: 'Customer, account, lending, deposit, wallet, and statement operations run through one banking surface.',
  },
  {
    icon: Network,
    title: 'Treasury To Capital Markets',
    description: 'Treasury, ALM, custody, market data, capital markets, and investment workflows are all represented.',
  },
  {
    icon: ShieldCheck,
    title: 'Regulated By Design',
    description: 'Risk, compliance, audit, approvals, reconciliation, and reporting are embedded into the operating model.',
  },
  {
    icon: BrainCircuit,
    title: 'Intelligence Embedded',
    description: 'Document intelligence, behaviour analytics, BI dashboards, and forecasting extend the operational core.',
  },
];

const trustPillars = [
  {
    icon: LockKeyhole,
    title: 'Hosted identity perimeter',
    description: 'OIDC, PKCE, JWT-secured access flows with hosted sign-in, MFA, and session recovery.',
  },
  {
    icon: Scale,
    title: 'Approval and audit visibility',
    description: 'Operational queues, reversal governance, dispute tracking, compliance export, and report-grade controls.',
  },
  {
    icon: Globe2,
    title: 'API and ecosystem readiness',
    description: 'Open banking, gateway orchestration, PSD2, webhooks, ISO 20022, notifications, and developer-facing services.',
  },
];

const roleDescriptions: Record<string, { label: string; icon: LucideIcon; description: string }> = {
  CBS_ADMIN: {
    label: 'Enterprise administrators',
    icon: Shield,
    description: 'Operate product, security, provider, fee, workflow, and configuration layers across the platform.',
  },
  CBS_OFFICER: {
    label: 'Banking officers',
    icon: Building2,
    description: 'Handle customers, accounts, loans, payments, operations, and customer-service workflows in one workspace.',
  },
  TREASURY: {
    label: 'Treasury teams',
    icon: WalletCards,
    description: 'Manage deals, positions, ALM, market data, capital markets, custody, and funding analytics.',
  },
  COMPLIANCE: {
    label: 'Compliance teams',
    icon: Scale,
    description: 'Run AML, fraud, sanctions, regulatory return, audit, and dispute/compliance reporting operations.',
  },
  RISK_OFFICER: {
    label: 'Risk officers',
    icon: ShieldCheck,
    description: 'Monitor credit, liquidity, market, operational, and business-risk surfaces with contribution analytics.',
  },
  PORTAL_USER: {
    label: 'Digital customers',
    icon: Smartphone,
    description: 'Access portal banking, payments, card controls, notifications, requests, and self-service account journeys.',
  },
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatRole(role?: string) {
  if (!role) return 'Assigned teams';
  return roleDescriptions[role]?.label ?? role.replace(/_/g, ' ');
}

function getCapabilities(item: NavItem) {
  if (item.children && item.children.length > 0) {
    return item.children.map((child) => child.label);
  }
  return [item.label];
}

function hasRole(item: NavItem, role: string) {
  if (!item.roles || item.roles.length === 0 || item.roles.includes('*')) {
    return true;
  }
  return item.roles.includes(role);
}

function HeroModuleBadge({
  icon: Icon,
  title,
  value,
  className,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('landing-mini-panel', className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/90">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">{title}</p>
        <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function CapabilityModuleCard({
  module,
  tone,
}: {
  module: ModuleWithMeta;
  tone: SectionTone;
}) {
  const Icon = module.icon ?? Sparkles;
  const capabilities = getCapabilities(module);

  return (
    <article className={cn('landing-module-card', tone.accentBorder)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn('landing-module-icon', tone.accentIcon)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">{module.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              {formatRole(module.roles?.[0])}
            </p>
          </div>
        </div>
        <span className={cn('landing-pill whitespace-nowrap', tone.accentBadge)}>
          {module.capabilityCount} capabilities
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {capabilities.map((capability) => (
          <span key={capability} className={cn('landing-chip', tone.accentChip)}>
            {capability}
          </span>
        ))}
      </div>
    </article>
  );
}

function PortalModuleCard({ module }: { module: PortalModule }) {
  const Icon = module.icon;
  return (
    <article className="landing-module-card border-emerald-400/20">
      <div className="flex items-start gap-3">
        <div className="landing-module-icon border-emerald-300/25 bg-emerald-400/10 text-emerald-100">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">{module.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{module.description}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {module.capabilities.map((capability) => (
          <span key={capability} className="landing-chip border-emerald-300/18 bg-emerald-400/10 text-emerald-50">
            {capability}
          </span>
        ))}
      </div>
    </article>
  );
}

export function DigiCoreLandingPage() {
  useEffect(() => {
    document.title = 'DigiCore CBS | Core Banking Platform';
  }, []);

  const internalSections = useMemo(() => navigationItems.filter((section) => section.title !== 'MAIN'), []);

  const modules = useMemo<ModuleWithMeta[]>(
    () =>
      internalSections.flatMap((section) =>
        section.items.map((item) => ({
          ...item,
          sectionTitle: section.title,
          sectionId: slugify(section.title),
          capabilityCount: getCapabilities(item).length,
        })),
      ),
    [internalSections],
  );

  const totalCapabilities = useMemo(
    () =>
      modules.reduce((sum, module) => sum + module.capabilityCount, 0) +
      portalModules.reduce((sum, module) => sum + module.capabilities.length, 0),
    [modules],
  );

  const totalRoutes = useMemo(() => {
    const routeSet = new Set<string>();
    internalSections.forEach((section) => {
      section.items.forEach((item) => {
        routeSet.add(item.path);
        item.children?.forEach((child) => routeSet.add(child.path));
      });
    });
    portalModules.forEach((module) => module.capabilities.forEach((capability) => routeSet.add(capability)));
    return routeSet.size;
  }, [internalSections]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    modules.forEach((module) => {
      module.roles?.forEach((role) => {
        if (role !== '*') roles.add(role);
      });
    });
    roles.add('PORTAL_USER');
    return Array.from(roles);
  }, [modules]);

  const roleCoverage = useMemo(
    () =>
      uniqueRoles
        .filter((role) => roleDescriptions[role])
        .map((role) => {
          const matchingModules = modules.filter((module) => hasRole(module, role));
          const capabilityCount = matchingModules.reduce((sum, module) => sum + module.capabilityCount, 0);
          const portalCapabilityCount =
            role === 'PORTAL_USER'
              ? portalModules.reduce((sum, module) => sum + module.capabilities.length, 0)
              : 0;
          return {
            role,
            moduleCount: matchingModules.length + (role === 'PORTAL_USER' ? portalModules.length : 0),
            capabilityCount: capabilityCount + portalCapabilityCount,
          };
        }),
    [modules, uniqueRoles],
  );

  const featuredSections = useMemo(
    () =>
      internalSections.map((section) => ({
        title: section.title,
        sectionId: slugify(section.title),
        moduleCount: section.items.length,
        capabilityCount: section.items.reduce((sum, item) => sum + getCapabilities(item).length, 0),
        tone: sectionToneMap[section.title],
      })),
    [internalSections],
  );

  return (
    <div className="landing-stage">
      <header className="landing-nav">
        <div className="landing-shell flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="landing-brand-mark">DC</div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/78">DigiCore CBS</p>
              <p className="text-xs text-slate-400">Unified core banking operating fabric</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {[
              ['Platform', '#platform'],
              ['Atlas', '#capability-atlas'],
              ['Portal', '#digital-portal'],
              ['Security', '#trust-layer'],
            ].map(([label, href]) => (
              <a key={label} href={href} className="landing-nav-link">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost hidden sm:inline-flex">
              Secure sign-in
            </Link>
            <a href="#capability-atlas" className="btn-primary">
              Explore the platform
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="landing-shell pb-20 pt-10 sm:pt-14 lg:pt-18">
        <section className="grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,620px)] xl:items-stretch">
          <div className="space-y-8">
            <div className="space-y-5">
              <span className="landing-kicker">Public Product Front Door</span>
              <div className="space-y-5">
                <h1 className="max-w-5xl text-5xl font-semibold leading-[0.92] tracking-tight text-white sm:text-6xl xl:text-7xl">
                  The operating system for modern core banking, treasury, compliance, intelligence, and self-service.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                  DigiCore CBS unifies customer onboarding, deposits, lending, payments, cards, trade finance,
                  treasury, capital markets, operations, open banking, analytics, and digital self-service into one
                  enterprise-grade banking platform.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="landing-stat-card">
                <p className="landing-stat-value">{featuredSections.length + 1}</p>
                <p className="landing-stat-label">Domain families</p>
              </div>
              <div className="landing-stat-card">
                <p className="landing-stat-value">{modules.length + portalModules.length}</p>
                <p className="landing-stat-label">Workspaces</p>
              </div>
              <div className="landing-stat-card">
                <p className="landing-stat-value">{totalCapabilities}</p>
                <p className="landing-stat-label">Named capabilities</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {platformHighlights.map(({ icon: Icon, title, description }) => (
                <article key={title} className="landing-panel p-5">
                  <div className="flex items-start gap-4">
                    <div className="landing-module-icon border-white/10 bg-white/6 text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">{title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/login" className="btn-primary">
                Launch secure workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#platform" className="btn-secondary">
                See platform coverage
              </a>
              <div className="landing-inline-proof">
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                <span>{totalRoutes}+ routed surfaces mapped from the live product shell</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-visual">
            <img
              src={coreBankingLoginPhoto}
              alt=""
              aria-hidden="true"
              className="landing-photo"
            />
            <div className="landing-hero-gradient" aria-hidden="true" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-2">
                <HeroModuleBadge icon={Landmark} title="Retail + Corporate" value="Customers, accounts, lending, deposits" />
                <HeroModuleBadge icon={ArrowLeftRight} title="Payments rail" value="Transfers, disputes, compliance, orchestration" />
                <HeroModuleBadge icon={Briefcase} title="Markets fabric" value="Treasury, capital markets, custody, ALM" />
                <HeroModuleBadge icon={BrainCircuit} title="Embedded intelligence" value="Document AI, behaviour, forecasting, BI" />
              </div>

              <div className="landing-showcase-frame">
                <img
                  src={coreBankingHero}
                  alt="Illustrated product board showing ledger, payment, market, and operational surfaces"
                  className="landing-hero-illustration"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {featuredSections.slice(0, 3).map((section) => (
                  <a
                    key={section.title}
                    href={`#${section.sectionId}`}
                    className={cn('landing-mini-nav', section.tone.accentBorder)}
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{section.tone.eyebrow}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{section.title}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/60" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="mt-20 space-y-8">
          <div className="max-w-4xl space-y-4">
            <span className="landing-kicker">Platform Coverage</span>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Every major banking domain, stitched into one platform surface.
            </h2>
            <p className="text-base leading-8 text-slate-300">
              The sections below come from the live product navigation and portal journeys. This landing page is not
              a concept board; it is a public map of the real DigiCore CBS capability footprint.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {featuredSections.map((section) => (
              <article
                key={section.title}
                className={cn('landing-panel p-6', section.tone.accentBorder)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={cn('landing-pill', section.tone.accentBadge)}>{section.tone.eyebrow}</span>
                  <span className="text-sm font-semibold text-white/78">{section.moduleCount} workspaces</span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-white">{section.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{section.tone.description}</p>

                <div className="mt-6 flex items-center gap-6">
                  <div>
                    <p className="landing-stat-label">Capabilities</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{section.capabilityCount}</p>
                  </div>
                  <a href={`#${section.sectionId}`} className="landing-inline-link">
                    Open section
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="capability-atlas" className="mt-20 space-y-8">
          <div className="max-w-4xl space-y-4">
            <span className="landing-kicker">Capability Atlas</span>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              A capability-by-capability view of the DigiCore CBS operating estate.
            </h2>
            <p className="text-base leading-8 text-slate-300">
              Every module card below enumerates the named journeys currently surfaced in the product shell. This is
              how DigiCore spans front-office, middle-office, back-office, treasury, and customer self-service.
            </p>
          </div>

          <div className="space-y-8">
            {internalSections.map((section) => {
              const tone = sectionToneMap[section.title];
              const sectionModules = modules.filter((module) => module.sectionTitle === section.title);
              const sectionCapabilityCount = sectionModules.reduce((sum, module) => sum + module.capabilityCount, 0);
              return (
                <section
                  key={section.title}
                  id={slugify(section.title)}
                  className={cn('landing-section-card', tone.accentBorder)}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-4xl">
                      <span className={cn('landing-pill', tone.accentBadge)}>{tone.eyebrow}</span>
                      <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">{section.title}</h3>
                      <p className="mt-3 text-base leading-8 text-slate-300">{tone.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:w-auto">
                      <div className="landing-stat-card min-w-[140px]">
                        <p className="landing-stat-value">{section.items.length}</p>
                        <p className="landing-stat-label">Workspaces</p>
                      </div>
                      <div className="landing-stat-card min-w-[140px]">
                        <p className="landing-stat-value">{sectionCapabilityCount}</p>
                        <p className="landing-stat-label">Capabilities</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 xl:grid-cols-2">
                    {sectionModules.map((module) => (
                      <CapabilityModuleCard key={`${module.sectionTitle}-${module.label}`} module={module} tone={tone} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section id="digital-portal" className="mt-20 space-y-8">
          <div className="max-w-4xl space-y-4">
            <span className="landing-kicker">Digital Self-Service</span>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Customer-facing banking journeys sit beside the internal banking core.
            </h2>
            <p className="text-base leading-8 text-slate-300">
              DigiCore is not only an operator workstation. It also ships a real customer portal for accounts,
              payments, cards, notifications, requests, and profile management.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {portalModules.map((module) => (
              <PortalModuleCard key={module.title} module={module} />
            ))}
          </div>
        </section>

        <section id="trust-layer" className="mt-20 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <div className="landing-panel p-7">
            <span className="landing-kicker">Security, Control, and Ecosystem</span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              A banking platform built for control planes, not demo shells.
            </h2>
            <div className="mt-8 grid gap-4">
              {trustPillars.map(({ icon: Icon, title, description }) => (
                <article key={title} className="landing-trust-row">
                  <div className="landing-module-icon border-white/10 bg-white/6 text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="landing-panel p-7">
            <span className="landing-kicker">Role Coverage</span>
            <div className="mt-5 space-y-4">
              {roleCoverage.map(({ role, moduleCount, capabilityCount }) => {
                const meta = roleDescriptions[role];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <article key={role} className="landing-role-card">
                    <div className="flex items-start gap-3">
                      <div className="landing-module-icon border-white/10 bg-white/6 text-white">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/78">{meta.label}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{meta.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-5 text-sm text-white/78">
                      <span>{moduleCount} workspaces</span>
                      <span>{capabilityCount} capabilities</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="landing-cta-panel">
            <div className="max-w-4xl space-y-4">
              <span className="landing-kicker">DigiCore CBS</span>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                From branch core to open banking ecosystem, DigiCore is ready to operate the whole bank.
              </h2>
              <p className="text-base leading-8 text-slate-300">
                Explore the secure workspace for operations, treasury, compliance, risk, wealth, capital markets,
                and customer-facing digital banking on one platform fabric.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/login" className="btn-primary">
                Enter secure sign-in
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#capability-atlas" className="btn-secondary">
                Review the capability atlas
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
