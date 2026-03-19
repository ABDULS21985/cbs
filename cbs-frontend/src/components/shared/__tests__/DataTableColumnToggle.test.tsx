import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTableColumnToggle } from '../DataTableColumnToggle';
import type { Table, Column } from '@tanstack/react-table';

function makeMockColumn(id: string, header: string, visible = true): Column<any, any> {
  return {
    id,
    columnDef: { header },
    getCanHide: () => true,
    getIsVisible: () => visible,
    getToggleVisibilityHandler: () => vi.fn(),
  } as unknown as Column<any, any>;
}

function makeMockTable(columns: Column<any, any>[]): Table<any> {
  return {
    getAllLeafColumns: () => columns,
  } as unknown as Table<any>;
}

describe('DataTableColumnToggle', () => {
  it('renders a Columns button', () => {
    const table = makeMockTable([]);
    render(<DataTableColumnToggle table={table} />);
    expect(screen.getByRole('button', { name: /columns/i })).toBeTruthy();
  });

  it('dropdown is hidden by default', () => {
    const col = makeMockColumn('name', 'Name');
    const table = makeMockTable([col]);
    render(<DataTableColumnToggle table={table} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('opens dropdown when button is clicked', () => {
    const col = makeMockColumn('name', 'Name');
    const table = makeMockTable([col]);
    render(<DataTableColumnToggle table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    expect(screen.getByRole('checkbox')).toBeTruthy();
  });

  it('renders a checkbox for each hideable column', () => {
    const cols = [
      makeMockColumn('name', 'Name'),
      makeMockColumn('status', 'Status'),
    ];
    const table = makeMockTable(cols);
    render(<DataTableColumnToggle table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
  });

  it('renders column string header as label', () => {
    const col = makeMockColumn('name', 'Full Name');
    const table = makeMockTable([col]);
    render(<DataTableColumnToggle table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    expect(screen.getByText('Full Name')).toBeTruthy();
  });

  it('renders column id when header is not a string', () => {
    const col = {
      id: 'actions',
      columnDef: { header: () => <span>Actions</span> },
      getCanHide: () => true,
      getIsVisible: () => true,
      getToggleVisibilityHandler: () => vi.fn(),
    } as unknown as Column<any, any>;
    const table = makeMockTable([col]);
    render(<DataTableColumnToggle table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    expect(screen.getByText('actions')).toBeTruthy();
  });

  it('checkbox is checked when column is visible', () => {
    const col = makeMockColumn('name', 'Name', true);
    const table = makeMockTable([col]);
    render(<DataTableColumnToggle table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('checkbox is unchecked when column is not visible', () => {
    const col = makeMockColumn('name', 'Name', false);
    const table = makeMockTable([col]);
    render(<DataTableColumnToggle table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('closes dropdown when clicking outside', () => {
    const col = makeMockColumn('name', 'Name');
    const table = makeMockTable([col]);
    render(<DataTableColumnToggle table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    expect(screen.getByRole('checkbox')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('toggles dropdown open and closed', () => {
    const col = makeMockColumn('name', 'Name');
    const table = makeMockTable([col]);
    render(<DataTableColumnToggle table={table} />);
    const btn = screen.getByRole('button', { name: /columns/i });
    fireEvent.click(btn);
    expect(screen.getByRole('checkbox')).toBeTruthy();
    fireEvent.click(btn);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('does not render columns that cannot be hidden', () => {
    const col = {
      id: 'id',
      columnDef: { header: 'ID' },
      getCanHide: () => false,
      getIsVisible: () => true,
      getToggleVisibilityHandler: () => vi.fn(),
    } as unknown as Column<any, any>;
    const table = makeMockTable([col]);
    render(<DataTableColumnToggle table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
