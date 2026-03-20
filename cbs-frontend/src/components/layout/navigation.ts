import {
  LayoutDashboard, Users, Landmark, HandCoins, ArrowLeftRight, CreditCard,
  TrendingUp, ShieldAlert, Scale, Settings2, BarChart3, Shield,
  FileText, MessageSquare, Headphones, Activity, Building2,
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
          { label: 'Goal Analytics', path: '/accounts/goals/analytics' },
          { label: 'Financial Health', path: '/accounts/pfm' },
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
          { label: 'Merchants', path: '/cards/merchants' },
          { label: 'POS Terminals', path: '/cards/pos' },
          { label: 'Clearing & Settlement', path: '/cards/clearing' },
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
        children: [
          { label: 'Agreements Hub', path: '/agreements' },
          { label: 'Customer Agreements', path: '/agreements/list' },
          { label: 'TD Frameworks', path: '/agreements/td-frameworks' },
          { label: 'TD Analytics', path: '/agreements/td-summary' },
          { label: 'Commissions', path: '/agreements/commissions' },
          { label: 'Pricing & Discounts', path: '/agreements/pricing' },
        ],
      },
      {
        label: 'Communications', icon: MessageSquare, path: '/communications', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'Message Center', path: '/communications' },
          { label: 'Templates', path: '/communications/templates' },
          { label: 'Routing Rules', path: '/communications/routing' },
          { label: 'Channels', path: '/communications/channels' },
          { label: 'Preferences', path: '/communications/preferences' },
        ],
      },
      {
        label: 'Contact Center', icon: Headphones, path: '/contact-center', roles: ['CBS_ADMIN', 'CBS_OFFICER'],
        children: [
          { label: 'Agent Console', path: '/contact-center' },
          { label: 'Queue Dashboard', path: '/contact-center/queues' },
          { label: 'Callbacks', path: '/contact-center/callbacks' },
          { label: 'IVR Manager', path: '/contact-center/ivr' },
          { label: 'Knowledge Base', path: '/contact-center/help' },
          { label: 'Chat Sessions', path: '/contact-center/chat' },
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
      {
        label: 'Market Data', icon: Activity, path: '/market-data', roles: ['CBS_ADMIN', 'TREASURY'],
        children: [
          { label: 'Infrastructure', path: '/market-data' },
          { label: 'Prices & Signals', path: '/market-data/prices' },
          { label: 'Research', path: '/market-data/research' },
          { label: 'Analysis', path: '/market-data/analysis' },
          { label: 'Market Making', path: '/market-data/market-making' },
          { label: 'Switch Dashboard', path: '/market-data/switch' },
        ],
      },
      {
        label: 'Capital Markets', icon: Building2, path: '/capital-markets', roles: ['CBS_ADMIN', 'TREASURY'],
        children: [
          { label: 'Deal Pipeline', path: '/capital-markets' },
          { label: 'Trade Ops', path: '/capital-markets/trade-ops' },
          { label: 'Settlement', path: '/capital-markets/settlement' },
          { label: 'Custody', path: '/capital-markets/custody' },
          { label: 'Positions', path: '/capital-markets/positions' },
          { label: 'Models', path: '/capital-markets/models' },
          { label: 'Quotes', path: '/capital-markets/quotes' },
          { label: 'Valuation', path: '/capital-markets/valuation' },
        ],
      },
      {
        label: 'Custody & Settlement', icon: Shield, path: '/custody', roles: ['CBS_ADMIN', 'TREASURY'],
        children: [
          { label: 'Overview', path: '/custody' },
          { label: 'Settlements', path: '/custody/settlements' },
          { label: 'Fails', path: '/custody/fails' },
          { label: 'Positions', path: '/custody/positions' },
          { label: 'Counterparties', path: '/custody/counterparties' },
        ],
      },
      {
        label: 'ALM', icon: Activity, path: '/alm', roles: ['CBS_ADMIN', 'TREASURY', 'RISK_OFFICER'],
        children: [
          { label: 'Dashboard', path: '/alm' },
          { label: 'Stress Testing', path: '/alm/stress-testing' },
          { label: 'ALCO Report', path: '/alm/alco-report' },
          { label: 'Regulatory', path: '/alm/regulatory' },
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
          { label: 'Command Center', path: '/compliance' },
          { label: 'AML Monitoring', path: '/compliance/aml' },
          { label: 'Sanctions Screening', path: '/compliance/sanctions' },
          { label: 'Fraud Detection', path: '/compliance/fraud' },
          { label: 'Regulatory Returns', path: '/compliance/returns' },
          { label: 'Compliance Reports', path: '/compliance/reports' },
          { label: 'Assessments', path: '/compliance/assessments' },
          { label: 'Gap Analysis', path: '/compliance/gaps' },
          { label: 'Report Definitions', path: '/compliance/definitions' },
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
          { label: 'Gateway Console', path: '/operations/gateway/console' },
        ],
      },
      {
        label: 'Gateway & Integration', icon: Settings2, path: '/operations/gateway', roles: ['CBS_ADMIN'],
        children: [
          { label: 'Hub', path: '/operations/gateway' },
          { label: 'Console', path: '/operations/gateway/console' },
          { label: 'Integration', path: '/operations/gateway/integration' },
          { label: 'Open Banking', path: '/operations/gateway/open-banking' },
          { label: 'PSD2', path: '/operations/gateway/psd2' },
          { label: 'ISO 20022', path: '/operations/gateway/iso20022' },
          { label: 'Marketplace', path: '/operations/gateway/marketplace' },
          { label: 'Events', path: '/operations/gateway/events' },
          { label: 'Data Lake', path: '/operations/gateway/data-lake' },
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
          { label: 'Dashboard', path: '/admin' },
          { label: 'Users & Roles', path: '/admin/users' },
          { label: 'Parameters', path: '/admin/parameters' },
          { label: 'Products', path: '/admin/products' },
          { label: 'Fees & Charges', path: '/admin/fees' },
          { label: 'Fee Waivers', path: '/admin/fees/waivers' },
          { label: 'Providers', path: '/admin/providers' },
          { label: 'Notifications', path: '/admin/notifications' },
          { label: 'Campaigns', path: '/admin/campaigns' },
          { label: 'Commissions', path: '/admin/commissions' },
          { label: 'Loyalty', path: '/admin/loyalty' },
          { label: 'Pricing', path: '/admin/pricing' },
          { label: 'Sales', path: '/admin/sales' },
          { label: 'Surveys', path: '/admin/surveys' },
          { label: 'Governance', path: '/admin/governance' },
        ],
      },
    ],
  },
];
