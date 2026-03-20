import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Code2,
  BookOpen,
  Download,
  Globe,
  Terminal,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Package,
  Key,
  FileCode,
  Github,
  MessageSquare,
  Lightbulb,
  Boxes,
} from 'lucide-react';
import { useApiProducts } from '../hooks/useMarketplace';

// ─── Static Data ─────────────────────────────────────────────────────────────

const SDKS = [
  { name: 'JavaScript / TypeScript', icon: '🟨', version: '2.4.1', downloads: '12.3k', badge: 'Stable' },
  { name: 'Python', icon: '🐍', version: '1.9.0', downloads: '8.7k', badge: 'Stable' },
  { name: 'Java / Kotlin', icon: '☕', version: '3.1.2', downloads: '6.1k', badge: 'Stable' },
  { name: 'Go', icon: '🐹', version: '1.2.0', downloads: '3.4k', badge: 'Beta' },
  { name: 'PHP', icon: '🐘', version: '1.5.3', downloads: '4.2k', badge: 'Stable' },
  { name: 'Ruby', icon: '💎', version: '0.8.0', downloads: '1.8k', badge: 'Preview' },
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

  'Get Accounts': `curl -X GET https://api.cbsbank.com/api/v1/openbanking/accounts \\
  -H "Authorization: Bearer {access_token}" \\
  -H "x-fapi-interaction-id: $(uuidgen)"`,

  'Initiate Payment': `curl -X POST https://api.cbsbank.com/api/v1/openbanking/payments \\
  -H "Authorization: Bearer {access_token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "creditorAccount": { "iban": "GB29NWBK60161331926819" },
    "instructedAmount": { "amount": "100.00", "currency": "GBP" },
    "reference": "Payment ref 001"
  }'`,
};

const RESOURCES = [
  { icon: BookOpen, title: 'API Reference', desc: 'Full endpoint documentation with schemas and examples', href: '#', badge: 'v2.4' },
  { icon: Shield, title: 'Security Guide', desc: 'OAuth2 flows, SCA requirements, and certificate management', href: '#' },
  { icon: FileCode, title: 'OpenAPI Spec', desc: 'Download the OpenAPI 3.1 specification for all products', href: '#', badge: 'JSON / YAML' },
  { icon: MessageSquare, title: 'Community Forum', desc: 'Ask questions and share solutions with other developers', href: '#' },
  { icon: Github, title: 'Sample Apps', desc: 'Reference implementations and demo applications on GitHub', href: '#' },
  { icon: Lightbulb, title: 'Changelog', desc: 'Track API changes, deprecations and new feature announcements', href: '#' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
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
  const [tab, setTab] = useState('quickstart');
  const [activeSnippet, setActiveSnippet] = useState('Token Request');

  const { data: products = [] } = useApiProducts();
  const publishedProducts = products.filter(p => p.status === 'PUBLISHED');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer Portal"
        description="Everything you need to integrate with our Open Banking APIs"
        actions={
          <Button size="sm" onClick={() => navigate('/open-banking/marketplace')}>
            <Package className="mr-1.5 h-4 w-4" /> Browse APIs
          </Button>
        }
      />

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Boxes, label: 'Published APIs', value: publishedProducts.length.toString() },
          { icon: Package, label: 'SDK Languages', value: '6' },
          { icon: Code2, label: 'API Endpoints', value: products.reduce((s, p) => s + p.endpointCount, 0).toString() },
          { icon: Zap, label: 'Avg SLA Uptime', value: products.length ? `${(products.reduce((s, p) => s + p.slaUptimePct, 0) / products.length).toFixed(1)}%` : '—' },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="h-7 w-7 text-primary/70" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
          <TabsTrigger value="sdks">SDKs</TabsTrigger>
          <TabsTrigger value="examples">Code Examples</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
        </TabsList>

        {/* ── Quick Start ─────────────────────────────────────────────────── */}
        <TabsContent value="quickstart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Get Started in 5 Steps</CardTitle>
              <CardDescription>
                Follow this guide to make your first Open Banking API call in under 30 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
              <Separator className="my-6" />
              <div className="flex gap-3">
                <Button onClick={() => navigate('/open-banking')}>
                  <ArrowRight className="mr-1.5 h-4 w-4" /> Register TPP Client
                </Button>
                <Button variant="outline" onClick={() => setTab('examples')}>
                  View Code Examples
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Available APIs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Available APIs</CardTitle>
            </CardHeader>
            <CardContent>
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
                        <Badge variant="outline" className="text-xs shrink-0">v{p.version}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SDKs ────────────────────────────────────────────────────────── */}
        <TabsContent value="sdks">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SDKS.map(sdk => (
              <Card key={sdk.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{sdk.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{sdk.name}</p>
                        <Badge
                          variant={sdk.badge === 'Stable' ? 'default' : sdk.badge === 'Beta' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {sdk.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        v{sdk.version} · {sdk.downloads} downloads
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs">
                      <Download className="mr-1 h-3.5 w-3.5" /> Download
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-xs">
                      <Github className="mr-1 h-3.5 w-3.5" /> GitHub
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Install via Package Manager</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Code Examples ───────────────────────────────────────────────── */}
        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">cURL Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap mb-4">
                {Object.keys(CODE_SNIPPETS).map(k => (
                  <button
                    key={k}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      activeSnippet === k
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted border-border'
                    }`}
                    onClick={() => setActiveSnippet(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <CodeBlock code={CODE_SNIPPETS[activeSnippet] ?? ''} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">JavaScript SDK</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`import { OpenBankingClient } from '@cbsbank/openbanking-sdk';

const client = new OpenBankingClient({
  clientId: process.env.CBS_CLIENT_ID,
  clientSecret: process.env.CBS_CLIENT_SECRET,
  scopes: ['accounts:read', 'payments:write'],
});

// Get all accounts
const accounts = await client.accounts.list();

// Initiate a payment
const payment = await client.payments.create({
  creditorAccount: { iban: 'GB29NWBK60161331926819' },
  amount: { value: 100.00, currency: 'GBP' },
  reference: 'Invoice INV-001',
});`} language="typescript" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Resources ───────────────────────────────────────────────────── */}
        <TabsContent value="resources">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RESOURCES.map(({ icon: Icon, title, desc, href, badge }) => (
              <Card key={title} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{title}</p>
                        {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Sandbox ─────────────────────────────────────────────────────── */}
        <TabsContent value="sandbox">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Sandbox Environment
              </CardTitle>
              <CardDescription>
                Test your integrations safely without affecting production data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: 'Base URL', value: 'https://sandbox.cbsbank.com/api/v1', mono: true },
                  { label: 'Environment', value: 'Sandbox (isolated)' },
                  { label: 'Data Reset', value: 'Daily at 00:00 UTC' },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-sm font-medium mt-0.5 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
                  </div>
                ))}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Sandbox Credentials</p>
                <div className="space-y-2">
                  {[
                    { label: 'Client ID', value: 'sandbox_client_demo_001' },
                    { label: 'Client Secret', value: 'sandbox_secret_••••••••••••' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between p-2 rounded border bg-card">
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

              <Button onClick={() => navigate('/open-banking')}>
                <Key className="mr-1.5 h-4 w-4" /> Register Sandbox Client
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
