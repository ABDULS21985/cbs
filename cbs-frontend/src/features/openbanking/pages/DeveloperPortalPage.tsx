import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared/TabsPage';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BookOpen,
  Boxes,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  Github,
  Key,
  Lightbulb,
  MessageSquare,
  Package,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';
import { useApiProducts } from '../hooks/useMarketplace';

// ─── Static Data ─────────────────────────────────────────────────────────────

const SDKS = [
  { name: 'JavaScript / TypeScript', icon: '🟨', version: '2.4.1', downloads: '12.3k', badge: 'Stable', badgeColor: 'bg-green-100 text-green-700' },
  { name: 'Python', icon: '🐍', version: '1.9.0', downloads: '8.7k', badge: 'Stable', badgeColor: 'bg-green-100 text-green-700' },
  { name: 'Java / Kotlin', icon: '☕', version: '3.1.2', downloads: '6.1k', badge: 'Stable', badgeColor: 'bg-green-100 text-green-700' },
  { name: 'Go', icon: '🐹', version: '1.2.0', downloads: '3.4k', badge: 'Beta', badgeColor: 'bg-amber-100 text-amber-700' },
  { name: 'PHP', icon: '🐘', version: '1.5.3', downloads: '4.2k', badge: 'Stable', badgeColor: 'bg-green-100 text-green-700' },
  { name: 'Ruby', icon: '💎', version: '0.8.0', downloads: '1.8k', badge: 'Preview', badgeColor: 'bg-blue-100 text-blue-700' },
];

const QUICK_START_STEPS = [
  { step: 1, title: 'Register a TPP Client', desc: 'Create your application in the Open Banking dashboard and obtain your Client ID and Secret.' },
  { step: 2, title: 'Configure OAuth2 Scopes', desc: 'Select the data access scopes your application needs (AISP, PISP, or both).' },
  { step: 3, title: 'Implement Strong Customer Authentication', desc: 'Integrate our SCA flow to authorise customer consent via biometrics or OTP.' },
  { step: 4, title: 'Subscribe to APIs', desc: 'Subscribe to the API products you need from the Marketplace.' },
  { step: 5, title: 'Make Your First API Call', desc: 'Use the access token to call the Account Information or Payment Initiation APIs.' },
];

const CODE_SNIPPETS: Record<string, string> = {
  'Token Request': `curl -X POST https://api.cbsbank.com/oauth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET" \\
  -d "scope=accounts:read payments:write"`,

  'Get Accounts': `curl -X GET https://api.cbsbank.com/api/v1/openbanking/clients \\
  -H "Authorization: Bearer {access_token}" \\
  -H "x-fapi-interaction-id: $(uuidgen)"`,

  'Initiate Payment': `curl -X POST https://api.cbsbank.com/api/v1/openbanking/consents \\
  -H "Authorization: Bearer {access_token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tppClientId": 1,
    "customerId": 10001,
    "scopes": ["accounts", "transactions"],
    "expiresAt": "2026-06-20T00:00:00Z"
  }'`,
};

