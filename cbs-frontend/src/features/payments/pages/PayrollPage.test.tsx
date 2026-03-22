import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { PayrollPage } from './PayrollPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockBatches = [
  {
    id: 1, batchId: 'PYR-2026-001', customerId: 1001, companyName: 'Acme Industries Ltd',
    debitAccountId: 5001, payrollType: 'MONTHLY_SALARY', currency: 'NGN',
    payPeriodStart: '2026-03-01', payPeriodEnd: '2026-03-31', paymentDate: '2026-03-28',
    employeeCount: 150, totalGross: 45000000, totalDeductions: 9000000, totalNet: 36000000,
    status: 'DRAFT', createdBy: 'admin', approvedBy: null,
    createdAt: '2026-03-20T10:00:00Z', updatedAt: '2026-03-20T10:00:00Z',
  },
  {
    id: 2, batchId: 'PYR-2026-002', customerId: 1002, companyName: 'TechStart Corp',
    debitAccountId: 5002, payrollType: 'BONUS', currency: 'NGN',
    payPeriodStart: '2026-01-01', payPeriodEnd: '2026-03-31', paymentDate: '2026-03-30',
    employeeCount: 45, totalGross: 8500000, totalDeductions: 1700000, totalNet: 6800000,
    status: 'VALIDATED', createdBy: 'admin', approvedBy: null,
    createdAt: '2026-03-18T14:30:00Z', updatedAt: '2026-03-19T09:00:00Z',
  },
  {
    id: 3, batchId: 'PYR-2026-003', customerId: 1003, companyName: 'GlobalBank Services',
    debitAccountId: 5003, payrollType: 'MONTHLY_SALARY', currency: 'NGN',
    payPeriodStart: '2026-02-01', payPeriodEnd: '2026-02-28', paymentDate: '2026-02-27',
    employeeCount: 300, totalGross: 90000000, totalDeductions: 18000000, totalNet: 72000000,
    status: 'APPROVED', createdBy: 'admin', approvedBy: 'manager',
    createdAt: '2026-02-20T08:00:00Z', updatedAt: '2026-02-25T11:00:00Z',
  },
  {
    id: 4, batchId: 'PYR-2026-004', customerId: 1001, companyName: 'Acme Industries Ltd',
    debitAccountId: 5001, payrollType: 'MONTHLY_SALARY', currency: 'NGN',
    payPeriodStart: '2026-02-01', payPeriodEnd: '2026-02-28', paymentDate: '2026-02-27',
    employeeCount: 148, totalGross: 44400000, totalDeductions: 8880000, totalNet: 35520000,
    status: 'PROCESSED', createdBy: 'admin', approvedBy: 'manager',
    processedAt: '2026-02-27T06:00:00Z',
    createdAt: '2026-02-18T10:00:00Z', updatedAt: '2026-02-27T06:00:00Z',
  },
];

const mockItems = [
  {
    id: 1, batchId: 'PYR-2026-001', employeeId: 'EMP001', employeeName: 'Adeola Johnson',
    creditAccountNumber: '0123456789', creditBankCode: '044', grossAmount: 600000,
    taxAmount: 50000, pensionAmount: 30000, otherDeductions: 20000, netAmount: 500000,
    status: 'PENDING', failureReason: null,
  },
  {
    id: 2, batchId: 'PYR-2026-001', employeeId: 'EMP002', employeeName: 'Kunle Adeyemi',
    creditAccountNumber: '0987654321', creditBankCode: '058', grossAmount: 500000,
    taxAmount: 40000, pensionAmount: 25000, otherDeductions: 15000, netAmount: 420000,
    status: 'PENDING', failureReason: null,
  },
  {
    id: 3, batchId: 'PYR-2026-001', employeeId: 'EMP003', employeeName: 'Ngozi Okafor',
    creditAccountNumber: '1122334455', creditBankCode: '011', grossAmount: 450000,
    taxAmount: 35000, pensionAmount: 22500, otherDeductions: 12500, netAmount: 380000,
    status: 'FAILED', failureReason: 'Invalid account number',
  },
];

function setupHandlers(batches: unknown[] = mockBatches) {
  server.use(
    http.get('/api/v1/payroll/batches', () => HttpResponse.json(wrap(batches))),
    http.get('/api/v1/payroll/batches/:batchId/items', () => HttpResponse.json(wrap(mockItems))),
  );
}

