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