const RESOURCES = [
  { icon: BookOpen, title: 'API Reference', desc: 'Full endpoint documentation with schemas and examples', badge: 'v2.4' },
  { icon: Shield, title: 'Security Guide', desc: 'OAuth2 flows, SCA requirements, and certificate management' },
  { icon: FileCode, title: 'OpenAPI Spec', desc: 'Download the OpenAPI 3.1 specification for all products', badge: 'JSON / YAML' },
  { icon: MessageSquare, title: 'Community Forum', desc: 'Ask questions and share solutions with other developers' },
  { icon: Github, title: 'Sample Apps', desc: 'Reference implementations and example applications on GitHub' },
  { icon: Lightbulb, title: 'Changelog', desc: 'Track API changes, deprecations and new feature announcements' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  function copy() {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  }
  return (
    <div className="relative group">
      <pre className="bg-zinc-950 text-zinc-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded"
        onClick={copy}
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5 text-zinc-300" />
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function DeveloperPortalPage() {
  const navigate = useNavigate();
  const [activeSnippet, setActiveSnippet] = useState('Token Request');

  const { data: products = [] } = useApiProducts();
  const publishedProducts = products.filter(p => p.status === 'PUBLISHED');
  const totalEndpoints = products.reduce((s, p) => s + p.endpointCount, 0);
  const avgUptime = products.length
    ? (products.reduce((s, p) => s + p.slaUptimePct, 0) / products.length).toFixed(1)
    : '—';

  const tabs = [
    {
      id: 'quickstart',
      label: 'Quick Start',
      icon: Zap,
      content: (
        <div className="p-6 space-y-6">
          {/* Steps */}
          <div className="surface-card p-6">
            <h3 className="text-base font-semibold mb-2">Get Started in 5 Steps</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Follow this guide to make your first Open Banking API call in under 30 minutes.
            </p>
            <div className="space-y-4">
              {QUICK_START_STEPS.map(({ step, title, desc }) => (
                <div key={step} className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t flex gap-3">
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
                onClick={() => navigate('/open-banking')}
              >
                Register TPP Client
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border bg-background text-sm hover:bg-muted transition-colors"
                onClick={() => navigate('/open-banking/marketplace')}
              >
                Browse APIs
              </button>
            </div>
          </div>

          {/* Available APIs */}
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-4">Available APIs</h3>
            {publishedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No published APIs yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {publishedProducts.map(p => (
                  <button
                    key={p.id}
                    className="text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/open-banking/marketplace/${p.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded border text-xs shrink-0">v{p.version}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'sdks',
      label: 'SDKs',
      icon: Package,
      content: (
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SDKS.map(sdk => (
              <div key={sdk.name} className="surface-card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{sdk.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{sdk.name}</p>
                      <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', sdk.badgeColor)}>
                        {sdk.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      v{sdk.version} · {sdk.downloads} downloads
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-xs hover:bg-muted transition-colors">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-xs hover:bg-muted transition-colors">
                    <Github className="h-3.5 w-3.5" /> GitHub
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="surface-card p-4 space-y-4">
            <h3 className="text-sm font-semibold">Install via Package Manager</h3>
            <div>
              <p className="text-xs text-muted-foreground mb-1">npm</p>
              <CodeBlock code="npm install @cbsbank/openbanking-sdk" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">pip</p>
              <CodeBlock code="pip install cbsbank-openbanking" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Maven</p>
              <CodeBlock code={`<dependency>
  <groupId>com.cbsbank</groupId>
  <artifactId>openbanking-sdk</artifactId>
  <version>3.1.2</version>
</dependency>`} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'examples',
      label: 'Code Examples',
      icon: Code2,
      content: (
        <div className="p-6 space-y-6">
          <div className="surface-card p-4 space-y-4">
            <h3 className="text-sm font-semibold">cURL Examples</h3>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(CODE_SNIPPETS).map(k => (
                <button
                  key={k}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs border transition-colors',
                    activeSnippet === k
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted border-border',
                  )}
                  onClick={() => setActiveSnippet(k)}
                >
                  {k}
                </button>
              ))}
            </div>
            <CodeBlock code={CODE_SNIPPETS[activeSnippet] ?? ''} />
          </div>

          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-4">JavaScript SDK</h3>
            <CodeBlock code={`import { OpenBankingClient } from '@cbsbank/openbanking-sdk';

const client = new OpenBankingClient({
  clientId: process.env.CBS_CLIENT_ID,
  clientSecret: process.env.CBS_CLIENT_SECRET,
  scopes: ['accounts:read', 'payments:write'],
});

// Get all TPP clients
const tppClients = await client.tpp.list();

// Create a consent
const consent = await client.consents.create({
  tppClientId: 1,
  customerId: 10001,
  scopes: ['accounts', 'transactions'],
  expiresAt: '2026-06-20T00:00:00Z',
});`} />
          </div>
        </div>
      ),
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: BookOpen,
      content: (
        <div className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RESOURCES.map(({ icon: Icon, title, desc, badge }) => (
              <div
                key={title}
                className="surface-card p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{title}</p>
                      {badge && (
                        <span className="px-1.5 py-0.5 rounded border text-xs">{badge}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'sandbox',
      label: 'Sandbox',
      icon: Terminal,
      content: (
        <div className="p-6">
          <div className="surface-card p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Sandbox Environment
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Test your integrations safely without affecting production data.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Base URL', value: 'https://sandbox.cbsbank.com/api/v1', mono: true },
                { label: 'Environment', value: 'Sandbox (isolated)' },
                { label: 'Data Reset', value: 'Daily at 00:00 UTC' },
              ].map(({ label, value, mono }) => (
                <div key={label} className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn('text-sm font-medium mt-0.5', mono && 'font-mono text-xs')}>{value}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Sandbox Credentials</p>
              <div className="space-y-2">
                {[
                  { label: 'Client ID', value: 'sandbox_client_ref_001' },
                  { label: 'Client Secret', value: 'sandbox_secret_••••••••••••' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between p-2.5 rounded border bg-muted/30">
                    <span className="text-xs text-muted-foreground w-28">{label}</span>
                    <code className="text-xs font-mono flex-1">{value}</code>
                    <button
                      className="text-muted-foreground hover:text-foreground ml-2"
                      onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied'); }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <div className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Ready to test</p>
                  <p className="text-xs text-blue-600/80 mt-0.5">
                    The sandbox includes pre-populated test accounts, customers, and transaction history.
                    All payment operations are simulated and no real funds are moved.
                  </p>
                </div>
              </div>
            </div>

            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
              onClick={() => navigate('/open-banking')}
            >
              <Key className="h-4 w-4" /> Register Sandbox Client
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-0">
      <PageHeader
        title="Developer Portal"
        subtitle="Everything you need to integrate with our Open Banking APIs"
        actions={
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
            onClick={() => navigate('/open-banking/marketplace')}
          >
            <Package className="h-4 w-4" /> Browse APIs
          </button>
        }
      />

      {/* Hero Stats */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Boxes, label: 'Published APIs', value: publishedProducts.length.toString() },
            { icon: Package, label: 'SDK Languages', value: '6' },
            { icon: Code2, label: 'API Endpoints', value: totalEndpoints.toString() },
            { icon: Zap, label: 'Avg SLA Uptime', value: `${avgUptime}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="surface-card p-4 flex items-center gap-3">
              <Icon className="h-7 w-7 text-primary/70" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t">
        <TabsPage tabs={tabs} />
      </div>
    </div>
  );
}
