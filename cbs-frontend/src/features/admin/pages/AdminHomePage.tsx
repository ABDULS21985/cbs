import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Package, Plug, Settings,
  CreditCard, Shield, FileText, Activity,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { userAdminApi } from '../api/userAdminApi';
import { getProducts } from '../api/productApi';
import { providerApi } from '../api/providerApi';

const adminModules = [
  { label: 'User Management', description: 'Manage users, roles, and access control', icon: Users, path: '/admin/users' },
  { label: 'System Parameters', description: 'Configure system-wide settings and limits', icon: Settings, path: '/admin/parameters' },
  { label: 'Product Factory', description: 'Create and manage banking products', icon: Package, path: '/admin/products' },
  { label: 'Fee Management', description: 'Configure fee schedules and definitions', icon: CreditCard, path: '/admin/fees' },
  { label: 'Service Providers', description: 'Monitor integrations and third-party services', icon: Plug, path: '/admin/providers' },
];

export function AdminHomePage() {
  const navigate = useNavigate();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userAdminApi.getUsers(),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => getProducts(),
  });

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['admin', 'providers'],
    queryFn: () => providerApi.getProviders(),
  });

  const isLoading = usersLoading || productsLoading || providersLoading;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const activeProducts = products.filter((p) => p.status === 'ACTIVE').length;
  const healthyProviders = providers.filter((p) => p.status === 'HEALTHY').length;

  return (
    <>
      <PageHeader title="Administration" subtitle="System configuration, user management, and operational settings" />
      <div className="page-container space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={users.length} format="number" icon={Users} loading={isLoading} />
          <StatCard label="Active Users" value={activeUsers} format="number" icon={Shield} loading={isLoading} />
          <StatCard label="Active Products" value={activeProducts} format="number" icon={Package} loading={isLoading} />
          <StatCard label="Healthy Providers" value={`${healthyProviders}/${providers.length}`} icon={Activity} loading={isLoading} />
        </div>

        {/* Quick access modules */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Administration Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminModules.map((mod) => (
              <button
                key={mod.path}
                onClick={() => navigate(mod.path)}
                className="flex items-start gap-4 rounded-lg border bg-card p-5 text-left hover:bg-muted/40 hover:shadow-sm transition-all"
              >
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <mod.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{mod.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent user activity summary */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent User Activity</h2>
          <div className="rounded-lg border bg-card overflow-hidden">
            {usersLoading ? (
              <div className="p-8 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Branch</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 10).map((user) => (
                    <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div>
                          <span className="text-sm font-medium">{user.fullName}</span>
                          <span className="block text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs">{user.roles?.join(', ') ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs">{user.branchName ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : user.status === 'LOCKED'
                                ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
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
