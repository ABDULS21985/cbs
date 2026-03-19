import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Package, Plug, Settings, CreditCard, Shield, Activity,
  Lock, Bell, ArrowRight, Megaphone, Banknote, Gift, Tag, Target,
  ClipboardList, Scale,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import { userAdminApi } from '../api/userAdminApi';
import { formatDateTime } from '@/lib/formatters';
import { subDays, parseISO, format, startOfDay, isSameDay } from 'date-fns';

const adminModules = [
  { label: 'User Management', description: 'Manage users, roles, and access control', icon: Users, path: '/admin/users' },
  { label: 'System Parameters', description: 'Configure system-wide settings and limits', icon: Settings, path: '/admin/parameters' },
  { label: 'Product Factory', description: 'Create and manage banking products', icon: Package, path: '/admin/products' },
  { label: 'Fee Management', description: 'Configure fee schedules and definitions', icon: CreditCard, path: '/admin/fees' },
  { label: 'Service Providers', description: 'Monitor integrations and third-party services', icon: Plug, path: '/admin/providers' },
  { label: 'Notifications', description: 'Manage notification templates and delivery', icon: Bell, path: '/admin/notifications' },
  { label: 'Campaigns', description: 'Create and track marketing campaigns', icon: Megaphone, path: '/admin/campaigns' },
  { label: 'Commissions', description: 'Commission agreements and payout management', icon: Banknote, path: '/admin/commissions' },
  { label: 'Loyalty Programs', description: 'Points, tiers, and rewards management', icon: Gift, path: '/admin/loyalty' },
  { label: 'Pricing', description: 'Discount schemes and special pricing', icon: Tag, path: '/admin/pricing' },
  { label: 'Sales', description: 'Leads, plans, and sales collateral', icon: Target, path: '/admin/sales' },
  { label: 'Surveys', description: 'Customer surveys and feedback analysis', icon: ClipboardList, path: '/admin/surveys' },
  { label: 'Governance', description: 'Audit trail, change management, approvals', icon: Scale, path: '/admin/governance' },
];

const ROLE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4'];

export function AdminHomePage() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['users', 'dashboardStats'],
    queryFn: () => userAdminApi.getDashboardStats(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userAdminApi.getUsers(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => userAdminApi.getRoles(),
  });

  const { data: loginEvents = [] } = useQuery({
    queryKey: ['admin', 'login-history'],
    queryFn: () => userAdminApi.getLoginHistory({}),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => userAdminApi.getActiveSessions(),
  });

  // Users by Role donut chart data
  const roleChartData = useMemo(() => {
    return roles
      .filter(r => r.userCount > 0)
      .map(r => ({ name: r.displayName, value: r.userCount }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [roles]);

  // Login Activity last 7 days bar chart
  const loginBarData = useMemo(() => {
    const days: { day: string; success: number; failed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const label = format(date, 'EEE');
      const dayEvents = loginEvents.filter(e => {
        try { return isSameDay(parseISO(e.timestamp), dayStart); } catch { return false; }
      });
      days.push({
        day: label,
        success: dayEvents.filter(e => e.outcome === 'SUCCESS').length,
        failed: dayEvents.filter(e => e.outcome === 'FAILED').length,
      });
    }
    return days;
  }, [loginEvents]);

  // Sessions by branch (approximated from session user grouping)
  const sessionsByBranch = useMemo(() => {
    const branchMap: Record<string, number> = {};
    sessions.forEach(s => {
      const key = s.ip?.split('.').slice(0, 2).join('.') + '.*.*';
      branchMap[key] = (branchMap[key] || 0) + 1;
    });
    return Object.entries(branchMap)
      .map(([branch, count]) => ({ branch, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [sessions]);

  const recentEvents = loginEvents.slice(0, 20);

  return (
    <>
      <PageHeader title="Administration" subtitle="System configuration, user management, and operational settings" />
      <div className="page-container space-y-6">
        {/* Summary stats from /dashboard/stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Users" value={stats?.totalUsers ?? 0} format="number" icon={Users} loading={statsLoading} />
          <StatCard label="Active Users" value={stats?.activeUsers ?? 0} format="number" icon={Shield} loading={statsLoading} />
          <StatCard label="Locked Users" value={stats?.lockedUsers ?? 0} format="number" icon={Lock} loading={statsLoading} />
          <StatCard label="Active Products" value={stats?.activeProducts ?? 0} format="number" icon={Package} loading={statsLoading} />
          <StatCard label="Healthy Providers" value={stats?.healthyProviders ?? 0} format="number" icon={Activity} loading={statsLoading} />
        </div>

        {/* Quick Stats Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Users by Role donut */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Users by Role</h3>
            {roleChartData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={roleChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} strokeWidth={2}>
                      {roleChartData.map((_, i) => (
                        <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {roleChartData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                      <span className="text-muted-foreground flex-1 truncate">{d.name}</span>
                      <span className="font-semibold tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No role data</p>
            )}
          </div>

          {/* Login Activity last 7 days */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Login Activity — Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={loginBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="success" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={16} name="Success" />
                <Bar dataKey="failed" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={16} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Active Sessions by IP subnet */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Active Sessions ({sessions.length})</h3>
            {sessionsByBranch.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={sessionsByBranch} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="branch" type="category" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={14} name="Sessions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No active sessions</p>
            )}
          </div>
        </div>

        {/* Administration Modules grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Administration Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminModules.map((mod) => (
              <button
                key={mod.path}
                onClick={() => navigate(mod.path)}
                className="flex items-start gap-4 rounded-xl border bg-card p-5 text-left hover:bg-muted/40 hover:shadow-sm hover:border-primary/30 transition-all group"
              >
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary/20 transition-colors">
                  <mod.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{mod.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 mt-1 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Login Activity table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Login Activity</h2>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-sm text-primary font-medium hover:underline"
            >
              View all
            </button>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            {recentEvents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">No recent login events</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Action</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">IP Address</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Timestamp</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => (
                    <tr key={event.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium font-mono">{event.username}</span>
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        {event.outcome === 'SUCCESS' ? 'Login' : 'Failed Login'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-mono text-muted-foreground">{event.ip}</span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground tabular-nums">
                        {formatDateTime(event.timestamp)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={event.outcome === 'SUCCESS' ? 'ACTIVE' : 'FAILED'} dot />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
