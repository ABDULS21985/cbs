import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, PieChart, Landmark, CreditCard,
  ArrowRightLeft, Users, Building2, TrendingUp,
  Shield, FileText, Settings, Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

const reportCategories = [
  {
    title: 'Executive Dashboard',
    description: 'High-level KPIs and bank-wide performance metrics',
    icon: BarChart2,
    path: '/reports/executive',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  },
  {
    title: 'Financial Reports',
    description: 'Balance sheet, income statement, and financial ratios',
    icon: Landmark,
    path: '/reports/financial',
    color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  },
  {
    title: 'Loan Analytics',
    description: 'Portfolio quality, NPL tracking, and provision coverage',
    icon: PieChart,
    path: '/reports/loans',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  },
  {
    title: 'Payment Analytics',
    description: 'Transaction volumes, channel performance, and trends',
    icon: ArrowRightLeft,
    path: '/reports/payments',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
  },
  {
    title: 'Deposit Analytics',
    description: 'Deposit growth, product mix, and maturity profiles',
    icon: Layers,
    path: '/reports/deposits',
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400',
  },
  {
    title: 'Channel Analytics',
    description: 'Digital and branch channel utilization and performance',
    icon: CreditCard,
    path: '/reports/channels',
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400',
  },
  {
    title: 'Customer Analytics',
    description: 'Customer segmentation, lifecycle, and profitability',
    icon: Users,
    path: '/reports/customers',
    color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-400',
  },
  {
    title: 'Treasury & ALM',
    description: 'Liquidity, interest rate risk, and treasury performance',
    icon: TrendingUp,
    path: '/reports/treasury',
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-400',
  },
  {
    title: 'Marketing Analytics',
    description: 'Campaign performance, conversion rates, and ROI',
    icon: Building2,
    path: '/reports/marketing',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
  },
  {
    title: 'Operational Reports',
    description: 'Branch operations, processing volumes, and SLAs',
    icon: Settings,
    path: '/reports/operations',
    color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/20 dark:text-slate-400',
  },
  {
    title: 'Compliance Reports',
    description: 'Regulatory returns, audit trails, and risk assessments',
    icon: Shield,
    path: '/compliance/reports',
    color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  },
  {
    title: 'Custom Reports',
    description: 'Build, save, and schedule custom report templates',
    icon: FileText,
    path: '/reports/custom',
    color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400',
  },
];

export function ReportsHomePage() {
  useEffect(() => { document.title = 'Reports | CBS'; }, []);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Comprehensive reporting across all banking modules" />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {reportCategories.map((cat) => (
            <button
              key={cat.path}
              onClick={() => navigate(cat.path)}
              className="flex flex-col items-start gap-3 rounded-lg border bg-card p-5 text-left hover:bg-muted/40 hover:shadow-sm transition-all"
            >
              <div className={`rounded-lg p-2.5 ${cat.color}`}>
                <cat.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{cat.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cat.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
