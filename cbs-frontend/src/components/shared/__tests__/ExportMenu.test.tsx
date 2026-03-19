import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportMenu } from '../ExportMenu';

describe('ExportMenu', () => {
  it('renders nothing when no handlers are provided', () => {
    const { container } = render(<ExportMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Export button when at least one handler is provided', () => {
    render(<ExportMenu onExportCsv={vi.fn()} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy();
  });

  it('dropdown is closed by default', () => {
    render(<ExportMenu onExportCsv={vi.fn()} />);
    expect(screen.queryByText('Export as CSV')).toBeNull();
  });

  it('opens dropdown when Export button is clicked', () => {
    render(<ExportMenu onExportCsv={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText('Export as CSV')).toBeTruthy();
  });

  it('shows CSV option when onExportCsv is provided', () => {
    render(<ExportMenu onExportCsv={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText('Export as CSV')).toBeTruthy();
  });

  it('shows Excel option when onExportExcel is provided', () => {
    render(<ExportMenu onExportExcel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText('Export as Excel')).toBeTruthy();
  });

  it('shows PDF option when onExportPdf is provided', () => {
    render(<ExportMenu onExportPdf={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText('Export as PDF')).toBeTruthy();
  });

  it('shows Print option when onPrint is provided', () => {
    render(<ExportMenu onPrint={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText('Print')).toBeTruthy();
  });

  it('shows all options when all handlers are provided', () => {
    render(
      <ExportMenu
        onExportCsv={vi.fn()}
        onExportExcel={vi.fn()}
        onExportPdf={vi.fn()}
        onPrint={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText('Export as CSV')).toBeTruthy();
    expect(screen.getByText('Export as Excel')).toBeTruthy();
    expect(screen.getByText('Export as PDF')).toBeTruthy();
    expect(screen.getByText('Print')).toBeTruthy();
  });

  it('calls onExportCsv when CSV option is clicked', () => {
    const onExportCsv = vi.fn();
    render(<ExportMenu onExportCsv={onExportCsv} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByText('Export as CSV'));
    expect(onExportCsv).toHaveBeenCalledTimes(1);
  });

  it('calls onExportExcel when Excel option is clicked', () => {
    const onExportExcel = vi.fn();
    render(<ExportMenu onExportExcel={onExportExcel} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByText('Export as Excel'));
    expect(onExportExcel).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown after an option is clicked', () => {
    const onExportCsv = vi.fn();
    render(<ExportMenu onExportCsv={onExportCsv} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByText('Export as CSV'));
    expect(screen.queryByText('Export as CSV')).toBeNull();
  });

  it('closes dropdown when clicking outside', () => {
    render(<ExportMenu onExportCsv={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText('Export as CSV')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Export as CSV')).toBeNull();
  });

  it('toggles dropdown closed on second click', () => {
    render(<ExportMenu onExportCsv={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(btn);
    expect(screen.getByText('Export as CSV')).toBeTruthy();
    fireEvent.click(btn);
    expect(screen.queryByText('Export as CSV')).toBeNull();
  });
});
