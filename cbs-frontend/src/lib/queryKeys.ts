export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    list: (filters?: Record<string, unknown>) => ['customers', 'list', filters] as const,
    detail: (id: number) => ['customers', 'detail', id] as const,
    accounts: (id: number) => ['customers', id, 'accounts'] as const,
    search: (query: string) => ['customers', 'search', query] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    list: (filters?: Record<string, unknown>) => ['accounts', 'list', filters] as const,
    detail: (id: number) => ['accounts', 'detail', id] as const,
    transactions: (id: number, params?: Record<string, unknown>) => ['accounts', id, 'transactions', params] as const,
    balance: (id: number) => ['accounts', id, 'balance'] as const,
  },
  loans: {
    all: ['loans'] as const,
    list: (filters?: Record<string, unknown>) => ['loans', 'list', filters] as const,
    detail: (id: number) => ['loans', 'detail', id] as const,
    schedule: (id: number) => ['loans', id, 'schedule'] as const,
    applications: (filters?: Record<string, unknown>) => ['loans', 'applications', filters] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (filters?: Record<string, unknown>) => ['payments', 'list', filters] as const,
    detail: (id: number) => ['payments', 'detail', id] as const,
  },
  cards: {
    all: ['cards'] as const,
    list: (filters?: Record<string, unknown>) => ['cards', 'list', filters] as const,
    detail: (id: number) => ['cards', 'detail', id] as const,
  },
  treasury: {
    deals: (filters?: Record<string, unknown>) => ['treasury', 'deals', filters] as const,
    positions: (type?: string) => ['treasury', 'positions', type] as const,
  },
  risk: {
    amlAlerts: (filters?: Record<string, unknown>) => ['risk', 'aml', filters] as const,
    fraudAlerts: (filters?: Record<string, unknown>) => ['risk', 'fraud', filters] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    recentTransactions: ['dashboard', 'recent-transactions'] as const,
    charts: (period: string) => ['dashboard', 'charts', period] as const,
  },
  gl: {
    journals: (filters?: Record<string, unknown>) => ['gl', 'journals', filters] as const,
    balances: (date?: string) => ['gl', 'balances', date] as const,
  },
} as const;
