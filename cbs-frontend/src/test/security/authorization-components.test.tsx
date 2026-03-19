import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { RoleGuard } from '@/components/auth/RoleGuard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function resetStore() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshTokenValue: null,
    isAuthenticated: false,
    isLoading: false,
    mfaRequired: false,
    mfaSessionToken: null,
    tokenExpiresAt: null,
  });
}

function setAuthenticatedUser(roles: string[], branchId = 1) {
  useAuthStore.setState({
    user: {
      id: 'usr-001',
      username: 'testuser',
      fullName: 'Test User',
      email: 'test@digicore.bank',
      roles,
      permissions: [],
      branchId,
      branchName: 'Main Branch',
    },
    accessToken: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  });
}

// ─── ProtectedRoute Tests ───────────────────────────────────────────────────

describe('ProtectedRoute Component', () => {
  beforeEach(() => resetStore());

  // T6-RBAC-02: Unauthenticated user → redirect to /login
  it('should redirect unauthenticated users to /login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  // T6-RBAC: Authenticated user without requiredRoles → access granted
  it('should allow authenticated users when no requiredRoles specified', () => {
    setAuthenticatedUser(['TELLER']);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  // T6-RBAC-02: Direct URL access to restricted page → 403
  it('should show 403 Access Denied when user lacks required role', () => {
    setAuthenticatedUser(['TELLER']);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles={['CBS_ADMIN']}>
                <div>Admin Panel</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  // T6-RBAC: CBS_ADMIN bypasses requiredRoles
  it('should allow CBS_ADMIN to bypass any requiredRoles check', () => {
    setAuthenticatedUser(['CBS_ADMIN']);

    render(
      <MemoryRouter initialEntries={['/treasury']}>
        <Routes>
          <Route
            path="/treasury"
            element={
              <ProtectedRoute requiredRoles={['TREASURY']}>
                <div>Treasury Page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Treasury Page')).toBeInTheDocument();
  });

  // T6-RBAC: User with correct role
  it('should allow user with one of the required roles', () => {
    setAuthenticatedUser(['TREASURY']);

    render(
      <MemoryRouter initialEntries={['/treasury']}>
        <Routes>
          <Route
            path="/treasury"
            element={
              <ProtectedRoute requiredRoles={['CBS_ADMIN', 'TREASURY']}>
                <div>Treasury Page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Treasury Page')).toBeInTheDocument();
  });

  // T6-RBAC-02: Various roles denied from admin pages
  it.each([
    ['CBS_OFFICER'],
    ['TELLER'],
    ['LOAN_OFFICER'],
    ['TREASURY'],
    ['RISK_OFFICER'],
    ['COMPLIANCE'],
    ['AUDITOR'],
  ])('should deny %s role access to admin-only page', (role) => {
    setAuthenticatedUser([role]);

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRoles={['CBS_ADMIN']}>
                <div>User Management</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
  });
});

// ─── PermissionGate Tests ───────────────────────────────────────────────────

describe('PermissionGate Component', () => {
  beforeEach(() => resetStore());

  // T6-RBAC-04: PermissionGate hides UI elements correctly
  it('should render children when user has permission', () => {
    setAuthenticatedUser(['CBS_ADMIN']);

    render(
      <MemoryRouter>
        <PermissionGate module="customers" action="create">
          <button>Create Customer</button>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.getByText('Create Customer')).toBeInTheDocument();
  });

  it('should hide children when user lacks permission', () => {
    setAuthenticatedUser(['TELLER']);

    render(
      <MemoryRouter>
        <PermissionGate module="customers" action="create">
          <button>Create Customer</button>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Create Customer')).not.toBeInTheDocument();
  });

  it('should render fallback when user lacks permission', () => {
    setAuthenticatedUser(['TELLER']);

    render(
      <MemoryRouter>
        <PermissionGate
          module="admin"
          action="view"
          fallback={<span>No Access</span>}
        >
          <button>Admin Settings</button>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Admin Settings')).not.toBeInTheDocument();
    expect(screen.getByText('No Access')).toBeInTheDocument();
  });

  // T6-RBAC-05: Action buttons hidden per role
  it('should hide create button for AUDITOR (view-only)', () => {
    setAuthenticatedUser(['AUDITOR']);

    render(
      <MemoryRouter>
        <PermissionGate module="customers" action="view">
          <span>Customer List</span>
        </PermissionGate>
        <PermissionGate module="customers" action="create">
          <button>Add Customer</button>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.getByText('Customer List')).toBeInTheDocument();
    expect(screen.queryByText('Add Customer')).not.toBeInTheDocument();
  });

  it('should hide delete button for CBS_OFFICER on cards', () => {
    setAuthenticatedUser(['CBS_OFFICER']);

    render(
      <MemoryRouter>
        <PermissionGate module="cards" action="view">
          <span>Card Details</span>
        </PermissionGate>
        <PermissionGate module="cards" action="delete">
          <button>Delete Card</button>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.getByText('Card Details')).toBeInTheDocument();
    expect(screen.queryByText('Delete Card')).not.toBeInTheDocument();
  });

  // T6-RBAC-08: Export button hidden if user lacks export permission
  it('should hide export button for roles without export permission', () => {
    setAuthenticatedUser(['TELLER']);

    render(
      <MemoryRouter>
        <PermissionGate module="reports" action="export">
          <button>Export Report</button>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Export Report')).not.toBeInTheDocument();
  });

  it('should show export button for AUDITOR (has reports:export)', () => {
    setAuthenticatedUser(['AUDITOR']);

    render(
      <MemoryRouter>
        <PermissionGate module="reports" action="export">
          <button>Export Report</button>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.getByText('Export Report')).toBeInTheDocument();
  });

  it('should show export button for CBS_OFFICER (has reports:export)', () => {
    setAuthenticatedUser(['CBS_OFFICER']);

    render(
      <MemoryRouter>
        <PermissionGate module="reports" action="export">
          <button>Export Report</button>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.getByText('Export Report')).toBeInTheDocument();
  });

  // T6-RBAC-04: PermissionGate with no user
  it('should hide children when no user is authenticated', () => {
    // Store is already reset (no user)

    render(
      <MemoryRouter>
        <PermissionGate module="customers" action="view">
          <button>View Customers</button>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.queryByText('View Customers')).not.toBeInTheDocument();
  });
});

// ─── RoleGuard Tests ────────────────────────────────────────────────────────

describe('RoleGuard Component', () => {
  beforeEach(() => resetStore());

  it('should render children when user has required role', () => {
    setAuthenticatedUser(['CBS_ADMIN']);

    render(
      <MemoryRouter>
        <RoleGuard roles={['CBS_ADMIN']}>
          <div>Admin Content</div>
        </RoleGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should hide children when user lacks required role', () => {
    setAuthenticatedUser(['TELLER']);

    render(
      <MemoryRouter>
        <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']}>
          <div>Officer Content</div>
        </RoleGuard>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Officer Content')).not.toBeInTheDocument();
  });

  it('should render fallback when user lacks role', () => {
    setAuthenticatedUser(['TELLER']);

    render(
      <MemoryRouter>
        <RoleGuard
          roles={['CBS_ADMIN']}
          fallback={<span>Insufficient privileges</span>}
        >
          <div>Admin Content</div>
        </RoleGuard>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.getByText('Insufficient privileges')).toBeInTheDocument();
  });

  it('should accept a single role string', () => {
    setAuthenticatedUser(['BRANCH_MANAGER']);

    render(
      <MemoryRouter>
        <RoleGuard roles="BRANCH_MANAGER">
          <div>Manager View</div>
        </RoleGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText('Manager View')).toBeInTheDocument();
  });

  it('should hide content when no user is authenticated', () => {
    render(
      <MemoryRouter>
        <RoleGuard roles={['CBS_ADMIN']}>
          <div>Admin Content</div>
        </RoleGuard>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  // T6-RBAC-06: Approval actions only for authorized approvers
  it('should gate approval actions to BRANCH_MANAGER and CBS_ADMIN', () => {
    setAuthenticatedUser(['TELLER']);

    render(
      <MemoryRouter>
        <RoleGuard roles={['CBS_ADMIN', 'BRANCH_MANAGER']}>
          <button>Approve Transaction</button>
        </RoleGuard>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Approve Transaction')).not.toBeInTheDocument();
  });

  it('should show approval button for BRANCH_MANAGER', () => {
    setAuthenticatedUser(['BRANCH_MANAGER']);

    render(
      <MemoryRouter>
        <RoleGuard roles={['CBS_ADMIN', 'BRANCH_MANAGER']}>
          <button>Approve Transaction</button>
        </RoleGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText('Approve Transaction')).toBeInTheDocument();
  });
});

// ─── Combined scenarios ─────────────────────────────────────────────────────

describe('Combined PermissionGate + RoleGuard scenarios', () => {
  beforeEach(() => resetStore());

  it('TELLER should see view elements but not create/delete', () => {
    setAuthenticatedUser(['TELLER']);

    render(
      <MemoryRouter>
        <PermissionGate module="customers" action="view">
          <span data-testid="view">View</span>
        </PermissionGate>
        <PermissionGate module="customers" action="create">
          <span data-testid="create">Create</span>
        </PermissionGate>
        <PermissionGate module="customers" action="delete">
          <span data-testid="delete">Delete</span>
        </PermissionGate>
        <PermissionGate module="payments" action="create">
          <span data-testid="pay">Pay</span>
        </PermissionGate>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('view')).toBeInTheDocument();
    expect(screen.queryByTestId('create')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete')).not.toBeInTheDocument();
    expect(screen.getByTestId('pay')).toBeInTheDocument();
  });

  it('CBS_ADMIN should see all elements', () => {
    setAuthenticatedUser(['CBS_ADMIN']);

    render(
      <MemoryRouter>
        <PermissionGate module="customers" action="view">
          <span data-testid="view">View</span>
        </PermissionGate>
        <PermissionGate module="customers" action="create">
          <span data-testid="create">Create</span>
        </PermissionGate>
        <PermissionGate module="admin" action="delete">
          <span data-testid="admin-delete">Admin Delete</span>
        </PermissionGate>
        <RoleGuard roles={['CBS_ADMIN']}>
          <span data-testid="admin-only">Admin Only</span>
        </RoleGuard>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('view')).toBeInTheDocument();
    expect(screen.getByTestId('create')).toBeInTheDocument();
    expect(screen.getByTestId('admin-delete')).toBeInTheDocument();
    expect(screen.getByTestId('admin-only')).toBeInTheDocument();
  });
});
