import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../DataTable';
import { renderWithProviders } from '../../test/helpers';

type TestRow = { id: number; name: string; amount: number };

const columns: ColumnDef<TestRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'amount', header: 'Amount' },
];

const data: TestRow[] = [
  { id: 1, name: 'Alice', amount: 1000 },
  { id: 2, name: 'Bob', amount: 2000 },
  { id: 3, name: 'Carol', amount: 3000 },
  { id: 4, name: 'Dave', amount: 4000 },
  { id: 5, name: 'Eve', amount: 5000 },
  { id: 6, name: 'Frank', amount: 6000 },
  { id: 7, name: 'Grace', amount: 7000 },
];

const minimalData: TestRow[] = [
  { id: 1, name: 'Alice', amount: 1000 },
  { id: 2, name: 'Bob', amount: 2000 },
];

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders column headers from columnDef.header', () => {
    renderWithProviders(<DataTable columns={columns} data={minimalData} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('renders rows with cell data', () => {
    renderWithProviders(<DataTable columns={columns} data={minimalData} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  it('renders DataTableSkeleton when isLoading is true', () => {
    renderWithProviders(<DataTable columns={columns} data={[]} isLoading={true} />);
    // Skeleton should be present with animate-pulse
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('does not render data rows when isLoading is true', () => {
    renderWithProviders(<DataTable columns={columns} data={minimalData} isLoading={true} />);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('renders EmptyState with default message when data is empty', () => {
    renderWithProviders(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText(/no data found/i)).toBeInTheDocument();
  });

  it('renders custom emptyMessage in empty state', () => {
    renderWithProviders(
      <DataTable columns={columns} data={[]} emptyMessage="No transactions available" />,
    );
    expect(screen.getByText('No transactions available')).toBeInTheDocument();
  });

  it('fires onRowClick with row data when a row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderWithProviders(
      <DataTable columns={columns} data={minimalData} onRowClick={onRowClick} />,
    );

    await user.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Alice', amount: 1000 }),
    );
  });

  it('renders search input when enableGlobalFilter is true', () => {
    renderWithProviders(<DataTable columns={columns} data={minimalData} enableGlobalFilter={true} />);
    const searchInput =
      screen.queryByRole('searchbox') ??
      screen.queryByPlaceholderText(/search/i) ??
      document.querySelector('input[type="search"], input[placeholder*="earch"]');
    expect(searchInput).not.toBeNull();
  });

  it('filters visible rows based on search input', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DataTable columns={columns} data={minimalData} enableGlobalFilter={true} />,
    );

    const searchInput =
      screen.queryByRole('searchbox') ??
      screen.queryByPlaceholderText(/search/i) ??
      (document.querySelector('input[type="search"], input[placeholder*="earch"]') as HTMLElement);

    if (searchInput) {
      await user.type(searchInput as HTMLElement, 'Alice');
      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      });
    }
  });

  it('renders checkbox column when enableRowSelection is true', () => {
    renderWithProviders(
      <DataTable columns={columns} data={minimalData} enableRowSelection={true} />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('calls onRowSelectionChange when a row is selected', async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    renderWithProviders(
      <DataTable
        columns={columns}
        data={minimalData}
        enableRowSelection={true}
        onRowSelectionChange={onRowSelectionChange}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is likely the "select all", second is row checkbox
    const rowCheckbox = checkboxes.length > 1 ? checkboxes[1] : checkboxes[0];
    await user.click(rowCheckbox);

    expect(onRowSelectionChange).toHaveBeenCalled();
    const selectedRows = onRowSelectionChange.mock.calls[0][0];
    expect(Array.isArray(selectedRows)).toBe(true);
    expect(selectedRows.length).toBeGreaterThan(0);
  });

  it('shows sort indicator when sortable column header is clicked', async () => {
    const user = userEvent.setup();
    const sortableColumns: ColumnDef<TestRow>[] = [
      { accessorKey: 'name', header: 'Name', enableSorting: true },
      { accessorKey: 'amount', header: 'Amount', enableSorting: true },
    ];
    renderWithProviders(<DataTable columns={sortableColumns} data={minimalData} />);

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    await waitFor(() => {
      // Sorted ascending indicator (arrow up or down)
      const sortIcon =
        document.querySelector('[data-testid="sort-asc"]') ??
        document.querySelector('[data-testid="sort-desc"]') ??
        document.querySelector('.lucide-arrow-up') ??
        document.querySelector('.lucide-arrow-down') ??
        document.querySelector('svg[class*="sort"]');
      expect(sortIcon).not.toBeNull();
    });
  });

  it('shows only pageSize rows when pageSize is set and data exceeds it', () => {
    renderWithProviders(<DataTable columns={columns} data={data} pageSize={5} />);
    // data has 7 rows, pageSize=5 → only 5 visible
    const rows = screen.getAllByRole('row');
    // rows include header row, so total = pageSize + 1 header
    expect(rows.length).toBe(6); // 1 header + 5 data rows
  });

  it('renders pagination when data is not empty and not loading', () => {
    renderWithProviders(<DataTable columns={columns} data={data} pageSize={5} />);
    // Pagination should be present (next/prev buttons or page numbers)
    const paginationNext =
      screen.queryByRole('button', { name: /next/i }) ??
      screen.queryByLabelText(/next page/i) ??
      document.querySelector('[data-testid="pagination-next"]') ??
      document.querySelector('button[aria-label*="next"]');
    expect(paginationNext).not.toBeNull();
  });

  it('does not render search input when enableGlobalFilter is false or undefined', () => {
    renderWithProviders(<DataTable columns={columns} data={minimalData} />);
    const searchInput =
      screen.queryByRole('searchbox') ??
      screen.queryByPlaceholderText(/search/i) ??
      document.querySelector('input[type="search"]');
    expect(searchInput).toBeNull();
  });

  it('does not render checkboxes when enableRowSelection is false or undefined', () => {
    renderWithProviders(<DataTable columns={columns} data={minimalData} />);
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes.length).toBe(0);
  });

  it('renders all rows when data length is within default page size', () => {
    renderWithProviders(<DataTable columns={columns} data={minimalData} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('does not render pagination when data is empty', () => {
    renderWithProviders(<DataTable columns={columns} data={[]} />);
    const nextBtn = screen.queryByRole('button', { name: /next/i });
    expect(nextBtn).toBeNull();
  });

  it('onRowClick is called with correct row when second row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderWithProviders(
      <DataTable columns={columns} data={minimalData} onRowClick={onRowClick} />,
    );

    await user.click(screen.getByText('Bob'));
    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, name: 'Bob', amount: 2000 }),
    );
  });
});
