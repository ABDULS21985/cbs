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
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground px-6 pt-4 pb-1">
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
