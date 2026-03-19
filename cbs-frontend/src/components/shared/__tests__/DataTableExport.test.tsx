import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTableExport } from '../DataTableExport';
import type { Table, Row, Column } from '@tanstack/react-table';

function makeMockTable(rows: Record<string, string>[], headers: { id: string; header: string }[]): Table<any> {
  const columns = headers.map(({ id, header }) => ({
    id,
    columnDef: { header },
  })) as unknown as Column<any, any>[];

  const mockRows = rows.map((row) => ({
    getValue: (colId: string) => row[colId] ?? '',
  })) as unknown as Row<any>[];

  return {
    getVisibleLeafColumns: () => columns,
    getFilteredRowModel: () => ({ rows: mockRows }),
  } as unknown as Table<any>;
}

describe('DataTableExport', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    clickSpy = vi.fn();

    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true, configurable: true });

    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: clickSpy, writable: true });
      }
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an Export button', () => {
    const table = makeMockTable([], []);
    render(<DataTableExport table={table} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy();
  });

  it('creates a CSV blob and triggers download on click', () => {
    const table = makeMockTable(
      [{ name: 'Amara', status: 'ACTIVE' }],
      [{ id: 'name', header: 'Name' }, { id: 'status', header: 'Status' }]
    );
    render(<DataTableExport table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('uses custom filename prop for download link', () => {
    let capturedDownload = '';
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: clickSpy, writable: true });
        const origSetDownload = Object.getOwnPropertyDescriptor(el, 'download');
        Object.defineProperty(el, 'download', {
          set(v) { capturedDownload = v; },
          get() { return capturedDownload; },
          configurable: true,
        });
      }
      return el;
    });
    const table = makeMockTable([], [{ id: 'col', header: 'Col' }]);
    render(<DataTableExport table={table} filename="my-report" />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(capturedDownload).toMatch(/my-report/);
  });

  it('uses default filename "export" when not specified', () => {
    let capturedDownload = '';
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: clickSpy, writable: true });
        Object.defineProperty(el, 'download', {
          set(v) { capturedDownload = v; },
          get() { return capturedDownload; },
          configurable: true,
        });
      }
      return el;
    });
    const table = makeMockTable([], [{ id: 'col', header: 'Col' }]);
    render(<DataTableExport table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(capturedDownload).toMatch(/export/);
  });

  it('handles null/undefined cell values gracefully', () => {
    const table = makeMockTable(
      [{ name: '', status: '' }],
      [{ id: 'name', header: 'Name' }, { id: 'status', header: 'Status' }]
    );
    render(<DataTableExport table={table} />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: /export/i }))).not.toThrow();
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('escapes double-quotes in cell values', () => {
    let blobContent = '';
    Object.defineProperty(global, 'Blob', {
      value: class MockBlob {
        constructor(parts: string[]) { blobContent = parts.join(''); }
      },
      writable: true,
      configurable: true,
    });

    const table = makeMockTable(
      [{ name: 'Amara "CEO" Okonkwo' }],
      [{ id: 'name', header: 'Name' }]
    );
    render(<DataTableExport table={table} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(blobContent).toContain('""CEO""');
  });
});
