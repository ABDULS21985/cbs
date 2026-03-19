export interface WidgetConfig {
  id: string;
  type: 'stat_card' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'list';
  title: string;
  colSpan: number; // out of 12
  rowSpan?: number;
  config?: Record<string, unknown>;
}

export const defaultDashboard: WidgetConfig[] = [
  { id: 'stat-deposits', type: 'stat_card', title: 'Total Deposits', colSpan: 3, config: { format: 'money', change: 5.2, trend: 'up' } },
  { id: 'stat-loans', type: 'stat_card', title: 'Active Loans', colSpan: 3, config: { format: 'money', change: 1.8, trend: 'up' } },
  { id: 'stat-npl', type: 'stat_card', title: 'NPL Ratio', colSpan: 3, config: { format: 'percent', change: -0.3, trend: 'down' } },
  { id: 'stat-revenue', type: 'stat_card', title: 'Revenue MTD', colSpan: 3, config: { format: 'money', change: 12.3, trend: 'up' } },
  { id: 'chart-volume', type: 'line_chart', title: 'Transaction Volume (12 Months)', colSpan: 8 },
  { id: 'chart-deposit-mix', type: 'pie_chart', title: 'Deposit Mix by Product', colSpan: 4 },
  { id: 'table-recent', type: 'table', title: 'Recent Transactions', colSpan: 8 },
  { id: 'list-approvals', type: 'list', title: 'Pending Approvals', colSpan: 4 },
  { id: 'chart-branches', type: 'bar_chart', title: 'Top Branches by Revenue', colSpan: 6 },
  { id: 'chart-disbursements', type: 'bar_chart', title: 'Loan Disbursements by Product', colSpan: 6 },
];
