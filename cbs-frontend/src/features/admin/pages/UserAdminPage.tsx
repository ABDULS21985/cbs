import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import { Users, Shield, Grid3X3, Monitor, Clock, Plus } from 'lucide-react';
import { userAdminApi } from '../api/userAdminApi';
import { UserTable } from '../components/users/UserTable';
import { RoleTable } from '../components/users/RoleTable';
import { PermissionMatrixGrid } from '../components/users/PermissionMatrixGrid';
import { ActiveSessionsTable } from '../components/users/ActiveSessionsTable';
import { LoginHistoryTable } from '../components/users/LoginHistoryTable';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'permissions', label: 'Permission Matrix', icon: Grid3X3 },
  { id: 'sessions', label: 'Active Sessions', icon: Monitor },
  { id: 'history', label: 'Login History', icon: Clock },
] as const;

type TabId = typeof TABS[number]['id'];

export function UserAdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('users');

  const { data: roles = [] } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => userAdminApi.getRoles(),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => userAdminApi.getPermissions(),
  });

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b bg-card flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold">User Administration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage users, roles, permissions and monitor session activity
          </p>
        </div>
        <button
          onClick={() => setActiveTab('users')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New User
        </button>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex flex-col flex-1 min-h-0">
        <Tabs.List className="flex items-center gap-0 px-6 border-b bg-card flex-shrink-0 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  'hover:text-foreground',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="flex-1 overflow-y-auto">
          <Tabs.Content value="users" className="p-6 focus:outline-none">
            <UserTable />
          </Tabs.Content>

          <Tabs.Content value="roles" className="p-6 focus:outline-none">
            <RoleTable />
          </Tabs.Content>

          <Tabs.Content value="permissions" className="p-6 focus:outline-none">
            {roles.length > 0 && permissions.length > 0 ? (
              <PermissionMatrixGrid roles={roles} permissions={permissions} />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Loading permissions data...
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="sessions" className="p-6 focus:outline-none">
            <ActiveSessionsTable />
          </Tabs.Content>

          <Tabs.Content value="history" className="p-6 focus:outline-none">
            <LoginHistoryTable />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
