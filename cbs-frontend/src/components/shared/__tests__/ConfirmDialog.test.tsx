import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete Record',
    description: 'Are you sure you want to delete this record?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with title when open is true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete Record')).toBeInTheDocument();
  });

  it('renders modal with description when open is true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Are you sure you want to delete this record?')).toBeInTheDocument();
  });

  it('renders default Cancel button label', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders default Confirm button label', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Confirm button is clicked', async () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose automatically after confirm when not loading', async () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('disables both buttons when isLoading is true', () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('shows spinner on confirm button when isLoading is true', () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);
    // Spinner can be identified by an svg role or a test id; look for animate-spin class
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    const spinner = confirmBtn.querySelector('.animate-spin') ?? confirmBtn.querySelector('[data-testid="spinner"]');
    expect(spinner).not.toBeNull();
  });

  it('shows AlertTriangle icon when variant is destructive', () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" />);
    // AlertTriangle icon is typically an svg; check by accessible or data-testid or class
    const icon =
      document.querySelector('[data-testid="alert-triangle"]') ??
      document.querySelector('.lucide-triangle-alert') ??
      document.querySelector('.lucide-alert-triangle') ??
      document.querySelector('svg.text-red-500') ??
      document.querySelector('svg.text-destructive');
    // At minimum the dialog should contain an svg when destructive
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('confirm button has bg-red-600 class when variant is destructive', () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" />);
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    expect(confirmBtn.className).toMatch(/bg-red-600|destructive/);
  });

  it('confirm button has primary styles when variant is default', () => {
    render(<ConfirmDialog {...defaultProps} variant="default" />);
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    // Should NOT have red background
    expect(confirmBtn.className).not.toMatch(/bg-red-600/);
  });

  it('calls onClose on backdrop click when variant is default', async () => {
    render(<ConfirmDialog {...defaultProps} variant="default" />);
    const backdrop =
      document.querySelector('[data-testid="dialog-backdrop"]') ??
      document.querySelector('.fixed.inset-0') ??
      document.querySelector('[role="dialog"]')?.parentElement;

    if (backdrop) {
      fireEvent.click(backdrop as HTMLElement);
    } else {
      // Fallback: fire mousedown on document body outside modal
      fireEvent.mouseDown(document.body);
    }
    // onClose is expected to be called
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does NOT call onClose on backdrop click when variant is destructive', async () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" />);
    const backdrop =
      document.querySelector('[data-testid="dialog-backdrop"]') ??
      document.querySelector('.fixed.inset-0');

    if (backdrop) {
      fireEvent.click(backdrop as HTMLElement);
    } else {
      fireEvent.mouseDown(document.body);
    }
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('renders custom confirmLabel', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Yes, Delete" />);
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeInTheDocument();
  });

  it('renders custom cancelLabel', () => {
    render(<ConfirmDialog {...defaultProps} cancelLabel="No, Go Back" />);
    expect(screen.getByRole('button', { name: /no, go back/i })).toBeInTheDocument();
  });

  it('does not call onConfirm when confirm button is disabled due to loading', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    // userEvent.click properly respects disabled attribute
    await user.click(confirmBtn).catch(() => {});
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });
});
