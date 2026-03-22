import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Zap, GitBranch, Globe, Store, Activity, Server, Key, Shield, FileCode,
  Radio, Database, ArrowRight, CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { gatewayApi } from '../api/gatewayApi';
import {
  useIntegrationRoutes, useDlqCount, useActionRequiredMessages,
  usePublishedProducts, useEventSubscriptions, useDataLakeJobs,
} from '../hooks/useGatewayData';

// ── Status Banner ───────────────────────────────────────────────────────────

function SystemHealthBanner() {
  const { data: routes = [] } = useIntegrationRoutes();
  const { data: dlqCount } = useDlqCount();
  const { data: actionRequired } = useActionRequiredMessages();

  const issues: { message: string; path: string; severity: 'warning' | 'error' }[] = [];

  const downRoutes = Array.isArray(routes) ? routes.filter((r) => (r as unknown as Record<string, unknown>).status === 'DOWN' || (r as unknown as Record<string, unknown>).status === 'ERROR').length : 0;
  if (downRoutes > 0) issues.push({ message: `${downRoutes} integration route(s) down`, path: '/operations/gateway/integration', severity: 'error' });

  const dlq = typeof dlqCount === 'number' ? dlqCount : (dlqCount as Record<string, unknown>)?.count as number ?? 0;
  if (dlq > 0) issues.push({ message: `${dlq} messages in dead letter queue`, path: '/operations/gateway/integration', severity: 'warning' });

  const actionCount = Array.isArray(actionRequired) ? actionRequired.length : 0;
  if (actionCount > 0) issues.push({ message: `${actionCount} messages requiring action`, path: '/operations/gateway/console', severity: 'warning' });

  const navigate = useNavigate();

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900/40 px-5 py-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-green-700 dark:text-green-400">All systems operational</span>
      </div>
    );
  }

  const hasErrors = issues.some(i => i.severity === 'error');
  return (
    <div className={cn('rounded-lg border px-5 py-4 space-y-2',
      hasErrors ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40')}>
      <div className="flex items-center gap-2">
        <AlertTriangle className={cn('w-5 h-5', hasErrors ? 'text-red-600' : 'text-amber-600')} />
        <span className={cn('text-sm font-semibold', hasErrors ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400')}>
          {issues.length} issue{issues.length > 1 ? 's' : ''} detected
        </span>
      </div>
      {issues.map((iss, i) => (
        <button key={i} onClick={() => navigate(iss.path)} className="flex items-center gap-2 text-sm hover:underline">
          {iss.severity === 'error' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          <span className={iss.severity === 'error' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}>{iss.message}</span>
        </button>
      ))}
    </div>
  );
}

// ── Executive Summary Card ──────────────────────────────────────────────────

function SummaryCard({ icon: Icon, title, metrics, linkLabel, linkPath, color }: {
  icon: React.ElementType; title: string; metrics: { label: string; value: string | number; red?: boolean }[];
  linkLabel: string; linkPath: string; color: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="bg-card rounded-xl border p-5 space-y-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg', color)}><Icon className="w-5 h-5" /></div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="space-y-2">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{m.label}</span>
            <span className={cn('font-semibold font-mono', m.red ? 'text-red-600' : '')}>{m.value}</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate(linkPath)} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
        {linkLabel} <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Quick Nav Card ──────────────────────────────────────────────────────────

function NavCard({ icon: Icon, title, description, path, badge }: {
  icon: React.ElementType; title: string; description: string; path: string; badge?: number;
}) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(path)} className="text-left bg-card rounded-lg border p-5 hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-muted"><Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" /></div>
        {badge !== undefined && badge > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{badge}</span>
        )}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function GatewayHubPage() {
  useEffect(() => { document.title = 'Gateway & Integration | CBS'; }, []);

  const { data: stats } = useQuery({ queryKey: ['gateway', 'live-stats'], queryFn: () => gatewayApi.getLiveStats(), staleTime: 15_000 });
  const { data: routes = [] } = useIntegrationRoutes();
  const { data: products = [] } = usePublishedProducts();
  const { data: subscriptions = [] } = useEventSubscriptions();
  const { data: dlJobs = [] } = useDataLakeJobs();

  const s = stats as Record<string, unknown> | undefined;
  const routeList = Array.isArray(routes) ? routes : [];
  const productList = Array.isArray(products) ? products : [];
  const subList = Array.isArray(subscriptions) ? subscriptions : [];
  const jobList = Array.isArray(dlJobs) ? dlJobs : [];

  return (
    <>
      <PageHeader title="Gateway & Integration Platform"
        subtitle={<span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-muted-foreground">Live</span></span>} />

      <div className="page-container space-y-6">
        <SystemHealthBanner />

        {/* Executive Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={Zap} title="Financial Gateway" color="text-blue-600 bg-blue-100 dark:bg-blue-900/30"
            metrics={[
              { label: 'Messages Today', value: (s?.messagesToday as number) ?? 0 },
              { label: 'Pending', value: (s?.pendingCount as number) ?? 0 },
              { label: 'Failed', value: (s?.failedCount as number) ?? 0, red: ((s?.failedCount as number) ?? 0) > 0 },
            ]}
            linkLabel="Open Console" linkPath="/operations/gateway/console" />

          <SummaryCard icon={GitBranch} title="Integration Hub" color="text-purple-600 bg-purple-100 dark:bg-purple-900/30"
            metrics={[
              { label: 'Active Routes', value: routeList.length },
              { label: 'Healthy', value: routeList.filter((r) => (r as unknown as Record<string, unknown>).status === 'ACTIVE' || (r as unknown as Record<string, unknown>).status === 'HEALTHY').length },
            ]}
            linkLabel="View Routes" linkPath="/operations/gateway/integration" />

          <SummaryCard icon={Globe} title="Open Banking" color="text-green-600 bg-green-100 dark:bg-green-900/30"
            metrics={[
              { label: 'API Products', value: productList.length },
              { label: 'Subscriptions', value: subList.length },
            ]}
            linkLabel="Manage APIs" linkPath="/operations/gateway/open-banking" />

          <SummaryCard icon={Store} title="API Marketplace" color="text-amber-600 bg-amber-100 dark:bg-amber-900/30"
            metrics={[
              { label: 'Published', value: productList.filter((p) => (p as unknown as Record<string, unknown>).status === 'PUBLISHED').length },
              { label: 'Active Subs', value: subList.filter((s) => (s as unknown as Record<string, unknown>).status === 'ACTIVE').length },
            ]}
            linkLabel="View Marketplace" linkPath="/operations/gateway/marketplace" />
        </div>

        {/* Quick Navigation */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <NavCard icon={Activity} title="Gateway Console" description="Real-time message monitoring, SWIFT processing, throughput analytics" path="/operations/gateway/console" />
            <NavCard icon={Server} title="Financial Gateways" description="Gateway health, connection monitoring, volume tracking" path="/operations/gateway/console" />
            <NavCard icon={GitBranch} title="Integration Hub" description="ESB routes, message routing, dead letter queue" path="/operations/gateway/integration" badge={routeList.length} />
            <NavCard icon={Key} title="Open Banking" description="API client registration, consent management, rate limiting" path="/operations/gateway/open-banking" />
            <NavCard icon={Shield} title="PSD2 Compliance" description="TPP registration, SCA sessions, eIDAS certificates" path="/operations/gateway/psd2" />
            <NavCard icon={FileCode} title="ISO 20022" description="ISO message processing, validation, SWIFT migration" path="/operations/gateway/iso20022" />
            <NavCard icon={Store} title="API Marketplace" description="API product catalog, subscriptions, usage analytics" path="/operations/gateway/marketplace" badge={productList.length} />
            <NavCard icon={Radio} title="Domain Events" description="Event publishing, subscriptions, outbox processing" path="/operations/gateway/events" badge={subList.length} />
            <NavCard icon={Database} title="Data Lake" description="Data export jobs, entity extraction, scheduled exports" path="/operations/gateway/data-lake" badge={jobList.length} />
          </div>
        </div>
      </div>
    </>
  );
}