describe('PayrollPage', () => {
  // ── Page header ──────────────────────────────────────────────────────────

  it('renders the page header with title and subtitle', () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    expect(screen.getByText('Payroll Processing')).toBeInTheDocument();
    expect(
      screen.getByText('Corporate payroll batch management — validation, approval, and disbursement'),
    ).toBeInTheDocument();
  });

  // ── New Payroll Batch button ─────────────────────────────────────────────

  it('renders the New Payroll Batch button', () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    expect(screen.getByText('New Payroll Batch')).toBeInTheDocument();
  });

  it('opens create dialog when New Payroll Batch is clicked', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    fireEvent.click(screen.getByText('New Payroll Batch'));
    await waitFor(() => {
      expect(screen.getByText('Company Name *')).toBeInTheDocument();
    });
    expect(screen.getByText('Customer ID *')).toBeInTheDocument();
    expect(screen.getByText('Debit Account ID *')).toBeInTheDocument();
    expect(screen.getByText('Payment Date *')).toBeInTheDocument();
  });

  it('closes create dialog when Cancel is clicked', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    fireEvent.click(screen.getByText('New Payroll Batch'));
    await waitFor(() => {
      expect(screen.getByText('Company Name *')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Company Name *')).not.toBeInTheDocument();
    });
  });

  // ── Batch list display ───────────────────────────────────────────────────

  it('displays payroll batches in the table', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      // "Acme Industries Ltd" appears twice (two batches with same company)
      expect(screen.getAllByText('Acme Industries Ltd').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('TechStart Corp')).toBeInTheDocument();
    expect(screen.getByText('GlobalBank Services')).toBeInTheDocument();
  });

  it('displays batch IDs as clickable links', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('PYR-2026-001')).toBeInTheDocument();
    });
    expect(screen.getByText('PYR-2026-002')).toBeInTheDocument();
    expect(screen.getByText('PYR-2026-003')).toBeInTheDocument();
    expect(screen.getByText('PYR-2026-004')).toBeInTheDocument();
  });

  // ── Stat cards ───────────────────────────────────────────────────────────

  it('renders stat card labels', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    // Stat cards show skeletons while loading; wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Total Batches')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Employees')).toBeInTheDocument();
    expect(screen.getByText('Total Net Amount')).toBeInTheDocument();
    expect(screen.getByText('Pending Action')).toBeInTheDocument();
  });

  // ── Batch detail with items ──────────────────────────────────────────────

  it('navigates to batch detail view when batch ID is clicked', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('PYR-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('PYR-2026-001'));
    await waitFor(() => {
      expect(screen.getByText('Adeola Johnson')).toBeInTheDocument();
    });
    expect(screen.getByText('Kunle Adeyemi')).toBeInTheDocument();
    expect(screen.getByText('Ngozi Okafor')).toBeInTheDocument();
  });

  it('shows Back to Batches button in detail view', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('PYR-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('PYR-2026-001'));
    await waitFor(() => {
      expect(screen.getByText('← Back to Batches')).toBeInTheDocument();
    });
  });

  it('returns to batch list when Back to Batches is clicked', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('PYR-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('PYR-2026-001'));
    await waitFor(() => {
      expect(screen.getByText('← Back to Batches')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('← Back to Batches'));
    await waitFor(() => {
      // Use getAllByText since "Acme Industries Ltd" appears in multiple batches
      expect(screen.getAllByText('Acme Industries Ltd').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows failure reason for failed items in detail view', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('PYR-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('PYR-2026-001'));
    await waitFor(() => {
      expect(screen.getByText('Invalid account number')).toBeInTheDocument();
    });
  });

  it('shows Add Employees button for DRAFT batch detail', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('PYR-2026-001')).toBeInTheDocument();
    });
    // PYR-2026-001 is DRAFT so Add Employees should appear
    fireEvent.click(screen.getByText('PYR-2026-001'));
    await waitFor(() => {
      expect(screen.getByText('Add Employees')).toBeInTheDocument();
    });
  });

  // ── Action buttons (Validate, Approve, Process) ─────────────────────────

  it('shows Validate button for DRAFT batches', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('Validate')).toBeInTheDocument();
    });
  });

  it('shows Approve button for VALIDATED batches', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });
  });

  it('shows Process button for APPROVED batches', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('Process')).toBeInTheDocument();
    });
  });

  it('opens confirm dialog when Validate is clicked', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('Validate')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Validate'));
    await waitFor(() => {
      expect(screen.getByText('Validate Batch')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Are you sure you want to validate batch PYR-2026-001?'),
    ).toBeInTheDocument();
  });

  it('opens confirm dialog when Approve is clicked', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => {
      expect(screen.getByText('Approve Batch')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Are you sure you want to approve batch PYR-2026-002?'),
    ).toBeInTheDocument();
  });

  it('opens confirm dialog when Process is clicked', async () => {
    setupHandlers();
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('Process')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Process'));
    await waitFor(() => {
      expect(screen.getByText('Process Batch')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Are you sure you want to process batch PYR-2026-003?'),
    ).toBeInTheDocument();
  });

  it('does not show action buttons for PROCESSED batches', async () => {
    setupHandlers([mockBatches[3]]); // only the PROCESSED batch
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('PYR-2026-004')).toBeInTheDocument();
    });
    expect(screen.queryByText('Validate')).not.toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Process')).not.toBeInTheDocument();
  });

  // ── Empty states ─────────────────────────────────────────────────────────

  it('shows empty state when no batches exist', async () => {
    setupHandlers([]);
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('No payroll batches')).toBeInTheDocument();
    });
  });

  it('shows empty items message when batch has no items', async () => {
    server.use(
      http.get('/api/v1/payroll/batches', () => HttpResponse.json(wrap(mockBatches))),
      http.get('/api/v1/payroll/batches/:batchId/items', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('PYR-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('PYR-2026-001'));
    await waitFor(() => {
      expect(
        screen.getByText("No items in this batch. Click 'Add Employees' to add payroll entries."),
      ).toBeInTheDocument();
    });
  });

  // ── Error state ──────────────────────────────────────────────────────────

  it('shows error banner when batches fail to load', async () => {
    server.use(
      http.get('/api/v1/payroll/batches', () =>
        HttpResponse.json({ success: false, message: 'Server error' }, { status: 500 }),
      ),
    );
    renderWithProviders(<PayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load payroll data.')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
