import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const labelOverrides: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  accounts: 'Accounts',
  lending: 'Lending',
  payments: 'Payments',
  cards: 'Cards',
  treasury: 'Treasury',
  risk: 'Risk',
  compliance: 'Compliance',
  operations: 'Operations',
  reports: 'Reports',
  admin: 'Administration',
  onboarding: 'Onboarding',
  kyc: 'KYC Management',
  'fixed-deposits': 'Fixed Deposits',
  goals: 'Savings Goals',
  applications: 'Applications',
  active: 'Active',
  facilities: 'Credit Facilities',
  collections: 'Collections',
  ecl: 'ECL Dashboard',
  eod: 'End of Day',
  gl: 'General Ledger',
  branches: 'Branches',
  approvals: 'Approvals',
  users: 'Users & Roles',
  parameters: 'Parameters',
  products: 'Products',
  fees: 'Fees & Charges',
  aml: 'AML Alerts',
  fraud: 'Fraud Alerts',
  sanctions: 'Sanctions',
  open: 'Open Account',
  new: 'New Transfer',
  'recurring-deposits': 'Recurring Deposits',
  escrow: 'Escrow & Trust',
  'virtual-accounts': 'Virtual Accounts',
  'cash-pooling': 'Cash Pooling',
  'notional-pooling': 'Notional Pooling',
  wallets: 'Wallets',
  statements: 'Statements',
  reconciliation: 'Reconciliation',
  regulatory: 'Regulatory Reports',
  maintenance: 'Maintenance',
  merchants: 'Merchants',
  pos: 'POS Terminals',
  clearing: 'Clearing & Settlement',
  disputes: 'Disputes',
  transactions: 'Transactions',
  'contact-center': 'Contact Center',
  dspm: 'Data Security',
  scans: 'Scans',
  policies: 'Policies',
  exceptions: 'Exceptions',
  identities: 'Identities',
  queues: 'Queue Dashboard',
  callbacks: 'Callbacks',
  ivr: 'IVR Manager',
  help: 'Knowledge Base',
  chat: 'Chat Sessions',
  'market-data': 'Market Data',
  'market-making': 'Market Making',
  wealth: 'Wealth Management',
  analytics: 'Analytics',
  advisors: 'Advisors',
  trusts: 'Trust Management',
  'trading-desk': 'Trading Desk',
  'fixed-income': 'Fixed Income',
  'trade-ops': 'Trade Operations',
  orders: 'Order Management',
  'capital-markets': 'Capital Markets',
  fx: 'FX Rates',
  switch: 'Switch Dashboard',
  prices: 'Prices & Signals',
  research: 'Research',
  analysis: 'Analysis',
  'market-risk': 'Market Risk',
  instruments: 'Financial Instruments',
  competitors: 'Competitor Intelligence',
  'financial-statements': 'Financial Statements',
};

function toLabel(segment: string): string {
  if (labelOverrides[segment]) return labelOverrides[segment];
  if (segment.startsWith('CUS-') || segment.startsWith('ACC-') || segment.startsWith('LN-')) return segment;
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="mx-6 mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[linear-gradient(180deg,hsl(var(--card)/0.88),hsl(var(--card)/0.62))] px-4 py-2 text-sm text-muted-foreground shadow-[0_18px_45px_rgba(2,6,23,0.24),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      <Link to="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {segments.map((segment, idx) => {
        const path = '/' + segments.slice(0, idx + 1).join('/');
        const isLast = idx === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            {isLast ? (
              <span className={cn('font-medium text-foreground')}>{toLabel(segment)}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">
                {toLabel(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
