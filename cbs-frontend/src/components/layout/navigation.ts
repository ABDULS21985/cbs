import {
  LayoutDashboard, Users, Landmark, HandCoins, ArrowLeftRight, CreditCard,
  TrendingUp, ShieldAlert, Scale, Settings2, BarChart3, Shield,
  FileText, MessageSquare, Headphones,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  icon?: LucideIcon;
  path: string;
  roles?: string[];
  children?: NavItem[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigationItems: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['*'] },
    ],
  },
  {
    title: 'BANKING',
    items: [
      {
        label: 'Customers', icon: Users, path: '/customers', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'Search', path: '/customers' },
          { label: 'Onboarding', path: '/customers/onboarding' },
          { label: 'KYC Management', path: '/customers/kyc' },
          { label: 'Segments', path: '/customers/segments' },
        ],
      },
      {
        label: 'Accounts', icon: Landmark, path: '/accounts', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'All Accounts', path: '/accounts' },
          { label: 'Open Account', path: '/accounts/open' },
          { label: 'Fixed Deposits', path: '/accounts/fixed-deposits' },
          { label: 'Recurring Deposits', path: '/accounts/recurring-deposits' },
          { label: 'Savings Goals', path: '/accounts/goals' },
          { label: 'Virtual Accounts', path: '/accounts/virtual-accounts' },
          { label: 'Cash Pooling', path: '/accounts/cash-pooling' },
          { label: 'Notional Pooling', path: '/accounts/notional-pooling' },
          { label: 'Wallets', path: '/accounts/wallets' },
          { label: 'Statements', path: '/accounts/statements' },
          { label: 'Reconciliation', path: '/accounts/reconciliation' },
        ],
      },
      {
        label: 'Lending', icon: HandCoins, path: '/lending', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'Applications', path: '/lending/applications' },
          { label: 'Active Loans', path: '/lending/active' },
          { label: 'Credit Facilities', path: '/lending/facilities' },
          { label: 'Collections', path: '/lending/collections' },
          { label: 'ECL Dashboard', path: '/lending/ecl' },
        ],
      },
      {
        label: 'Payments', icon: ArrowLeftRight, path: '/payments', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'New Transfer', path: '/payments/new' },
          { label: 'History', path: '/payments/history' },
          { label: 'Standing Orders', path: '/payments/standing-orders' },
          { label: 'Bill Payments', path: '/payments/bills' },
          { label: 'Bulk Payments', path: '/payments/bulk' },
          { label: 'International', path: '/payments/international' },
        ],
      },
      {
        label: 'Cards', icon: CreditCard, path: '/cards', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'Card Management', path: '/cards' },
          { label: 'Transactions', path: '/cards/transactions' },
          { label: 'Disputes', path: '/cards/disputes' },
        ],
      },
    ],
  },
  {
    title: 'CUSTOMER SERVICE',
    items: [
      {
        label: 'Cases', icon: Headphones, path: '/cases', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'All Cases', path: '/cases' },
          { label: 'New Case', path: '/cases/new' },
        ],
      },
      {
        label: 'Agreements', icon: FileText, path: '/agreements', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
      },
      {
        label: 'Communications', icon: MessageSquare, path: '/communications', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'Center', path: '/communications' },
          { label: 'Templates', path: '/communications/templates' },
        ],
      },
    ],
  },
  {
    title: 'TREASURY',
    items: [
      {
        label: 'Treasury', icon: TrendingUp, path: '/treasury', roles: ['CBS_ADMIN', 'TREASURY'],
        children: [
          { label: 'Dashboard', path: '/treasury' },
          { label: 'Deals', path: '/treasury/deals' },
          { label: 'Positions', path: '/treasury/positions' },
          { label: 'FX Rates', path: '/treasury/fx' },
          { label: 'Investments', path: '/treasury/investments' },
        ],
      },
    ],
  },
  {
    title: 'RISK & COMPLIANCE',
    items: [
      {
        label: 'Risk', icon: ShieldAlert, path: '/risk', roles: ['CBS_ADMIN', 'RISK_OFFICER'],
        children: [
          { label: 'Overview', path: '/risk' },
          { label: 'Market & Liquidity', path: '/risk/market-liquidity' },
          { label: 'Operational Risk', path: '/risk/operational' },
          { label: 'AML Alerts', path: '/risk/aml' },
          { label: 'Fraud Alerts', path: '/risk/fraud' },
          { label: 'Sanctions', path: '/risk/sanctions' },
          { label: 'Credit Risk', path: '/risk/credit' },
        ],
      },
      {
        label: 'Compliance', icon: Scale, path: '/compliance', roles: ['CBS_ADMIN', 'COMPLIANCE'],
        children: [
          { label: 'Dashboard', path: '/compliance' },
          { label: 'Regulatory Returns', path: '/compliance/returns' },
          { label: 'Assessments', path: '/compliance/assessments' },
          { label: 'Audit Trail', path: '/compliance/audit' },
        ],
      },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      {
        label: 'Operations', icon: Settings2, path: '/operations', roles: ['CBS_ADMIN'],
        children: [
          { label: 'End of Day', path: '/operations/eod' },
          { label: 'General Ledger', path: '/operations/gl' },
          { label: 'Branch Ops', path: '/operations/branches' },
          { label: 'Approvals', path: '/operations/approvals' },
          { label: 'Documents', path: '/operations/documents' },
        ],
      },
      {
        label: 'Reports', icon: BarChart3, path: '/reports', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'Executive', path: '/reports/executive' },
          { label: 'Financial', path: '/reports/financial' },
          { label: 'Loan Portfolio', path: '/reports/loans' },
          { label: 'Deposit Analytics', path: '/reports/deposits' },
          { label: 'Payment Analytics', path: '/reports/payments' },
          { label: 'Channel Analytics', path: '/reports/channels' },
          { label: 'Custom', path: '/reports/custom' },
        ],
      },
      {
        label: 'Admin', icon: Shield, path: '/admin', roles: ['CBS_ADMIN'],
        children: [
          { label: 'Users & Roles', path: '/admin/users' },
          { label: 'Parameters', path: '/admin/parameters' },
          { label: 'Products', path: '/admin/products' },
          { label: 'Fees & Charges', path: '/admin/fees' },
        ],
      },
    ],
  },
];
