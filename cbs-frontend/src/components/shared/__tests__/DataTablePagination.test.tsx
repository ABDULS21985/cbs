import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTablePagination } from '../DataTablePagination';
import type { Table, Row } from '@tanstack/react-table';

function makeMockTable({
  pageIndex = 0,
  pageSize = 10,
  pageCount = 3,
  rowCount = 25,
  canPrevious = false,
  canNext = true,
}: {
  pageIndex?: number;
  pageSize?: number;
  pageCount?: number;
  rowCount?: number;
  canPrevious?: boolean;
  canNext?: boolean;
} = {}): {
  table: Table<any>;
  setPageSize: ReturnType<typeof vi.fn>;
  setPageIndex: ReturnType<typeof vi.fn>;
  previousPage: ReturnType<typeof vi.fn>;
  nextPage: ReturnType<typeof vi.fn>;
} {
  const setPageSize = vi.fn();
  const setPageIndex = vi.fn();
  const previousPage = vi.fn();
  const nextPage = vi.fn();

  const rows = Array.from({ length: rowCount }, (_, i) => ({ id: String(i) })) as unknown as Row<any>[];

  const table = {
    getState: () => ({ pagination: { pageIndex, pageSize } }),
    getPageCount: () => pageCount,
    getCanPreviousPage: () => canPrevious,
    getCanNextPage: () => canNext,
    getFilteredRowModel: () => ({ rows }),
    setPageSize,
    setPageIndex,
    previousPage,
    nextPage,
  } as unknown as Table<any>;

  return { table, setPageSize, setPageIndex, previousPage, nextPage };
}

describe('DataTablePagination', () => {
  it('renders rows per page label', () => {
    const { table } = makeMockTable();
    render(<DataTablePagination table={table} />);
    expect(screen.getByText(/rows per page/i)).toBeTruthy();
  });

  it('renders default page size options in select', () => {
    const { table } = makeMockTable({ pageSize: 10 });
    render(<DataTablePagination table={table} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => Number(o.value));
    expect(options).toEqual([10, 25, 50, 100]);
  });

  it('renders custom page size options', () => {
    const { table } = makeMockTable({ pageSize: 5 });
    render(<DataTablePagination table={table} pageSizeOptions={[5, 20, 50]} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => Number(o.value));
    expect(options).toEqual([5, 20, 50]);
  });

  it('shows page info text', () => {
    const { table } = makeMockTable({ pageIndex: 0, pageSize: 10, rowCount: 25 });
    render(<DataTablePagination table={table} />);
    expect(screen.getByText(/of 25/)).toBeTruthy();
    expect(screen.getByText(/1–10/)).toBeTruthy();
  });

  it('shows page info for second page', () => {
    const { table } = makeMockTable({ pageIndex: 1, pageSize: 10, rowCount: 25 });
    render(<DataTablePagination table={table} />);
    expect(screen.getByText(/11–20/)).toBeTruthy();
  });

  it('shows page count text', () => {
    const { table } = makeMockTable({ pageIndex: 0, pageCount: 3 });
    render(<DataTablePagination table={table} />);
    expect(screen.getByText(/page 1 of 3/i)).toBeTruthy();
  });

  it('calls setPageSize when page size select changes', () => {
    const { table, setPageSize } = makeMockTable({ pageSize: 10 });
    render(<DataTablePagination table={table} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '25' } });
    expect(setPageSize).toHaveBeenCalledWith(25);
  });

  it('disables first and previous page buttons on first page', () => {
    const { table } = makeMockTable({ canPrevious: false });
    render(<DataTablePagination table={table} />);
    const buttons = screen.getAllByRole('button');
    // First two buttons are first-page and previous-page
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it('disables last and next page buttons on last page', () => {
    const { table } = makeMockTable({ canNext: false });
    render(<DataTablePagination table={table} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[2]).toBeDisabled();
    expect(buttons[3]).toBeDisabled();
  });

  it('calls previousPage when previous button is clicked', () => {
    const { table, previousPage } = makeMockTable({ canPrevious: true });
    render(<DataTablePagination table={table} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(previousPage).toHaveBeenCalledTimes(1);
  });

  it('calls nextPage when next button is clicked', () => {
    const { table, nextPage } = makeMockTable({ canNext: true });
    render(<DataTablePagination table={table} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(nextPage).toHaveBeenCalledTimes(1);
  });

  it('calls setPageIndex(0) for first page button', () => {
    const { table, setPageIndex } = makeMockTable({ canPrevious: true, pageIndex: 1 });
    render(<DataTablePagination table={table} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(setPageIndex).toHaveBeenCalledWith(0);
  });

  it('calls setPageIndex(pageCount - 1) for last page button', () => {
    const { table, setPageIndex } = makeMockTable({ canNext: true, pageCount: 5 });
    render(<DataTablePagination table={table} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[3]);
    expect(setPageIndex).toHaveBeenCalledWith(4);
  });
});
